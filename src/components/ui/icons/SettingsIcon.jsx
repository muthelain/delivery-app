
export const Settings = () => {
  return (
    <svg 
      className="animated-icon"
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      width="150" 
      height="150"
      style={{ cursor: 'pointer' }}
    >
      <style>
        {`
          /* 1. Слой выпрыгивания: прячет шестеренку в коробку по умолчанию */
          .gear-jump {
            transform-origin: 50px 45px;
            transform: translateY(35px) scale(0.5);
            opacity: 0;
            transition: transform 0.4s ease-in, opacity 0.3s ease-in;
          }
          
          /* При наведении: слой выпрыгивает наверх с эффектом пружинки */
          .animated-icon:hover .gear-jump {
            transform: translateY(0px) scale(1);
            opacity: 1;
            transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease-out;
          }

          /* 2. Слой вращения: по умолчанию стоит на месте */
          .gear-spin {
            transform-origin: 50px 45px;
          }

          /* При наведении: запускается БЕСКОНЕЧНАЯ анимация вращения */
          .animated-icon:hover .gear-spin {
            animation: spinLoop 3s linear infinite;
          }

          @keyframes spinLoop {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* 3. Бесконечные искры */
          .lines path {
            stroke-dasharray: 20;
            stroke-dashoffset: 20;
            opacity: 0;
          }

          /* Запускаем зацикленную анимацию для линий при наведении */
          .animated-icon:hover .lines path {
            animation: shootLinesLoop 1s ease-out infinite;
          }

          /* Небольшая задержка, чтобы искры вылетали не все разом, а по очереди */
          .animated-icon:hover .lines path:nth-child(1) { animation-delay: 0s; }
          .animated-icon:hover .lines path:nth-child(2) { animation-delay: 0.2s; }
          .animated-icon:hover .lines path:nth-child(3) { animation-delay: 0.4s; }

          @keyframes shootLinesLoop {
            0% { stroke-dashoffset: 20; opacity: 0; }
            20% { opacity: 1; }
            80% { stroke-dashoffset: -20; opacity: 0; }
            100% { stroke-dashoffset: -20; opacity: 0; }
          }
        `}
      </style>

      <defs>
        <mask id="gearHole">
          <rect x="0" y="0" width="100" height="100" fill="white"/>
          <circle cx="50" cy="45" r="6" fill="black"/>
        </mask>
      </defs>

      {/* Задняя стенка коробки */}
      <path d="M 25 55 L 25 35 a 4 4 0 0 1 4 -4 h 42 a 4 4 0 0 1 4 4 v 20 z" fill="#D35400"/>

      {/* Обертка для ПРЫЖКА */}
      <g className="gear-jump">
        {/* Обертка для ВРАЩЕНИЯ */}
        <g className="gear-spin" mask="url(#gearHole)" fill="#7f8e98">
          <rect x="46" y="27" width="8" height="36" rx="1"/>
          <rect x="46" y="27" width="8" height="36" rx="1" transform="rotate(45 50 45)"/>
          <rect x="46" y="27" width="8" height="36" rx="1" transform="rotate(90 50 45)"/>
          <rect x="46" y="27" width="8" height="36" rx="1" transform="rotate(135 50 45)"/>
          <circle cx="50" cy="45" r="14"/>
          <circle cx="50" cy="45" r="9" fill="none" stroke="#2980B9" strokeWidth="1.5"/>
        </g>
      </g>

      {/* Передняя стенка коробки */}
      <rect x="20" y="55" width="60" height="35" rx="3" fill="#E67E22"/>
      <rect x="42" y="55" width="16" height="35" fill="#D35400" opacity="0.2"/>
      <path d="M 20 55 L 26 73 a 2 2 0 0 0 2 1.5 h 44 a 2 2 0 0 0 2 -1.5 L 80 55 z" fill="#F39C12"/>

      {/* Искры */}
      <g className="lines">
        <path d="M 50 15 L 50 5" stroke="#F1C40F" strokeWidth="3" strokeLinecap="round" />
        <path d="M 32 25 L 23 16" stroke="#F1C40F" strokeWidth="3" strokeLinecap="round" />
        <path d="M 68 25 L 77 16" stroke="#F1C40F" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
};