/*
  # Создание базовой таблицы profiles для пользователей

  1. Новые таблицы
    - `profiles`
      - `id` (bigint, primary key, auto increment) - Уникальный ID профиля
      - `user_id` (uuid, foreign key) - Связь с пользователем из auth.users
      - `username` (text, not null) - Имя пользователя
      - `second_name` (text, nullable) - Фамилия пользователя
      - `gender` (text, nullable) - Пол пользователя
      - `date_of_birth` (date, nullable) - Дата рождения
      - `bio` (text, nullable) - Биография/описание
      - `avatar_url` (text, nullable) - URL аватара
      - `created_at` (timestamptz) - Дата создания профиля
      - `updated_at` (timestamptz) - Дата последнего обновления

  2. Безопасность
    - Включить RLS для таблицы `profiles`
    - Политики для CRUD операций только для владельца профиля
    - Индексы для оптимизации запросов

  3. Примечания
    - Поле telegram_user_id будет добавлено в следующей миграции
    - Триггер для автоматического создания профиля будет добавлен отдельно
*/

-- Создание таблицы profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  second_name text,
  gender text,
  date_of_birth date,
  bio text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Включение Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Политика для чтения: пользователи могут читать свой профиль
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Политика для создания: пользователи могут создать свой профиль
CREATE POLICY "Users can create own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Политика для обновления: пользователи могут обновлять свой профиль
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Политика для удаления: пользователи могут удалять свой профиль
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
  ON public.profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_username 
  ON public.profiles(username);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at при изменении записи
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- Комментарии к таблице и столбцам для документации
COMMENT ON TABLE public.profiles IS 'Профили пользователей с расширенной информацией';
COMMENT ON COLUMN public.profiles.id IS 'Уникальный идентификатор профиля';
COMMENT ON COLUMN public.profiles.user_id IS 'ID пользователя из auth.users';
COMMENT ON COLUMN public.profiles.username IS 'Имя пользователя';
COMMENT ON COLUMN public.profiles.second_name IS 'Фамилия пользователя';
COMMENT ON COLUMN public.profiles.gender IS 'Пол пользователя';
COMMENT ON COLUMN public.profiles.date_of_birth IS 'Дата рождения пользователя';
COMMENT ON COLUMN public.profiles.bio IS 'Биография или описание пользователя';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL аватара пользователя';
COMMENT ON COLUMN public.profiles.created_at IS 'Дата и время создания профиля';
COMMENT ON COLUMN public.profiles.updated_at IS 'Дата и время последнего обновления профиля';