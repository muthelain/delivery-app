// src/shared/ui/Button/Button.jsx

// Импортируем стили как объект styles
import styles from './Button.module.scss';

export const Button = ({ children, onClick, variant = 'primary' }) => {
  // Определяем, какой класс добавить в зависимости от варианта
  const buttonClass = variant === 'danger' 
    ? `${styles.button} ${styles.danger}` 
    : styles.button;

  return (
    <button className={buttonClass} onClick={onClick}>
      {children}
    </button>
  );
};