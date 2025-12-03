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

-- Создание таблицы generations
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

-- Политика для чтения: пользователи могут читать только свои генерации
CREATE POLICY "Users can read own generations"
  ON generations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Политика для создания: пользователи могут создавать генерации только для себя
CREATE POLICY "Users can create own generations"
  ON generations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Политика для обновления: пользователи могут обновлять только свои генерации
CREATE POLICY "Users can update own generations"
  ON generations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Политика для удаления: пользователи могут удалять только свои генерации
CREATE POLICY "Users can delete own generations"
  ON generations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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

-- Создание составного индекса для быстрого поиска генераций пользователя по дате
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
CREATE TRIGGER update_generations_updated_at
  BEFORE UPDATE ON generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Комментарии к таблице и столбцам для документации
COMMENT ON TABLE generations IS 'Хранение всех генераций сопроводительных писем и результатов скорринга пользователей';
COMMENT ON COLUMN generations.id IS 'Уникальный идентификатор генерации';
COMMENT ON COLUMN generations.user_id IS 'ID пользователя из auth.users';
COMMENT ON COLUMN generations.job_title IS 'Название должности из анализируемой вакансии';
COMMENT ON COLUMN generations.company_name IS 'Название компании из анализируемой вакансии';
COMMENT ON COLUMN generations.overall_score IS 'Общий балл скорринга от 0 до 100';
COMMENT ON COLUMN generations.cover_letter_text IS 'Полный текст сгенерированного сопроводительного письма';
COMMENT ON COLUMN generations.scoring_results_json IS 'Полные результаты скорринга в формате JSON';
COMMENT ON COLUMN generations.resume_data_json IS 'Структурированные данные резюме в формате JSON';
COMMENT ON COLUMN generations.job_data_json IS 'Структурированные данные вакансии в формате JSON';
COMMENT ON COLUMN generations.title IS 'Пользовательское название для генерации (опционально)';
COMMENT ON COLUMN generations.status IS 'Статус генерации: completed, draft, archived';