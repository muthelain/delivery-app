// src/entities/user/ui/UserAvatar.jsx
import styles from './UserAvatar.module.scss';

export const UserAvatar = ({ name, role = 'кур\'єр', avatar }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className={styles.profile}>
      <div className={styles.avatar}>
        {avatar ? (
          <img 
            src={avatar} 
            alt={name} 
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
          />
        ) : (
          initial
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <span className={styles.role}>{role}</span>
      </div>
    </div>
  );
};