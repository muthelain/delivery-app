import { useState, useEffect, useRef } from "react";
import styles from "./HomePage.module.scss";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Settings } from "@/components/ui/icons/SettingsIcon";
import { ChatHelpper } from "@/components/ui/icons/ChatIcon";
import { SupportChat } from "@/components/ui/SupportChat/SupportChat";
import { SettingsMenu } from "@/components/ui/SettingsMenu/SettingsMenu";
import { SidebarWidget } from "@/components/Sidebar/SidebarWidget";

import {
  calculateDeliveryPrice,
  formatPrice,
} from "@/services/priceCalculator";

const COURIER_POS = [50.44970451841992, 30.5250656200624];

// Умный компонент центрирования карты
const ChangeMapCenter = ({ center }) => {
  const map = useMap();
  const prevCenterRef = useRef(null);

  useEffect(() => {
    // Карта перемещается ТОЛЬКО если координаты центра реально изменились по клику
    if (
      center &&
      JSON.stringify(prevCenterRef.current) !== JSON.stringify(center)
    ) {
      map.setView(center, 15, { animate: true, duration: 0.5 });
      prevCenterRef.current = center;
    }
  }, [center, map]);

  return null;
};

export const MainPage = ({ currentUser, onLogout }) => {
  const [routePath, setRoutePath] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [deliveryStats, setDeliveryStats] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("courierToken");
      const response = await fetch("http://localhost:3000/api/orders", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      // СНАЧАЛА проверяем статус
      if (response.status === 401 || response.status === 403) {
        console.warn("Сесія закінчилася. Виконуємо авто-вихід.");
        onLogout(); 
        return;
      }
      
      // ТОЛЬКО ПОТОМ парсим данные
      const data = await response.json();
      setOrders(data);

      setSelectedOrder((prev) => {
        if (!prev) return null;
        return data.some((o) => o.id === prev.id) ? prev : null;
      });
    } catch (error) {
      console.error("Ошибка загрузки списка заказов:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000); // Опрашиваем раз в 4 секунды
    return () => clearInterval(interval);
  }, []);

  // Клик по карточке — просто подсвечиваем и плавно двигаем карту
  const handleSelectOrder = (order) => {
    if (activeOrder) return; // Блокируем выбор других заказов во время поездки
    setSelectedOrder(order);
  };

const handleToggleShift = async () => {
    if (!currentUser?.isVerified) {
      showToast("⚠️ Ваш акаунт ще перевіряється адміністратором. Ви не можете відкрити зміну.");
      return;
    }

    if (isWorking && activeOrder) {
      alert("Спочатку завершіть активне замовлення!");
      return;
    }

    const newWorkingState = !isWorking;
    
    try {
      const token = localStorage.getItem("courierToken");
      const response = await fetch("http://localhost:3000/api/shift/toggle", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ isStarting: newWorkingState })
      });

      if (response.ok) {
        setIsWorking(newWorkingState);
      } else {
        showToast("❌ Помилка синхронізації зміни з сервером.");
      }
    } catch (error) {
      console.error("Помилка мережі:", error);
      showToast("❌ Відсутній зв'язок з сервером.");
    }
  };

  // Клик по кнопке «Принять заказ»
  const handleAcceptOrder = async (order) => {
    if (!order) return;
    if (!currentUser?.isVerified) {
      showToast("⚠️ Акаунт не верифіковано. Прийняття замовлень заблоковано.");
      return;
    }
    const courierStr = `${COURIER_POS[1]},${COURIER_POS[0]}`;
    const orderStr = `${order.coordinates[1]},${order.coordinates[0]}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${courierStr};${orderStr}?geometries=geojson`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];

        const coordinates = route.geometry.coordinates;
        const formattedPath = coordinates.map((coord) => [coord[1], coord[0]]);

        const distanceKm = Number((route.distance / 1000).toFixed(1));
        const durationMin = Math.round(route.duration / 60);

        // --- НОВАЯ ЛОГИКА ЦЕНЫ ---
        // Считаем реальную стоимость по нашему сервису
        const calculatedPrice = calculateDeliveryPrice(distanceKm, durationMin);
        const formattedPrice = formatPrice(calculatedPrice);

        // Обновляем заказ, заменяя случайную цену с сервера на реальную
        const updatedOrder = {
          ...order,
          price: formattedPrice,
          rawPrice: calculatedPrice, // Сохраняем просто число, если понадобится для статистики
        };
        // -------------------------

        setRoutePath(formattedPath);
        setActiveOrder(updatedOrder); // Передаем обновленный заказ
        setDeliveryStats({ distance: distanceKm, duration: durationMin });
        setIsSidebarOpen(false);
        fetchOrders();
      }
    } catch (error) {
      console.error("Ошибка построения маршрута:", error);
    }
  };

  // НОВЫЙ КОД: Завершення замовлення із відправкою на бекенд
  const handleCompleteOrder = async () => {
    if (!activeOrder) return;

    try {
      const token = localStorage.getItem("courierToken"); // Достаем токен
      
      const response = await fetch("http://localhost:3000/api/orders/close", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // Передаем токен
        },
        body: JSON.stringify({
          orderId: activeOrder.id,
          status: "delivered",
          // courierId убрали, бекенд возьмет его из токена
        }),
      });

      if (response.ok) {
        console.log("✅ Замовлення успішно закрите та збережене в історію!");
        setActiveOrder(null);
        setSelectedOrder(null);
        setRoutePath([]);
        setIsSidebarOpen(true);
        setDeliveryStats(null);
        fetchOrders();
      } else {
        console.error("❌ Помилка при закритті замовлення на сервері");
      }
    } catch (error) {
      console.error("❌ Помилка мережі при закритті замовлення:", error);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {toastMessage && (
        <div className={styles.toastNotification}>
          {toastMessage}
        </div>
      )}
      {/* Сайдбар */}
      <SidebarWidget
        isOpen={isSidebarOpen}
        orders={orders}
        selectedOrder={selectedOrder}
        onSelectOrder={handleSelectOrder}
        onAcceptOrder={handleAcceptOrder}
        isWorking={isWorking}
        onToggleShift={handleToggleShift}
        currentUser={currentUser}
      />

      {/* Интерфейс верхних плавающих кнопок */}
      <div className={styles.floatingUi}>
        {/* Кнопка открытия сайдбара */}
        {!isSidebarOpen && !activeOrder && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={styles.sidebarToggleBtn}
          >
            ☰ Список замовлень ({orders.length})
          </button>
        )}

        {/* Кнопка режима доставки («Завершить заказ») */}
        {activeOrder && (
          <div className={styles.activeOrderPanel}>
            <span className={styles.activeOrderLabel}>
              🚚 ВЫПОЛНЯЕТСЯ ДОСТАВКА:
            </span>
            <strong className={styles.activeOrderAddress}>
              {activeOrder.address}
            </strong>

            {deliveryStats && (
              <div className={styles.deliveryStats}>
                <span>📏 {deliveryStats.distance} км</span>
                <span>⏱️ ~{deliveryStats.duration} хв</span>
              </div>
            )}

            <button
              onClick={handleCompleteOrder}
              className={styles.completeOrderBtn}
            >
              🏁 Завершити замовлення
            </button>
          </div>
        )}
      </div>

      <SupportChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <SettingsMenu 
  isOpen={isSettingsOpen} 
  onClose={() => setIsSettingsOpen(false)} 
  onLogout={onLogout}
  currentUser={currentUser} // <-- Передаем функцию выхода
/>

      <div className={styles.settings}>
        <div onClick={() => setIsChatOpen(!isChatOpen)}>
          <ChatHelpper />
        </div>
        <div onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
          <Settings />
        </div>
      </div>

      <MapContainer
        center={COURIER_POS}
        zoom={13}
        className={styles.mapContainer}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Камера двигается только при клике на карточку */}
        {selectedOrder && (
          <ChangeMapCenter center={selectedOrder.coordinates} />
        )}

        {/* Маркер курьера */}
        <Marker position={COURIER_POS}>
          <Popup>Кур'єр</Popup>
        </Marker>

        {/* Отображаем маркеры. В режиме доставки показываем ТОЛЬКО маркер текущего заказа */}
        {activeOrder ? (
          <Marker position={activeOrder.coordinates}>
            <Popup>
              <strong>{activeOrder.address}</strong>
            </Popup>
          </Marker>
        ) : (
          orders.map((order) => (
            <Marker
              key={order.id}
              position={order.coordinates}
              eventHandlers={{ click: () => handleSelectOrder(order) }}
            >
              <Popup>
                <strong>{order.address}</strong> <br />
                Цена: {order.price}
              </Popup>
            </Marker>
          ))
        )}

        {/* Линия пути */}
        {routePath.length > 0 && (
          <Polyline positions={routePath} color="#2980b9" weight={6} />
        )}
      </MapContainer>
    </div>
  );
};
