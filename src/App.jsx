import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainPage } from "@/pages/HomePage/HomePage"; // Укажи свой правильный путь
import { AuthPage } from "@/pages/AuthPage/AuthPage"; // Создадим ниже

export default function App() {
  const [user, setUser] = useState(null);

  // При первой загрузке проверяем, есть ли юзер в памяти браузера
useEffect(() => {
    const fetchFreshUser = async () => {
      const token = localStorage.getItem("courierToken");
      const savedUser = localStorage.getItem("courierUser");
      
      // Тимчасово ставимо старі дані, щоб не було білого екрану
      if (savedUser) setUser(JSON.parse(savedUser));

      if (token) {
        try {
          const response = await fetch("http://localhost:3000/api/profile", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          
          if (response.ok) {
            const freshData = await response.json();
            setUser(freshData); // Оновлюємо стейт React свіжими даними (вкл. isVerified)
            localStorage.setItem("courierUser", JSON.stringify(freshData)); // Оновлюємо кеш
          } else {
            // Якщо токен помер — викидаємо
            handleLogout();
          }
        } catch (error) {
          console.error("Помилка синхронізації профілю при старті:", error);
        }
      }
    };

    fetchFreshUser();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("courierToken");
    localStorage.removeItem("courierUser");
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Если юзер не залогинен, показываем AuthPage. Иначе кидаем на карту */}
        <Route 
          path="/login" 
          element={!user ? <AuthPage onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        
        {/* Если залогинен, показываем карту и передаем ей данные юзера */}
        <Route 
          path="/" 
          element={
            user ? (
              <MainPage currentUser={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}