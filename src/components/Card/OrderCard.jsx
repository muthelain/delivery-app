import styles from './OrderCard.module.scss';

export const OrderCard = ({ address, time, price }) => {
  return (
    <div className={styles.card}>
      <div className={styles.address}>{address}</div>
      <div className={styles.details}>
        <span>🕒 {time}</span>
        <span className={styles.price}>{price}</span>
      </div>
    </div>
  );
};