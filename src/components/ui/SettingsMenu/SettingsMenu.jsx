import React, { useState, useEffect } from "react";
import styles from "./SettingsMenu.module.scss";
import * as Icons from "@/assets/icons/icons";

export const SettingsMenu = ({ isOpen, onClose, onLogout, currentUser }) => {
  const [activeTab, setActiveTab] = useState("account");

  // Локальні стани налаштувань
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // === ДОБАВЛЕННЫЕ СОСТОЯНИЯ ДЛЯ СТАТИСТИКИ ===
  const [stats, setStats] = useState({
    todayOrders: 0, todayTime: "0 сек", totalOrders: 0, totalTime: "0 сек"
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // === ЗАГРУЗКА ДАННЫХ ПРИ ОТКРЫТИИ МЕНЮ ===
  useEffect(() => {
    if (isOpen && activeTab === "account") {
      fetchFreshStats();
    }
  }, [isOpen, activeTab]);

  const fetchFreshStats = async () => {
    setIsLoadingStats(true);
    try {
      const token = localStorage.getItem("courierToken");
      const response = await fetch("http://localhost:3000/api/profile", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats); // Обновляем цифры на экране
      }
    } catch (error) {
      console.error("Помилка завантаження статистики:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "К"; // По умолчанию, если имя еще не загрузилось
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Вычисляем ранг курьера
  const getCourierLevel = (total) => {
    if (total < 10) return "Стажер";
    if (total < 50) return "Спеціаліст";
    if (total < 150) return "Профі";
    return "Легенда доставки";
  };

  const userName = currentUser?.name || "Завантаження...";
  const userInitials = getInitials(currentUser?.name);
  const userLevel = getCourierLevel(stats.totalOrders);

  return (
    <div className={`${styles.settingsWindow} ${isOpen ? styles.open : ""}`}>
      {/* ЛІВА ПАНЕЛЬ (Вкладки) */}
      <div className={styles.sidebar}>
        <div className={styles.tvBrand}>
          <span>Система</span>
        </div>

        <nav className={styles.navMenu}>
          <button
            className={`${styles.navItem} ${activeTab === "account" ? styles.active : ""}`}
            onClick={() => setActiveTab("account")}
          >
            <img src={Icons.AccountIcon} alt="Account" />
            Акаунт
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "sound" ? styles.active : ""}`}
            onClick={() => setActiveTab("sound")}
          >
            <img src={Icons.SoundIcon} alt="Sound" />
            Звук
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "delivery" ? styles.active : ""}`}
            onClick={() => setActiveTab("delivery")}
          >
            <img src={Icons.DeliveryIcon} alt="Delivery" />
            Доставка
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "support" ? styles.active : ""}`}
            onClick={() => setActiveTab("support")}
          >
            <img src={Icons.HelpIcon} alt="Support" />
            Підтримка
          </button>
        </nav>

        {/* Кнопка закриття внизу */}
        <button className={styles.exitBtn} onClick={onClose}>
          <img
            src={Icons.ExitIcon}
            alt="Вихід"
            width="16"
            height="16"
            style={{ filter: "invert(1)" }}
          />
          Закрити
        </button>
      </div>

      {/* ПРАВА ПАНЕЛЬ (Контент активної вкладки) */}
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <h2>
            {activeTab === "account" && "Профіль та статистика"}
            {activeTab === "sound" && "Налаштування звуку"}
            {activeTab === "delivery" && "Параметри доставки"}
            {activeTab === "support" && "Служба підтримки"}
          </h2>
        </div>

        <div className={styles.settingsList}>
          
          {/* ВКЛАДКА: АКАУНТ */}
          {activeTab === "account" && (
            <div className={styles.accountTab}>
              
              {/* Блок з аватаркою */}
              <div className={styles.avatarSection}>
                <div className={styles.avatarCircle}>
                  <span className={styles.avatarInitials}>{userInitials}</span>
                </div>
                <div className={styles.avatarInfo}>
                  <h3>{userName}</h3>
                  {/* Динамический ранг */}
                  <p>Кур'єр рівня: <strong>{userLevel}</strong></p>
                  <button className={styles.changeAvatarBtn}>Оновити фото</button>
                </div>
              </div>

              {/* Налаштування теми */}
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingTitle}>Темна тема екрану</span>
                  <span className={styles.settingDesc}>Перемикач світлого та темного режимів</span>
                </div>
                <label className={styles.tvToggle}>
                  <input
                    type="checkbox"
                    checked={isDarkMode}
                    onChange={() => setIsDarkMode(!isDarkMode)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              {/* Статистика */}
              <h4 className={styles.statsTitle}>
                Статистика роботи {isLoadingStats && <span style={{fontSize: '12px', color: '#ff6600'}}>(Оновлення...)</span>}
              </h4>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{stats.todayOrders}</span>
                  <span className={styles.statLabel}>Замовлень (Сьогодні)</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{stats.todayTime}</span>
                  <span className={styles.statLabel}>На зміні (Сьогодні)</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{stats.totalOrders}</span>
                  <span className={styles.statLabel}>Замовлень (Загалом)</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{stats.totalTime}</span>
                  <span className={styles.statLabel}>Час роботи (Загалом)</span>
                </div>
              </div>
              <button onClick={onLogout} className={styles.logoutBtn}>
                🚪 Вийти з акаунта
              </button>
            </div>
          )}

          {/* ВКЛАДКА: ЗВУК */}
          {activeTab === "sound" && (
            <>
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingTitle}>Звукові сповіщення</span>
                  <span className={styles.settingDesc}>Сигнал при отриманні нового замовлення</span>
                </div>
                <label className={styles.tvToggle}>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={() => setSoundEnabled(!soundEnabled)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingTitle}>Push-повідомлення</span>
                  <span className={styles.settingDesc}>Фонові сповіщення на пристрій</span>
                </div>
                <label className={styles.tvToggle}>
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={() => setNotifications(!notifications)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </>
          )}

          {/* ВКЛАДКА: ДОСТАВКА */}
          {activeTab === "delivery" && (
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <span className={styles.settingTitle}>Авто-прийняття</span>
                <span className={styles.settingDesc}>Автоматично приймати найближче замовлення (Бета)</span>
              </div>
              <label className={styles.tvToggle}>
                <input
                  type="checkbox"
                  checked={autoAccept}
                  onChange={() => setAutoAccept(!autoAccept)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          )}

          {/* ВКЛАДКА: ПІДТРИМКА */}
          {activeTab === "support" && (
            <div className={styles.supportInfo}>
              <p>Версія системи: <strong>Tizen OS Delivery 1.0.4</strong></p>
              <p>Зв'язок з диспетчером доступний через кнопку чату на головному екрані.</p>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};