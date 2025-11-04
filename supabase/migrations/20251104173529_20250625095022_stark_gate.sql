/*
  # Обновление таблицы profiles для поддержки имени пользователя

  1. Изменения в таблице profiles
    - Обновляем функцию handle_new_user для сохранения имени из метаданных
    - Добавляем поддержку first_name из user_metadata

  2. Безопасность
    - Сохраняем существующие RLS политики
    - Обновляем триггер для новых пользователей
*/

-- Обновляем функцию для автоматического создания профиля при регистрации пользователя
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, second_name)
  VALUES (
    NEW.id,
    -- Приоритет: first_name из метаданных -> username -> часть email до @
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'username', 
      split_part(NEW.email, '@', 1)
    ),
    -- Сохраняем фамилию если есть
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Пересоздаем триггер для применения обновленной функции
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Функция для обновления профиля пользователя (может использоваться в будущем)
CREATE OR REPLACE FUNCTION public.update_user_profile(
  new_username TEXT DEFAULT NULL,
  new_second_name TEXT DEFAULT NULL,
  new_bio TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Получаем ID текущего пользователя
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Обновляем профиль только с переданными параметрами
  UPDATE public.profiles 
  SET 
    username = COALESCE(new_username, username),
    second_name = COALESCE(new_second_name, second_name),
    bio = COALESCE(new_bio, bio),
    updated_at = NOW()
  WHERE user_id = current_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;