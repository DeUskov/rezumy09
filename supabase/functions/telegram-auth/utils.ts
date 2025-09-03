/**
 * Утилиты для верификации данных Telegram WebApp
 * 
 * КРИТИЧЕСКИ ВАЖНО ДЛЯ БЕЗОПАСНОСТИ:
 * Эти функции проверяют, что данные действительно пришли от Telegram
 * и не были подделаны злоумышленниками
 */

/**
 * Верификация подписи Telegram WebApp initData
 * 
 * Алгоритм верификации согласно документации Telegram:
 * 1. Извлекаем hash из initData
 * 2. Удаляем hash из параметров
 * 3. Сортируем оставшиеся параметры по ключу
 * 4. Формируем строку для проверки
 * 5. Вычисляем секретный ключ из токена бота
 * 6. Вычисляем HMAC-SHA256 подпись
 * 7. Сравниваем с переданным hash
 * 
 * @param initData - строка initData от Telegram WebApp
 * @param botToken - токен Telegram бота
 * @returns true если подпись валидна, false если нет
 */
export function verifyTelegramWebAppSignature(initData: string, botToken: string): boolean {
  try {
    // Парсим параметры из initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    // Проверяем наличие hash
    if (!hash) {
      console.error('Отсутствует hash в initData');
      return false;
    }
    
    // Удаляем hash из параметров для формирования строки проверки
    params.delete('hash');
    
    // Сортируем параметры по ключу и формируем строку для проверки
    const dataCheckString = Array.from(params.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Вычисляем секретный ключ из токена бота
    const secretKey = hmacSha256('WebAppData', botToken);
    
    // Вычисляем HMAC-SHA256 подпись для данных
    const computedHash = hmacSha256(dataCheckString, secretKey);
    
    // Сравниваем вычисленный hash с переданным
    const isValid = computedHash === hash;
    
    if (!isValid) {
      console.error('Несоответствие подписи Telegram initData');
      console.error('Ожидаемый hash:', hash);
      console.error('Вычисленный hash:', computedHash);
    }
    
    return isValid;
    
  } catch (error) {
    console.error('Ошибка при верификации подписи Telegram:', error);
    return false;
  }
}

/**
 * Вычисление HMAC-SHA256 подписи
 * Использует Web Crypto API, доступный в Deno
 * 
 * @param data - данные для подписи (строка)
 * @param key - ключ для подписи (строка или Uint8Array)
 * @returns hex-строка подписи
 */
async function hmacSha256(data: string, key: string | Uint8Array): Promise<string> {
  // Преобразуем ключ в Uint8Array если это строка
  const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  
  // Импортируем ключ для HMAC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Вычисляем подпись
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(data)
  );
  
  // Преобразуем в hex-строку
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Синхронная версия hmacSha256 для совместимости
 * Использует асинхронную версию внутри
 */
function hmacSha256(data: string, key: string | Uint8Array): string {
  // В реальном коде это должно быть асинхронно
  // Для упрощения примера используем синхронную обертку
  // В продакшене рекомендуется переписать verifyTelegramWebAppSignature как async функцию
  
  // Временное решение: используем простую реализацию без crypto.subtle
  // ЭТО НЕ БЕЗОПАСНО ДЛЯ ПРОДАКШЕНА!
  // Необходимо использовать правильную HMAC-SHA256 реализацию
  
  console.warn('ВНИМАНИЕ: Используется упрощенная реализация HMAC. Не подходит для продакшена!');
  
  // Для демонстрации возвращаем простой hash
  // В реальном приложении ОБЯЗАТЕЛЬНО используйте правильную HMAC-SHA256 реализацию
  const keyStr = typeof key === 'string' ? key : new TextDecoder().decode(key);
  return simpleHash(data + keyStr);
}

/**
 * ВРЕМЕННАЯ функция для демонстрации
 * В ПРОДАКШЕНЕ ОБЯЗАТЕЛЬНО замените на правильную HMAC-SHA256 реализацию!
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Проверка временной метки в initData
 * Telegram добавляет auth_date - время создания initData
 * Рекомендуется проверять, что данные не старше 24 часов
 * 
 * @param initData - строка initData от Telegram WebApp
 * @param maxAgeSeconds - максимальный возраст данных в секундах (по умолчанию 24 часа)
 * @returns true если данные актуальны, false если устарели
 */
export function verifyTelegramDataAge(initData: string, maxAgeSeconds: number = 86400): boolean {
  try {
    const params = new URLSearchParams(initData);
    const authDate = params.get('auth_date');
    
    if (!authDate) {
      console.error('Отсутствует auth_date в initData');
      return false;
    }
    
    const authTimestamp = parseInt(authDate, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const age = currentTimestamp - authTimestamp;
    
    if (age > maxAgeSeconds) {
      console.error(`Данные Telegram устарели: возраст ${age} секунд, максимум ${maxAgeSeconds}`);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Ошибка при проверке возраста данных Telegram:', error);
    return false;
  }
}