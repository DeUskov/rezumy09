import { createClient } from '@supabase/supabase-js';

// Получаем URL и ключи Supabase из переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Проверяем, что переменные окружения установлены
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Отсутствуют переменные окружения VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY. ' +
    'Убедитесь, что они настроены в файле .env'
  );
}

/**
 * Инициализация клиента Supabase для работы с аутентификацией и базой данных
 * Используется во всем приложении для:
 * - Аутентификации пользователей (Magic Link, Telegram)
 * - Работы с базой данных (профили, резюме, вакансии)
 * - Загрузки файлов в Storage
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Настройки аутентификации
    autoRefreshToken: true, // Автоматическое обновление токенов
    persistSession: true,   // Сохранение сессии в localStorage
    detectSessionInUrl: true, // Обнаружение сессии в URL (для Magic Link)
  },
});

// Типы для TypeScript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: number;
          user_id: string;
          username: string;
          second_name: string | null;
          gender: string | null;
          date_of_birth: string | null;
          bio: string | null;
          avatar_url: string | null;
          telegram_user_id: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          username: string;
          second_name?: string | null;
          gender?: string | null;
          date_of_birth?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          telegram_user_id?: number | null;
        };
        Update: {
          username?: string;
          second_name?: string | null;
          gender?: string | null;
          date_of_birth?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          telegram_user_id?: number | null;
          updated_at?: string;
        };
      };
    };
  };
};