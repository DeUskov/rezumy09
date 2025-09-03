import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Supabase Edge Function для сохранения генерации письма и скорринга
 * 
 * Логика работы:
 * 1. Получает данные генерации от фронтенда
 * 2. Извлекает user_id из JWT токена пользователя
 * 3. Валидирует входные данные
 * 4. Сохраняет все данные в таблицу generations
 * 5. Возвращает ID созданной записи
 * 
 * Безопасность:
 * - Использует JWT токен для идентификации пользователя
 * - RLS политики обеспечивают доступ только к собственным данным
 * - Валидация всех входных данных
 */

// CORS заголовки для поддержки браузерных запросов
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Интерфейс для данных генерации от фронтенда
 */
interface SaveGenerationRequest {
  job_title: string;
  company_name: string;
  overall_score?: number;
  cover_letter_text: string;
  scoring_results_json: any;
  resume_data_json: any;
  job_data_json: any;
  title?: string;
  status?: string;
}

/**
 * Валидация входных данных
 */
function validateGenerationData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Проверка обязательных полей
  if (!data.job_title || typeof data.job_title !== 'string' || data.job_title.trim().length === 0) {
    errors.push('job_title обязательно и должно быть непустой строкой');
  }

  if (!data.company_name || typeof data.company_name !== 'string' || data.company_name.trim().length === 0) {
    errors.push('company_name обязательно и должно быть непустой строкой');
  }

  if (!data.cover_letter_text || typeof data.cover_letter_text !== 'string' || data.cover_letter_text.trim().length === 0) {
    errors.push('cover_letter_text обязательно и должно быть непустой строкой');
  }

  // Проверка JSON объектов
  if (!data.scoring_results_json || typeof data.scoring_results_json !== 'object') {
    errors.push('scoring_results_json обязательно и должно быть объектом');
  }

  if (!data.resume_data_json || typeof data.resume_data_json !== 'object') {
    errors.push('resume_data_json обязательно и должно быть объектом');
  }

  if (!data.job_data_json || typeof data.job_data_json !== 'object') {
    errors.push('job_data_json обязательно и должно быть объектом');
  }

  // Проверка опциональных полей
  if (data.overall_score !== undefined) {
    if (typeof data.overall_score !== 'number' || data.overall_score < 0 || data.overall_score > 100) {
      errors.push('overall_score должно быть числом от 0 до 100');
    }
  }

  if (data.title !== undefined && (typeof data.title !== 'string' || data.title.length > 200)) {
    errors.push('title должно быть строкой длиной не более 200 символов');
  }

  if (data.status !== undefined) {
    const allowedStatuses = ['completed', 'draft', 'archived'];
    if (!allowedStatuses.includes(data.status)) {
      errors.push(`status должен быть одним из: ${allowedStatuses.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

Deno.serve(async (req: Request) => {
  try {
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

    // Получение переменных окружения
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Отсутствуют переменные окружения Supabase');
      return new Response(
        JSON.stringify({ 
          error: 'Конфигурация сервера не настроена' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Инициализация Supabase клиента
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Получение пользователя из JWT токена
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Отсутствует токен авторизации' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Ошибка получения пользователя:', userError);
      return new Response(
        JSON.stringify({ error: 'Недействительный токен авторизации' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Парсинг тела запроса
    const requestData: SaveGenerationRequest = await req.json();

    // Валидация входных данных
    const validation = validateGenerationData(requestData);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: 'Ошибка валидации данных',
          details: validation.errors
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('💾 Сохранение генерации для пользователя:', user.id);
    console.log('📊 Данные генерации:', {
      job_title: requestData.job_title,
      company_name: requestData.company_name,
      overall_score: requestData.overall_score,
      letter_length: requestData.cover_letter_text.length,
      has_scoring: !!requestData.scoring_results_json,
      has_resume: !!requestData.resume_data_json,
      has_job_data: !!requestData.job_data_json
    });

    // Подготовка данных для вставки
    const insertData = {
      user_id: user.id,
      job_title: requestData.job_title.trim(),
      company_name: requestData.company_name.trim(),
      overall_score: requestData.overall_score || null,
      cover_letter_text: requestData.cover_letter_text.trim(),
      scoring_results_json: requestData.scoring_results_json,
      resume_data_json: requestData.resume_data_json,
      job_data_json: requestData.job_data_json,
      title: requestData.title?.trim() || null,
      status: requestData.status || 'completed'
    };

    // Сохранение в базу данных
    const { data: savedGeneration, error: insertError } = await supabase
      .from('generations')
      .insert(insertData)
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('Ошибка при сохранении генерации:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Ошибка при сохранении данных',
          details: insertError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Генерация успешно сохранена:', savedGeneration.id);

    // Возврат успешного результата
    return new Response(
      JSON.stringify({ 
        success: true,
        generation_id: savedGeneration.id,
        created_at: savedGeneration.created_at,
        message: 'Генерация успешно сохранена'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Неожиданная ошибка в save-generation function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Внутренняя ошибка сервера',
        message: 'Не удалось сохранить генерацию. Попробуйте еще раз.',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});