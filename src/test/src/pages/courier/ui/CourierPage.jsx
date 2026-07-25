import styles from './CourierPage.module.scss';
import { SidebarWidget } from '../../../widgets/sidebar';
import { MapWidget } from '../../../widgets/map'; // <-- Новый импорт

export const CourierPage = () => {
  return (
    <div className={styles.pageLayout}>
      
      <SidebarWidget />

      {/* Заменяем тег <main> с заглушкой на саму карту */}
      <main className={styles.mapContainer}>
        <MapWidget />
      </main>

    </div>
  );
};