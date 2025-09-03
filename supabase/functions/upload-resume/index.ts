import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Supabase Edge Function для безопасной загрузки резюме
 * Выполняет серверную валидацию и генерирует подписанные URL
 */

// Константы для валидации
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB в байтах
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

// CORS заголовки для поддержки браузерных запросов
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Валидация метаданных файла на сервере
 * Дублирует клиентскую валидацию для безопасности
 */
function validateFileMetadata(fileName: string, fileSize: number, contentType: string) {
  // Проверка размера файла
  if (fileSize > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `Файл слишком большой. Максимальный размер: ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }

  // Проверка MIME типа
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return {
      isValid: false,
      error: 'Неподдерживаемый тип файла. Разрешены только PDF и DOCX'
    };
  }

  // Проверка расширения файла
  const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return {
      isValid: false,
      error: 'Неподдерживаемое расширение файла. Используйте .pdf или .docx'
    };
  }

  // Проверка на потенциально опасные символы в имени файла
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(fileName)) {
    return {
      isValid: false,
      error: 'Имя файла содержит недопустимые символы'
    };
  }

  return { isValid: true };
}

/**
 * Генерация уникального имени файла для предотвращения конфликтов
 */
function generateUniqueFileName(originalName: string, userId?: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const baseName = originalName.replace(/\.[^/.]+$/, '').substring(0, 50); // Ограничиваем длину
  
  // Включаем userId если доступен для лучшей организации файлов
  const userPrefix = userId ? `${userId}_` : '';
  
  return `${userPrefix}${baseName}_${timestamp}_${randomSuffix}.${extension}`;
}

serve(async (req) => {
  // Обработка CORS preflight запросов
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Проверка метода запроса
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Метод не поддерживается' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Инициализация Supabase клиента
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Парсинг тела запроса
    const { fileName, fileSize, contentType, userId } = await req.json();

    // Проверка обязательных параметров
    if (!fileName || !fileSize || !contentType) {
      return new Response(
        JSON.stringify({ 
          error: 'Отсутствуют обязательные параметры: fileName, fileSize, contentType' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Серверная валидация метаданных файла
    const validation = validateFileMetadata(fileName, fileSize, contentType);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Генерация уникального имени файла
    const uniqueFileName = generateUniqueFileName(fileName, userId);

    // Генерация подписанного URL для загрузки
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient
      .storage
      .from('resumes')
      .createSignedUploadUrl(uniqueFileName, {
        upsert: false, // Не перезаписывать существующие файлы
      });

    if (signedUrlError) {
      console.error('Ошибка создания подписанного URL:', signedUrlError);
      return new Response(
        JSON.stringify({ 
          error: 'Не удалось подготовить загрузку файла',
          details: signedUrlError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Логирование для мониторинга (в продакшене можно отправлять в систему логов)
    console.log(`Создан подписанный URL для файла: ${uniqueFileName}, размер: ${fileSize} байт`);

    // Возврат подписанного URL клиенту
    return new Response(
      JSON.stringify({
        signedUrl: signedUrlData.signedUrl,
        fileName: uniqueFileName,
        path: signedUrlData.path
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Неожиданная ошибка в upload-resume function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Внутренняя ошибка сервера',
        message: 'Попробуйте еще раз или обратитесь в поддержку'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});