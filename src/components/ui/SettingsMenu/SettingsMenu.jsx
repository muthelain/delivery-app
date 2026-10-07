import React, { useState, useEffect, useRef } from "react";
import styles from "./SettingsMenu.module.scss";
import * as Icons from "@/assets/icons/icons";

export const SettingsMenu = ({ isOpen, onClose, onLogout, currentUser, setUser, isDarkMode, setIsDarkMode }) => {
  const [activeTab, setActiveTab] = useState("account");

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  // Стейт для статистики
  const [stats, setStats] = useState({
    todayOrders: 0, todayTime: "0 сек", totalOrders: 0, totalTime: "0 сек"
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Стейт та реф для фото
  const fileInputRef = useRef(null);
  const [localAvatar, setLocalAvatar] = useState(currentUser?.avatar || null);

  useEffect(() => {
    if (currentUser?.avatar) {
      setLocalAvatar(currentUser.avatar);
    }
  }, [currentUser]);

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
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Помилка завантаження статистики:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Функція завантаження фото
  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setLocalAvatar(localUrl); // Одразу показуємо на екрані

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const token = localStorage.getItem("courierToken");
      const response = await fetch("http://localhost:3000/api/profile/avatar", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }, // Content-Type браузер поставить сам!
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setLocalAvatar(data.avatarUrl); // Оновлюємо посилання на серверне
      }
    } catch (error) {
      console.error("Помилка завантаження фото:", error);
    }
  };

  const getInitials = (name) => {
    if (!name) return "К";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

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
      <div className={styles.sidebar}>
        <div className={styles.tvBrand}>
          <span>Система</span>
        </div>

        <nav className={styles.navMenu}>
          <button className={`${styles.navItem} ${activeTab === "account" ? styles.active : ""}`} onClick={() => setActiveTab("account")}>
            <img src={Icons.AccountIcon} alt="Account" /> Акаунт
          </button>
          <button className={`${styles.navItem} ${activeTab === "sound" ? styles.active : ""}`} onClick={() => setActiveTab("sound")}>
            <img src={Icons.SoundIcon} alt="Sound" /> Звук
          </button>
          <button className={`${styles.navItem} ${activeTab === "delivery" ? styles.active : ""}`} onClick={() => setActiveTab("delivery")}>
            <img src={Icons.DeliveryIcon} alt="Delivery" /> Доставка
          </button>
          <button className={`${styles.navItem} ${activeTab === "support" ? styles.active : ""}`} onClick={() => setActiveTab("support")}>
            <img src={Icons.HelpIcon} alt="Support" /> Підтримка
          </button>
        </nav>

        <button className={styles.exitBtn} onClick={onClose}>
          <img src={Icons.ExitIcon} alt="Вихід" width="16" height="16" style={{ filter: "invert(1)" }} /> Закрити
        </button>
      </div>

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
          {activeTab === "account" && (
            <div className={styles.accountTab}>
              <div className={styles.avatarSection}>
                <div className={styles.avatarCircle}>
                  {localAvatar ? (
                    <img 
                      src={localAvatar} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <span className={styles.avatarInitials}>{userInitials}</span>
                  )}
                </div>
                <div className={styles.avatarInfo}>
                  <h3>{userName}</h3>
                  <p>Кур'єр рівня: <strong>{userLevel}</strong></p>
                  
                  {/* Прихований інпут та кнопка */}
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg"
                    ref={fileInputRef} 
                    style={{ display: "none" }} 
                    onChange={handleAvatarUpload}
                  />
                  <button className={styles.changeAvatarBtn} onClick={() => fileInputRef.current.click()}>
                    Оновити фото
                  </button>
                </div>
              </div>

              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingTitle}>Темна тема екрану</span>
                  <span className={styles.settingDesc}>Перемикач світлого та темного режимів</span>
                </div>
                <label className={styles.tvToggle}>
                  <input type="checkbox" checked={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)} />
                  <span className={styles.slider}></span>
                </label>
              </div>

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