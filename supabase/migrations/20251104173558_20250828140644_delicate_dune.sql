/*
  # Создание таблицы test_users для тестовых пользователей

  1. Новые таблицы
    - `test_users`
      - `id` (bigint, primary key, auto increment)
      - `username` (text, unique) - имя пользователя для входа
      - `key_for_test` (text) - ключ для аутентификации
      - `display_name` (text) - отображаемое имя пользователя
      - `email` (text, unique) - email для создания Supabase пользователя
      - `created_at` (timestamp) - дата создания записи

  2. Тестовые данные
    - 4 готовых аккаунта для тестирования
    - Различные комбинации username/key для разных сценариев

  3. Безопасность
    - RLS включен
    - Публичный доступ только на чтение (для проверки учетных данных)
    - Индексы для быстрого поиска

  4. Индексы
    - Уникальный индекс по username
    - Уникальный индекс по email
    - Составной индекс для быстрой проверки пары username/key_for_test
*/

-- Создание таблицы test_users если её ещё нет
CREATE TABLE IF NOT EXISTS test_users (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username text UNIQUE NOT NULL,
  key_for_test text NOT NULL,
  display_name text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение Row Level Security
ALTER TABLE test_users ENABLE ROW LEVEL SECURITY;

-- Политика безопасности: публичный доступ только на чтение
DROP POLICY IF EXISTS "Public read access for test users" ON test_users;
CREATE POLICY "Public read access for test users"
  ON test_users
  FOR SELECT
  TO public
  USING (true);

-- Создание индексов для оптимизации поиска
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_users_username 
  ON test_users (username);

CREATE UNIQUE INDEX IF NOT EXISTS idx_test_users_email 
  ON test_users (email);

CREATE INDEX IF NOT EXISTS idx_test_users_auth_pair 
  ON test_users (username, key_for_test);

-- Вставка тестовых данных если они ещё не добавлены
INSERT INTO test_users (username, key_for_test, display_name, email) VALUES
  ('tester1', 'test123', 'Тестовый Пользователь 1', 'tester1@test.jobmatch.ai'),
  ('tester2', 'demo456', 'Тестовый Пользователь 2', 'tester2@test.jobmatch.ai'),
  ('admin', 'admin789', 'Администратор Тест', 'admin@test.jobmatch.ai'),
  ('demo', 'demo2024', 'Демо Пользователь', 'demo@test.jobmatch.ai')
ON CONFLICT (username) DO NOTHING;