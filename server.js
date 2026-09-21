import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const SECRET_KEY = process.env.SECRET_KEY;

const app = express();
app.use(cors());
app.use(express.json());

const url = "mongodb://localhost:27017";
const client = new MongoClient(url);

let housesCollection;
let historyCollection;
let activeOrders = [];
let couriersCollection;
let shiftsCollection;

// Координати старту (як на фронтенді)
const COURIER_BASE = [50.44970451841992, 30.5250656200624];

// Функція для вирахування відстані між двома координатами (в кілометрах)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Радіус Землі в км
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Повертає відстань по прямій
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
      { $match: { city: { $in: ["Kyiv", "Київ", "Киев", "Бровари"] }, x: { $exists: true, $ne: null } } },
      { $sample: { size: 1 } },
    ]).toArray();

    if (randomNewArray.length > 0) {
      const rawHouse = randomNewArray[0];
      const lng = parseFloat(rawHouse.x);
      const lat = parseFloat(rawHouse.y);
      const houseNumber = rawHouse.house_number || "";
      const streetName = rawHouse.street || "Невідома вулиця";

      // 1. Рахуємо відстань по прямій від бази до клієнта
      const straightDistance = getDistance(COURIER_BASE[0], COURIER_BASE[1], lat, lng);
      
      // 2. Додаємо 30% на вигини доріг (бо машини не літають по прямій)
      const routeDistance = straightDistance * 1.3;
      
      // 3. Приблизний час (десь 3 хвилини на 1 км по місту)
      const approximateMinutes = routeDistance * 3;

      // 4. Твоя формула ціни! (База 45 + 12 грн/км + 2.5 грн/хв)
      const calculatedPrice = Math.round(45 + (routeDistance * 12) + (approximateMinutes * 2.5));

      const newOrder = {
        id: new Date().getTime() + Math.random(),
        address: `${streetName}, ${houseNumber}, Київ`,
        coordinates: [lat, lng],
        price: `${calculatedPrice} ₴`, // ТЕПЕР ЦІНА ЛОГІЧНА!
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

// Додаємо authenticateToken як другий аргумент
app.post('/api/orders/close', authenticateToken, async (req, res) => {
  const { orderId, status } = req.body;
  
  try {
    // 1. Обов'язкова перевірка: чи верифікований кур'єр?
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
      courierId: req.user.id, // Тепер беремо ID не з тіла запиту, а безпечно з токена!
      closedAt: new Date(),
    });

    // Оновлюємо статистику кур'єра (додаємо +1 замовлення)
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

app.listen(3000, () => {
  console.log("🚀 Сервер запущен на http://localhost:3000");
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
      isVerified: false, // ПО УМОЛЧАНИЮ НЕ ВЕРИФИЦИРОВАН
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

    // Создаем токен, в который «вшиваем» ID курьера
    const token = jwt.sign({ id: courier._id }, SECRET_KEY, { expiresIn: "7d" });
    
    // Возвращаем токен и базовые данные (без пароля)
    res.json({ 
      token, 
      user: { 
        id: courier._id, 
        name: courier.name, 
        isVerified: courier.isVerified,
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

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Рахуємо замовлення
    const totalOrders = await historyCollection.countDocuments({ courierId: req.user.id });
    const todayOrders = await historyCollection.countDocuments({
      courierId: req.user.id,
      closedAt: { $gte: startOfDay }
    });

    // === ЧЕСТНЫЙ ПОДСЧЕТ ВРЕМЕНИ ПО СМЕНАМ ===
    const allShifts = await shiftsCollection.find({ courierId: req.user.id }).toArray();
    
    let totalMs = 0;
    let todayMs = 0;

    allShifts.forEach(shift => {
      const start = new Date(shift.startTime).getTime();
      const end = shift.endTime ? new Date(shift.endTime).getTime() : Date.now(); 
      const duration = end - start;

      totalMs += duration;
      if (new Date(shift.startTime) >= startOfDay) {
        todayMs += duration;
      }
    });

    // Новая функция, которая выводит часы, минуты и секунды
    const formatTime = (ms) => {
      if (ms === 0) return "0 сек";
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
      stats: {
        todayOrders: todayOrders,
        todayTime: formatTime(todayMs), // Передаем миллисекунды напрямую
        totalOrders: totalOrders,
        totalTime: formatTime(totalMs)
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Помилка сервера при завантаженні профілю" });
  }
});

app.post("/api/shift/toggle", authenticateToken, async (req, res) => {
  const { isStarting } = req.body;
  const courierId = req.user.id;

  try {
    if (isStarting) {
      // Открываем новую смену
      await shiftsCollection.insertOne({
        courierId: courierId,
        startTime: new Date(),
        endTime: null // Смена еще идет
      });
    } else {
      // Закрываем активную смену
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