/*
  # Добавление поддержки Telegram аутентификации

  1. Изменения в таблице profiles
    - Добавляем колонку `telegram_user_id` для связи с Telegram аккаунтами
    - Устанавливаем UNIQUE constraint для предотвращения дублирования
    - Добавляем индекс для быстрого поиска по telegram_user_id

  2. Безопасность
    - Обновляем RLS политики для работы с Telegram пользователями
    - Добавляем политики для связывания аккаунтов

  3. Функции
    - Создаем функцию для автоматического создания профиля при регистрации
    - Добавляем триггер для новых пользователей
*/

-- Добавляем колонку telegram_user_id в таблицу profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT UNIQUE;

-- Создаем индекс для быстрого поиска по telegram_user_id
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_user_id 
ON public.profiles(telegram_user_id);

-- Включаем RLS для таблицы profiles (если еще не включен)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Политика для чтения профилей (пользователи могут читать свой профиль)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Политика для создания профилей (пользователи могут создать свой профиль)
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Политика для обновления профилей (пользователи могут обновлять свой профиль)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Функция для автоматического создания профиля при регистрации пользователя
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания профиля
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Функция для связывания Telegram аккаунта с существующим профилем
CREATE OR REPLACE FUNCTION public.link_telegram_account(telegram_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Получаем ID текущего пользователя
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Проверяем, не связан ли уже этот Telegram ID с другим аккаунтом
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE telegram_user_id = telegram_id 
    AND user_id != current_user_id
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Обновляем профиль текущего пользователя
  UPDATE public.profiles 
  SET telegram_user_id = telegram_id,
      updated_at = NOW()
  WHERE user_id = current_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;