/*
  # Создание таблицы тестовых пользователей

  1. Новая таблица
    - `test_users`
      - `id` (bigint, primary key)
      - `username` (text, unique) - имя для входа
      - `key_for_test` (text) - ключ для входа
      - `display_name` (text) - отображаемое имя
      - `email` (text) - email для создания пользователя
      - `created_at` (timestamp)

  2. Безопасность
    - Публичный доступ на чтение (для проверки логина)
    - Запрет на изменение через API
*/

-- Создание таблицы тестовых пользователей
CREATE TABLE IF NOT EXISTS test_users (
  id bigserial PRIMARY KEY,
  username text UNIQUE NOT NULL,
  key_for_test text NOT NULL,
  display_name text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Вставка тестовых данных
INSERT INTO test_users (username, key_for_test, display_name, email) VALUES
('tester1', 'test123', 'Тестовый Пользователь 1', 'tester1@test.local'),
('tester2', 'demo456', 'Тестовый Пользователь 2', 'tester2@test.local'),
('admin', 'admin789', 'Администратор Тест', 'admin@test.local'),
('demo', 'demo2024', 'Демо Пользователь', 'demo@test.local');

-- Настройка RLS (Row Level Security)
ALTER TABLE test_users ENABLE ROW LEVEL SECURITY;

-- Политика: разрешить чтение всем (для проверки логина)
CREATE POLICY "Allow public read access for login verification"
  ON test_users
  FOR SELECT
  TO public
  USING (true);

-- Запретить вставку, обновление и удаление через API
CREATE POLICY "Deny insert access"
  ON test_users
  FOR INSERT
  TO public
  WITH CHECK (false);

CREATE POLICY "Deny update access"
  ON test_users
  FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "Deny delete access"
  ON test_users
  FOR DELETE
  TO public
  USING (false);

-- Создание индекса для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_test_users_username ON test_users(username);
CREATE INDEX IF NOT EXISTS idx_test_users_credentials ON test_users(username, key_for_test);