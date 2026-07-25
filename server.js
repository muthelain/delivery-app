import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

const app = express();
app.use(cors());

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

let housesCollection; 
let activeOrders = []; 

async function connectDB() {
  await client.connect();
  const db = client.db('Ukaraine');
  
  housesCollection = db.collection('building'); 
  
  console.log('🔌 Подключено к MongoDB (Чистая база)');
  
  // Генерируем 7 стартовых заказов
  for (let i = 0; i < 7; i++) {
    await generateNewOrder();
  }

  // Каждые 15 секунд подкидываем новый заказ
  setInterval(generateNewOrder, 15000);
}
connectDB();

async function generateNewOrder() {
  try {
    const randomNewArray = await housesCollection.aggregate([
      // Фильтруем по городу и проверяем, что координата x существует
      { $match: { city: { $in: ["Kyiv", "Київ", "Киев", "Бровари"] }, x: { $exists: true, $ne: null } } },
      { $sample: { size: 1 } }
    ]).toArray();

    if (randomNewArray.length > 0) {
      const rawHouse = randomNewArray[0];
      
      // Новая база чистая, берем координаты напрямую
      const lng = parseFloat(rawHouse.x); // x - это долгота
      const lat = parseFloat(rawHouse.y); // y - это широта
      
      const houseNumber = rawHouse.house_number || "";
      const streetName = rawHouse.street || "Невідома вулиця";

      const newOrder = {
        id: new Date().getTime() + Math.random(), 
        address: `${streetName}, ${houseNumber}, Київ`,
        coordinates: [lat, lng], 
        price: Math.floor(Math.random() * 800) + 200 + ' ₴',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      activeOrders.push(newOrder);

      // Лимит в 20 заказов
      if (activeOrders.length > 19) {
        const removed = activeOrders.shift(); 
        console.log(`🗑️ Заказ убран по лимиту (max 20): ${removed.address}`);
      }
      
      console.log(`✨ Добавлен заказ: ${newOrder.address}. Всего в пуле: ${activeOrders.length}/20`);
    } else {
      // ЕСЛИ БАЗА НЕ РАБОТАЕТ, ВЫ УВИДИТЕ ЭТО СООБЩЕНИЕ В КОНСОЛИ
      console.log('⚠️ Ошибка: Сервер не нашел ни одного адреса в Киеве/Броварах. Проверьте имя коллекции!');
    }

  } catch (e) {
    console.error("❌ Ошибка автогенерации заказа:", e);
  }
}

app.get('/api/orders', (req, res) => {
  res.json(activeOrders);
});

app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  activeOrders = activeOrders.filter(order => order.id !== parseFloat(id));
  console.log(`🛑 Замовлення ${id} видалено кур'єром.`);
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('🚀 Сервер запущен на http://localhost:3000');
});