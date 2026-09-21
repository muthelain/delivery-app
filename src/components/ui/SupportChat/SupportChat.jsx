import React, { useState, useRef, useEffect } from "react";
import styles from "./SupportChat.module.scss";
import exitIcon from "@/assets/icons/exit.svg";

export const SupportChat = ({ isOpen, onClose }) => {
  // 2. Виправили setMessage на setMessages
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  // 3. Виправили messageEndRef на messagesEndRef
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const newUserMsg = {
      id: Date.now(),
      text: inputValue,
      sender: "user",
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");

    try {
      // Тут буде запит на бекенд...
    } catch (error) {
      console.error("Помилка відправки:", error);
    }
  };

  return (
    <div className={`${styles.chatWindow} ${isOpen ? styles.open : ""}`}>
      {/* Шапка чату */}
      <div className={styles.header}>
        <span>🎧 Підтримка</span>
        <button 
          className={styles.closeBtn} 
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {/* 4. Використовуємо іконку як звичайну картинку */}
          <img src={exitIcon} alt="Закрити" width="20" height="20" />
        </button>
      </div>

      {/* Зона з історією поточного листування */}
      <div className={styles.messagesArea}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#999", marginTop: "20px" }}>
            Напишіть повідомлення диспетчеру...
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.message} ${msg.sender === "user" ? styles.user : styles.support}`}
            >
              {msg.text}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Зона вводу тексту */}
      <div className={styles.inputArea}>
        <input
          type="text"
          placeholder="Написати..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend} disabled={!inputValue.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
};