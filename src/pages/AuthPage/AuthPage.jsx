import { useState } from "react";
import styles from "./AuthPage.module.scss";

export const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    const url = isLogin ? "http://localhost:3000/api/auth/login" : "http://localhost:3000/api/auth/register";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      if (isLogin) {
        localStorage.setItem("courierToken", data.token);
        localStorage.setItem("courierUser", JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setMessage("Успішно! Тепер увійдіть в акаунт.");
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authCard}>
        <div className={styles.brandHeader}>
          <div className={styles.logoCircle}>🚀</div>
          <h2>Tizen Delivery</h2>
          <p>{isLogin ? "Вхід у систему для кур'єрів" : "Реєстрація нового кур'єра"}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          {message && <div className={styles.successMessage}>{message}</div>}

          {!isLogin && (
            <div className={styles.inputGroup}>
              <label>Ім'я та прізвище</label>
              <input
                type="text"
                placeholder="Кирило Гаращенко"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label>Електронна пошта</label>
            <input
              type="email"
              placeholder="courier@deli.very"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Пароль</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? "Зачекайте..." : isLogin ? "Увійти на лінію" : "Створити акаунт"}
          </button>
        </form>

        <div className={styles.toggleMode}>
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Немає акаунту? Створити" : "Вже є акаунт? Увійти"}
          </span>
        </div>
      </div>
    </div>
  );
};