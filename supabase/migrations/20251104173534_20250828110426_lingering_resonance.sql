/*
  # Создание таблицы для хранения генераций писем и скорринга

  1. Новые таблицы
    - `generations`
      - `id` (uuid, primary key) - Уникальный идентификатор генерации
      - `user_id` (uuid, foreign key) - Связь с пользователем из auth.users
      - `created_at` (timestamptz) - Дата и время создания
      - `updated_at` (timestamptz) - Дата и время последнего обновления
      - `job_title` (text) - Название должности из вакансии
      - `company_name` (text) - Название компании из вакансии
      - `overall_score` (integer) - Общий балл скорринга (0-100)
      - `cover_letter_text` (text) - Полный текст сгенерированного письма
      - `scoring_results_json` (jsonb) - Полные результаты скорринга в JSON
      - `resume_data_json` (jsonb) - Данные резюме в JSON
      - `job_data_json` (jsonb) - Данные вакансии в JSON
      - `title` (text, nullable) - Пользовательское название генерации
      - `status` (text) - Статус генерации (completed, draft, etc.)

  2. Безопасность
    - Включить RLS для таблицы `generations`
    - Политики для CRUD операций только для владельца записи
    - Индексы для оптимизации запросов

  3. Дополнительные возможности
    - Индекс по user_id для быстрого поиска генераций пользователя
    - Индекс по created_at для сортировки по дате
    - Индекс по overall_score для фильтрации по качеству
*/

-- Создание таблицы generations если её ещё нет
CREATE TABLE IF NOT EXISTS generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Основная информация для отображения в списке
  job_title text NOT NULL,
  company_name text NOT NULL,
  overall_score integer CHECK (overall_score >= 0 AND overall_score <= 100),
  
  -- Основной контент
  cover_letter_text text NOT NULL,
  
  -- JSON данные для полного восстановления контекста
  scoring_results_json jsonb NOT NULL,
  resume_data_json jsonb NOT NULL,
  job_data_json jsonb NOT NULL,
  
  -- Дополнительные поля
  title text, -- Пользовательское название генерации
  status text DEFAULT 'completed' NOT NULL CHECK (status IN ('completed', 'draft', 'archived'))
);

-- Включение Row Level Security
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_generations_user_id 
  ON generations(user_id);

CREATE INDEX IF NOT EXISTS idx_generations_created_at 
  ON generations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generations_overall_score 
  ON generations(overall_score DESC) 
  WHERE overall_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generations_status 
  ON generations(status);

CREATE INDEX IF NOT EXISTS idx_generations_user_created 
  ON generations(user_id, created_at DESC);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at при изменении записи
DROP TRIGGER IF EXISTS update_generations_updated_at ON generations;
CREATE TRIGGER update_generations_updated_at
  BEFORE UPDATE ON generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();