import { useEffect, useState } from 'react';

// Интерфейс для пользователя Telegram
interface TelegramUser {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

// Хук для работы с Telegram WebApp API
export const useTelegram = () => {
  const [tg, setTg] = useState<any>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    // Проверяем доступность Telegram WebApp
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const telegram = (window as any).Telegram.WebApp;
      setTg(telegram);

      // Получаем данные пользователя
      if (telegram.initDataUnsafe?.user) {
        const telegramUser = telegram.initDataUnsafe.user;
        setUser({
          id: telegramUser.id.toString(),
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          username: telegramUser.username,
          photoUrl: telegramUser.photo_url
        });
      } else {
        // Для тестирования вне Telegram
        setUser({
          id: 'demo_user',
          firstName: 'Тестовый',
          lastName: 'Пользователь'
        });
      }
    }
  }, []);

  return { tg, user };
};