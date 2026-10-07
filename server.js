import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

const SECRET_KEY = process.env.SECRET_KEY;

const app = express();
app.use(cors());
app.use(express.json());

// === 1. НАСТРОЙКА MULTER И СТАТИКИ ===
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
// Делаем папку публичной
app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });
// ====================================

const url = "mongodb://localhost:27017";
const client = new MongoClient(url);

let housesCollection;
let historyCollection;
let activeOrders = [];
let couriersCollection;
let shiftsCollection;

const COURIER_BASE = [50.44970451841992, 30.5250656200624];

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

async function connectDB() {
  await client.connect();
  const db = client.db("Ukaraine");
  housesCollection = db.collection("building");
  historyCollection = db.collection("orders_history");
  couriersCollection = db.collection("couriers");
  shiftsCollection = db.collection("shifts");

  console.log("🔌 Подключено к MongoDB (Чистая база)");

  for (let i = 0; i < 7; i++) {
    await generateNewOrder();
  }
  setInterval(generateNewOrder, 15000);
}
connectDB();

async function generateNewOrder() {
  try {
    const randomNewArray = await housesCollection.aggregate([
      { $match: { city: {$in: ["Kyiv", "Київ", "Киев", "Бровари"] }, x: { $exists: true,$ne: null } } },
      { $sample: { size: 1 } },
    ]).toArray();

    if (randomNewArray.length > 0) {
      const rawHouse = randomNewArray[0];
      const lng = parseFloat(rawHouse.x);
      const lat = parseFloat(rawHouse.y);
      const houseNumber = rawHouse.house_number || "";
      const streetName = rawHouse.street || "Невідома вулиця";

      const straightDistance = getDistance(COURIER_BASE[0], COURIER_BASE[1], lat, lng);
      const routeDistance = straightDistance * 1.3;
      const approximateMinutes = routeDistance * 3;
      const calculatedPrice = Math.round(45 + (routeDistance * 12) + (approximateMinutes * 2.5));

      const newOrder = {
        id: new Date().getTime() + Math.random(),
        address: `${streetName}, ${houseNumber}, Київ`,
        coordinates: [lat, lng],
        price: `${calculatedPrice} ₴`, 
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      activeOrders.push(newOrder);

      if (activeOrders.length > 19) {
        const removed = activeOrders.shift();
        console.log(`🗑️ Заказ убран по лимиту: ${removed.address}`);
      }

      console.log(`✨ Добавлен заказ: ${newOrder.address}. Ціна: ${newOrder.price}`);
    }
  } catch (e) {
    console.error("❌ Ошибка автогенерации заказа:", e);
  }
}

app.get("/api/orders", (req, res) => {
  res.json(activeOrders);
});

app.post('/api/orders/close', authenticateToken, async (req, res) => {
  const { orderId, status } = req.body;
  
  try {
    const courier = await couriersCollection.findOne({ _id: new ObjectId(req.user.id) });
    if (!courier.isVerified) {
      return res.status(403).json({ error: "Акаунт не верифіковано. Ви не можете закривати замовлення." });
    }

    const targetId = parseFloat(orderId);
    const orderIndex = activeOrders.findIndex(order => order.id === targetId);

    if (orderIndex === -1) return res.status(404).json({ error: 'Заказ не найден' });

    const [closedOrder] = activeOrders.splice(orderIndex, 1);

    await historyCollection.insertOne({
      orderId: closedOrder.id,
      address: closedOrder.address,
      price: closedOrder.price,
      status: status,
      courierId: req.user.id, 
      closedAt: new Date(),
    });

    await couriersCollection.updateOne(
      { _id: new ObjectId(req.user.id) },
      { $inc: { "stats.totalOrders": 1 } }
    );

    console.log(`✅ Замовлення ${orderId} збережено. Статистику оновлено.`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Помилка БД' });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingCourier = await couriersCollection.findOne({ email });
    if (existingCourier) {
      return res.status(400).json({ error: "Email вже зареєстровано" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newCourier = {
      name,
      email,
      passwordHash: hashedPassword,
      isVerified: false, 
      avatar: null, // <--- ДОБАВЛЕНО
      stats: { totalOrders: 0, totalHours: 0 }
    };

    await couriersCollection.insertOne(newCourier);
    res.json({ success: true, message: "Акаунт створено. Очікуйте верифікації." });
  } catch (err) {
    res.status(500).json({ error: "Помилка сервера" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const courier = await couriersCollection.findOne({ email });
    if (!courier) return res.status(404).json({ error: "Користувача не знайдено" });

    const isValid = await bcrypt.compare(password, courier.passwordHash);
    if (!isValid) return res.status(401).json({ error: "Невірний пароль" });

    const token = jwt.sign({ id: courier._id }, SECRET_KEY, { expiresIn: "7d" });
    
    res.json({ 
      token, 
      user: { 
        id: courier._id, 
        name: courier.name, 
        isVerified: courier.isVerified,
        avatar: courier.avatar || null, // <--- ДОБАВЛЕНО
        stats: courier.stats
      } 
    });
  } catch (err) {
    res.status(500).json({ error: "Помилка сервера" });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Доступ заборонено. Немає токена." });

  jwt.verify(token, process.env.SECRET_KEY, (err, decodedUser) => {
    if (err) return res.status(403).json({ error: "Токен недійсний або прострочений." });
    
    req.user = decodedUser; 
    next(); 
  });
}

app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const courier = await couriersCollection.findOne({ _id: new ObjectId(req.user.id) });
    if (!courier) return res.status(404).json({ error: "Користувача не знайдено" });

    // 1. АВТО-ЗАКРИТТЯ НЕАКТИВНИХ ЗМІН (БІЛЬШЕ 30 ХВИЛИН)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const expiredShifts = await shiftsCollection.find({
      courierId: req.user.id,
      endTime: null,
      lastPing: { $lt: thirtyMinsAgo } // Якщо останній сигнал був понад 30 хв тому
    }).toArray();

    // Закриваємо їх часом останнього пінга (вираховуємо простий)
    for (let shift of expiredShifts) {
      await shiftsCollection.updateOne(
        { _id: shift._id },
        { $set: { endTime: shift.lastPing } }
      );
    }

    // 2. ПЕРЕВІРКА, ЧИ ВІДКРИТА ЗМІНА ЗАРАЗ
    const currentOpenShift = await shiftsCollection.findOne({ courierId: req.user.id, endTime: null });
    const isWorking = !!currentOpenShift;

    // 3. ПІДРАХУНОК СТАТИСТИКИ (Залишається як було)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const totalOrders = await historyCollection.countDocuments({ courierId: req.user.id });
    const todayOrders = await historyCollection.countDocuments({
      courierId: req.user.id,
      closedAt: { $gte: startOfDay }
    });

    const allShifts = await shiftsCollection.find({ courierId: req.user.id }).toArray();
    let totalMs = 0; let todayMs = 0;

    allShifts.forEach(shift => {
      const start = new Date(shift.startTime).getTime();
      const end = shift.endTime ? new Date(shift.endTime).getTime() : Date.now(); 
      const duration = end - start;
      totalMs += duration;
      if (new Date(shift.startTime) >= startOfDay) todayMs += duration;
    });

    const formatTime = (ms) => {
      if (ms <= 0) return "0 сек";
      const totalSeconds = Math.floor(ms / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      if (h > 0) return `${h} год ${m} хв`;
      if (m > 0) return `${m} хв ${s} сек`;
      return `${s} сек`;
    };

    res.json({
      id: courier._id,
      name: courier.name,
      email: courier.email,
      isVerified: courier.isVerified,
      avatar: courier.avatar || null,
      isWorking: isWorking, // <-- ПЕРЕДАЄМО СТАТУС НА ФРОНТЕНД
      stats: {
        todayOrders, todayTime: formatTime(todayMs),
        totalOrders, totalTime: formatTime(totalMs)
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Помилка сервера при завантаженні профілю" });
  }
});

app.post("/api/profile/avatar", authenticateToken, upload.single("avatar"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Файл не отримано" });
  }

  const avatarUrl = `http://localhost:3000/uploads/${req.file.filename}`;

  try {
    await couriersCollection.updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: { avatar: avatarUrl } }
    );

    res.json({ success: true, avatarUrl });
  } catch (err) {
    res.status(500).json({ error: "Помилка бази даних" });
  }
});

app.post("/api/shift/ping", authenticateToken, async (req, res) => {
  try {
    // Оновлюємо час останньої активності для відкритої зміни
    await shiftsCollection.updateOne(
      { courierId: req.user.id, endTime: null },
      { $set: { lastPing: new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Ping failed" });
  }
});

// === ОНОВЛЕНИЙ ТОГГЛ ЗМІНИ ===
app.post("/api/shift/toggle", authenticateToken, async (req, res) => {
  const { isStarting } = req.body;
  const courierId = req.user.id;

  try {
    if (isStarting) {
      await shiftsCollection.insertOne({
        courierId: courierId,
        startTime: new Date(),
        endTime: null,
        lastPing: new Date() // <-- Додаємо стартовий пінг
      });
    } else {
      const openShift = await shiftsCollection.findOne({ courierId: courierId, endTime: null });
      if (openShift) {
        await shiftsCollection.updateOne(
          { _id: openShift._id },
          { $set: { endTime: new Date() } }
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// === 2. ЗАПУСК СЕРВЕРА (Перемещено в конец) ===
app.listen(3000, () => {
  console.log("🚀 Сервер запущен на http://localhost:3000");
});