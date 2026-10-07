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

export const MainPage = ({ currentUser, onLogout, setUser }) => {
  const [routePath, setRoutePath] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [deliveryStats, setDeliveryStats] = useState(null);
  const [isWorking, setIsWorking] = useState(currentUser?.isWorking || false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem("theme") !== "light" 
  );


  const chatRef = useRef(null);
  const settingsRef = useRef(null);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) setIsSettingsOpen(false); // Закрываем настройки, если открываем чат
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
    if (!isSettingsOpen) setIsChatOpen(false); // Закрываем чат, если открываем настройки
  };




  useEffect(() => {
    if (isDarkMode) {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem("theme", "dark");
    } else {
      document.body.removeAttribute('data-theme');
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);


  const lastActivityRef = useRef(Date.now());
  const lastOrderTimeRef = useRef(Date.now());
  useEffect(() => {
    if (currentUser?.isWorking !== undefined) {
      setIsWorking(currentUser.isWorking);
    }
  }, [currentUser?.isWorking]);
  useEffect(() => {
    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    }
  }, []);
  
  useEffect(() => {
    let interval;
    if (isWorking) {
      interval = setInterval(() => {
        const hasActiveOrder = !!activeOrder;
        // Користувач вважається активним за комп'ютером (мишка/кліки) останні 5 хв
        const isRecentlyActive = (Date.now() - lastActivityRef.current) < 5 * 60 * 1000; 

        // 1. ВІДПРАВКА ПУЛЬСУ
        if (hasActiveOrder || isRecentlyActive) {
          const token = localStorage.getItem("courierToken");
          fetch("http://localhost:3000/api/shift/ping", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
          }).catch(() => console.log("Помилка відправки ping"));
        }

        // 2. ПЕРЕВІРКА "НА ЛЕДАРЯ" (Рухає мишкою, але не працює)
        if (!hasActiveOrder) {
          // Рахуємо, скільки часу пройшло від останнього замовлення/старту зміни
          const timeWithoutOrders = Date.now() - lastOrderTimeRef.current;
          
          // Якщо пройшло 10 хвилин (10 * 60 * 1000) без замовлень
          if (timeWithoutOrders > 10 * 60 * 1000) {
            // Викликаємо твою функцію показу плашки
            showToast("⚠️ Ви давно не приймали замовлення! Почніть працювати або завершіть зміну.");
            
            // Відмотуємо таймер трохи назад, щоб плашка з'являлася кожні 3 хвилини, 
            // поки він не візьме замовлення або не вимкне зміну
            lastOrderTimeRef.current = Date.now() - (7 * 60 * 1000); 
          }
        }

      }, 60000); // Перевірка кожну хвилину
    }
    return () => clearInterval(interval);
  }, [isWorking, activeOrder]);



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
    if (!isWorking) {
      lastOrderTimeRef.current = Date.now();
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
        // Також оновлюємо глобальний стейт, щоб інші компоненти знали
        if (setUser) setUser(prev => ({ ...prev, isWorking: newWorkingState }));
      }
    } catch (error) {
      console.error("Помилка мережі:", error);
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
    lastOrderTimeRef.current = Date.now();
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
    lastOrderTimeRef.current = Date.now();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Игнорируем клик, если он был по самим иконкам (чтобы toggle-функции сработали корректно)
      if (event.target.closest(`.${styles.settings}`)) return;

      let clickedInsideWidget = false;

      // Проверяем, был ли клик внутри чата
      if (chatRef.current && chatRef.current.contains(event.target)) {
        clickedInsideWidget = true;
      }
      // Проверяем, был ли клик внутри настроек
      if (settingsRef.current && settingsRef.current.contains(event.target)) {
        clickedInsideWidget = true;
      }

      // Если клик был не внутри виджета — закрываем оба
      if (!clickedInsideWidget) {
        setIsChatOpen(false);
        setIsSettingsOpen(false);
      }
    };

    // Вешаем слушатель на нажатие мыши
    document.addEventListener("mousedown", handleClickOutside);
    
    // Очищаем слушатель при размонтировании компонента
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
    

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

      <div ref={chatRef}>
        <SupportChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
<div ref={settingsRef}>
        <SettingsMenu 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          onLogout={onLogout}
          currentUser={currentUser} 
          setUser={setUser}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      </div>
<div className={styles.settings}>
        <div onClick={toggleChat}>
          <ChatHelpper />
        </div>
        <div onClick={toggleSettings}>
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
          <Polyline positions={routePath} color="#ff6600" weight={6} />
        )}
      </MapContainer>
    </div>
  );
};
