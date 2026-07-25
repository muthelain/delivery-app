import styles from "./SidebarWidget.module.scss";

import { OrderCard } from "@/components/Card/OrderCard";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ToggleShift } from "@/components/ToggleShift/ToggleShift";

export const SidebarWidget = ({
  isOpen,
  orders,
  selectedOrder,
  onSelectOrder,
  onAcceptOrder,
  isWorking, 
  onToggleShift
}) => {
  return (
    <aside className={`${styles.sidebar} ${!isOpen ? styles.closed : ""}`}>
      <UserAvatar name="Олексій С." />

      <div className={styles.ordersList}>
        {orders.length > 0 ? (
          orders.map((order) => {
            const isSelected = selectedOrder?.id === order.id;

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className={`${styles.orderItem} ${isSelected ? styles.selected : ""}`}
              >
                <OrderCard
                  address={order.address}
                  time={order.time}
                  price={order.price}
                />

                {isSelected && (
                  <button
                    disabled={!isWorking}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcceptOrder(order);
                    }}
                    className={styles.acceptBtn}
                  >
                    {isWorking
                      ? "🚀 Прийняти замовлення"
                      : "🔒 Відкрийте зміну"}
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p
            style={{
              textAlign: "center",
              marginTop: "30px",
              color: "#999",
              fontSize: "14px",
            }}
          >
            ⏳ Пошук вільних замовлень у Києві...
          </p>
        )}
      </div>

      <div className={styles.footer}>
        <ToggleShift isWorking={isWorking} onToggle={onToggleShift} />
      </div>
    </aside>
  );
};
