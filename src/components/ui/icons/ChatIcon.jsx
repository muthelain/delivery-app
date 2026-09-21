
export const ChatHelpper = () => {
  return (
    <svg
      className="animated-chat-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      style={{ cursor: 'pointer' }}
    >
      <style>
        {`
          /* Обертка для плавного увеличения при наведении */
          .chat-wrapper {
            transform-origin: 50px 50px;
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }

          /* При наведении: легкий зум и эффект наклона (оператор внимательно слушает) */
          .animated-chat-icon:hover .chat-wrapper {
            transform: scale(1.05) rotate(-2deg);
          }

          /* Точки набора текста: по умолчанию полупрозрачные и стоят на месте */
          .dot {
            opacity: 0.3;
            transition: opacity 0.3s ease;
          }

          /* При наведении: запускаем бесконечную анимацию "печатает..." */
          .animated-chat-icon:hover .dot {
            animation: typing 1.2s infinite ease-in-out;
            opacity: 1;
          }

          /* Задержка для точек, чтобы они прыгали волной, а не все вместе */
          .animated-chat-icon:hover .dot-1 { animation-delay: 0s; }
          .animated-chat-icon:hover .dot-2 { animation-delay: 0.2s; }
          .animated-chat-icon:hover .dot-3 { animation-delay: 0.4s; }

          @keyframes typing {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }

          /* Декоративные волны от микрофона (появляются при ответе) */
          .mic-wave {
            opacity: 0;
            transform-origin: 65px 75px;
            transform: scale(0.5);
            transition: all 0.3s ease;
          }

          .animated-chat-icon:hover .mic-wave {
            animation: soundWave 1.5s infinite ease-out;
          }

          .animated-chat-icon:hover .mic-wave-2 {
            animation-delay: 0.2s;
          }

          @keyframes soundWave {
            0% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.2); }
          }
        `}
      </style>

      <g className="chat-wrapper">
        {/* Основной пузырь чата (Синий) */}
        <rect x="15" y="25" width="70" height="45" rx="12" fill="#3498DB" />

        {/* Хвостик пузыря (внизу слева) */}
        <path d="M 25 70 L 25 85 L 42 70 Z" fill="#3498DB" />

        {/* Точки набора текста (внутри пузыря) */}
        <g transform="translate(35, 47.5)">
          <circle cx="0" cy="0" r="4" fill="#FFFFFF" className="dot dot-1" />
        </g>
        <g transform="translate(50, 47.5)">
          <circle cx="0" cy="0" r="4" fill="#FFFFFF" className="dot dot-2" />
        </g>
        <g transform="translate(65, 47.5)">
          <circle cx="0" cy="0" r="4" fill="#FFFFFF" className="dot dot-3" />
        </g>

        {/* Ободок наушников гарнитуры */}
        <path d="M 15 50 v -10 a 35 35 0 0 1 70 0 v 10" fill="none" stroke="#E67E22" strokeWidth="4" strokeLinecap="round" />

        {/* Амбушюры (наушники по бокам) */}
        <rect x="11" y="40" width="8" height="20" rx="4" fill="#D35400" />
        <rect x="81" y="40" width="8" height="20" rx="4" fill="#D35400" />

        {/* Микрофон: изящная дужка */}
        <path d="M 85 55 Q 85 75 65 75" fill="none" stroke="#E67E22" strokeWidth="3" strokeLinecap="round" />

        {/* Микрофон: наконечник */}
        <circle cx="65" cy="75" r="4" fill="#F39C12" />

        {/* Волны звука от микрофона (спрятаны до наведения) */}
        <path d="M 58 71 A 6 6 0 0 0 58 79" fill="none" stroke="#F1C40F" strokeWidth="2" strokeLinecap="round" className="mic-wave mic-wave-1" />
        <path d="M 54 68 A 10 10 0 0 0 54 82" fill="none" stroke="#F1C40F" strokeWidth="2" strokeLinecap="round" className="mic-wave mic-wave-2" />
      </g>
    </svg>
  );
};