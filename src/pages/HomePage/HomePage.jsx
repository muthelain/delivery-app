
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; 

import { SidebarWidget } from '@/components/Sidebar/SidebarWidget'; 

const COURIER_POS = [50.44970451841992, 30.5250656200624];

// Умный компонент центрирования карты
const ChangeMapCenter = ({ center }) => {
  const map = useMap();
  const prevCenterRef = useRef(null);

  useEffect(() => {
    // Карта перемещается ТОЛЬКО если координаты центра реально изменились по клику
    if (center && JSON.stringify(prevCenterRef.current) !== JSON.stringify(center)) {
      map.setView(center, 15, { animate: true, duration: 0.5 });
      prevCenterRef.current = center;
    }
  }, [center, map]);

  return null;
};

export const MainPage = () => {
  const [routePath, setRoutePath] = useState([]); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [orders, setOrders] = useState([]); 
  const [selectedOrder, setSelectedOrder] = useState(null); 
  const [activeOrder, setActiveOrder] = useState(null); 
  const [deliveryStats, setDeliveryStats] = useState(null);
  const [isWorking, setIsWorking] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/orders');
      const data = await response.json();
      setOrders(data);
      
      // Защита: если выбранный в списке заказ бэкенд удалил по лимиту (прошло много времени)
      setSelectedOrder(prev => {
        if (!prev) return null;
        return data.some(o => o.id === prev.id) ? prev : null;
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

  const handleToggleShift = () => {
    // Если смена открыта и есть заказ - не даем закрыть
    if (isWorking && activeOrder) {
      alert("Спочатку завершіть активне замовлення!");
      return;
    }
    // Меняем статус на противоположный
    setIsWorking(!isWorking);
  };

  // Клик по кнопке «Принять заказ»
  const handleAcceptOrder = async (order) => {
    if (!order) return;

    const courierStr = `${COURIER_POS[1]},${COURIER_POS[0]}`;
    const orderStr = `${order.coordinates[1]},${order.coordinates[0]}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${courierStr};${orderStr}?geometries=geojson`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]; // Берем весь объект маршрута
        
        const coordinates = route.geometry.coordinates;
        const formattedPath = coordinates.map(coord => [coord[1], coord[0]]);
        
        // ВЫСЧИТЫВАЕМ КИЛОМЕТРЫ И МИНУТЫ
        // OSRM отдает метры. Делим на 1000 и оставляем 1 знак после запятой (например: 2.5)
        const distanceKm = (route.distance / 1000).toFixed(1); 
        // OSRM отдает секунды. Делим на 60 и округляем до целых минут (например: 12)
        const durationMin = Math.round(route.duration / 60);

        setRoutePath(formattedPath);     
        setActiveOrder(order);           
        setDeliveryStats({ distance: distanceKm, duration: durationMin }); // Сохраняем статистику
        setIsSidebarOpen(false);         
        
        await fetch(`http://localhost:3000/api/orders/${order.id}`, { method: 'DELETE' });
        fetchOrders(); 
      }
    } catch (error) {
      console.error("Ошибка построения маршрута:", error);
    }
  };

  // Клик по кнопке «Завершить заказ»
  const handleCompleteOrder = () => {
    setActiveOrder(null);       // Сбрасываем текущую доставку
    setSelectedOrder(null);     // Сбрасываем маркеры
    setRoutePath([]);           // Удаляем синюю линию маршрута с карты
    setIsSidebarOpen(true);     // Сайдбар красиво возвращается
    setDeliveryStats(null);     //  Очищаем километры
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      
      {/* Сайдбар */}
      <SidebarWidget 
        isOpen={isSidebarOpen} 
        orders={orders} 
        selectedOrder={selectedOrder}
        onSelectOrder={handleSelectOrder}
        onAcceptOrder={handleAcceptOrder}
        isWorking={isWorking} 
        onToggleShift={handleToggleShift}
      />

      {/* Интерфейс верхних плавающих кнопок */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1500, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* Кнопка открытия сайдбара (показывается только если мы НЕ в режиме доставки) */}
        {!isSidebarOpen && !activeOrder && (
          <button onClick={() => setIsSidebarOpen(true)} style={{ padding: '12px 20px', background: '#ff6600', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
            ☰ Список замовлень ({orders.length})
          </button>
        )}

        {/* ИСПРАВЛЕНО: Кнопка режима доставки («Завершить заказ») */}
        {activeOrder && (
          <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '10px', width: '280px' }}>
            <span style={{ fontSize: '12px', color: '#888', fontWeight: 'bold' }}>🚚 ВЫПОЛНЯЕТСЯ ДОСТАВКА:</span>
            <strong style={{ fontSize: '14px' }}>{activeOrder.address}</strong>
            {/* НОВЫЙ БЛОК: Показываем километры и время */}
            {deliveryStats && (
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }}>
                <span>📏 {deliveryStats.distance} км</span>
                <span>⏱️ ~{deliveryStats.duration} хв</span>
              </div>
            )}
            <button onClick={handleCompleteOrder} style={{ padding: '12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background 0.2s' }}>
              🏁 Завершити замовлення
            </button>
          </div>
        )}
      </div>

      <MapContainer center={COURIER_POS} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {/* Камера двигается только при клике на карточку */}
        {selectedOrder && <ChangeMapCenter center={selectedOrder.coordinates} />}

        {/* Маркер курьера */}
        <Marker position={COURIER_POS}><Popup>Кур'єр</Popup></Marker>

        {/* Отображаем маркеры. В режиме доставки показываем ТОЛЬКО маркер текущего заказа */}
        {activeOrder ? (
          <Marker position={activeOrder.coordinates}>
            <Popup><strong>{activeOrder.address}</strong></Popup>
          </Marker>
        ) : (
          orders.map(order => (
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
        {routePath.length > 0 && <Polyline positions={routePath} color="#2980b9" weight={6} />}
      </MapContainer>
    </div>
  );
};