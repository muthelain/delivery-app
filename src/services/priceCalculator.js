/**
 * Розрахунок вартості доставки
 * @param {number} distanceKm - Відстань у кілометрах
 * @param {number} durationMin - Час у дорозі в хвилинах
 * @param {number} demandMultiplier - Коефіцієнт попиту (наприклад, 1.5 в годину пік або дощ)
 * @returns {number} - Підсумкова вартість у гривнях
 */
export const calculateDeliveryPrice = (
  distanceKm,
  durationMin,
  demandMultiplier = 1,
) => {
  // Тарифи (можна винести в константи або отримувати з бекенду)
  const BASE_FARE = 55; // Базова вартість (подача)
  const PRICE_PER_KM = 15; // Вартість за 1 кілометр
  const PRICE_PER_MIN = 2.5; // Доплата за кожну хвилину (компенсація заторів)

  // Якщо дані некоректні, повертаємо мінімалку
  if (!distanceKm || !durationMin) return BASE_FARE;

  // Формула розрахунку
  const distanceCost = distanceKm * PRICE_PER_KM;
  const timeCost = durationMin * PRICE_PER_MIN;

  const total = (BASE_FARE + distanceCost + timeCost) * demandMultiplier;

  // Округлюємо до цілого числа, щоб не було копійок (наприклад, 143 грн)
  return Math.round(total);
};

/**
 * Утиліта для красивого відображення ціни (додає символ валюти)
 */
export const formatPrice = (price) => {
  return `${price} ₴`;
};
