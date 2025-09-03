import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Supabase Edge Function для создания тестового пользователя в режиме разработки
 * 
 * ИСПРАВЛЕННАЯ ЛОГИКА:
 * 1. Проверяет, что запрос идет из режима разработки
 * 2. Ищет существующего тестового пользователя по email
 * 3. Если не найден - создает нового с подтвержденным email
 * 4. Выполняет вход через signInWithPassword для получения реальной сессии
 * 5. Возвращает полноценную сессию клиенту для установки в браузере
 * 
 * ВАЖНО: Эта функция должна использоваться ТОЛЬКО в режиме разработки!
 */

// CORS заголовки для поддержки браузерных запросов
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Проверка, что запрос идет из режима разработки
 * Анализирует заголовки и origin для определения окружения
 */
function isDevelopmentRequest(req: Request): boolean {
  const origin = req.headers.get('origin') || '';
  const referer = req.headers.get('referer') || '';
  
  // Проверяем localhost, 127.0.0.1 или dev-домены
  const devPatterns = [
    'localhost',
    '127.0.0.1',
    'stackblitz',
    '.local',
    'dev.',
    'development',
    'webcontainer'
  ];
  
  return devPatterns.some(pattern => 
    origin.includes(pattern) || referer.includes(pattern)
  );
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

    // БЕЗОПАСНОСТЬ: Проверяем, что запрос идет из режима разработки
    if (!isDevelopmentRequest(req)) {
      console.error('Попытка использования dev-функции не из режима разработки');
      return new Response(
        JSON.stringify({ 
          error: 'Эта функция доступна только в режиме разработки' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Парсинг тела запроса
    const { devEmail, devPassword, userData } = await req.json();

    // Валидация входных данных
    if (!devEmail || !devPassword) {
      return new Response(
        JSON.stringify({ 
          error: 'Отсутствуют обязательные параметры: devEmail, devPassword' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Получение переменных окружения
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Отсутствуют переменные окружения Supabase');
      return new Response(
        JSON.stringify({ 
          error: 'Конфигурация сервера не настроена',
          message: 'Отсутствуют необходимые переменные окружения'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Инициализация Supabase клиентов
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey); // Для админских операций
    const supabaseClient = createClient(supabaseUrl, anonKey);       // Для обычного входа

    let user;
    let isNewUser = false;

    console.log('🔧 Режим разработки: обработка тестового пользователя', devEmail);

    // Сначала пытаемся найти существующего пользователя
    const { data: existingUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (searchError) {
      console.error('Ошибка при поиске пользователей:', searchError);
      return new Response(
        JSON.stringify({ 
          error: 'Ошибка при поиске существующих пользователей',
          details: searchError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Ищем пользователя с нужным email
    const existingUser = existingUsers.users.find(u => u.email === devEmail);

    if (existingUser) {
      // Пользователь найден - используем его
      console.log('✅ Найден существующий тестовый пользователь:', existingUser.id);
      user = existingUser;
      
      // Проверяем, подтвержден ли email
      if (!user.email_confirmed_at) {
        console.log('📧 Подтверждаем email для существующего пользователя');
        
        // Подтверждаем email через Admin API
        const { data: updatedUser, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );
        
        if (confirmError) {
          console.error('Ошибка при подтверждении email:', confirmError);
          return new Response(
            JSON.stringify({ 
              error: 'Ошибка при подтверждении email пользователя',
              details: confirmError.message
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        user = updatedUser.user;
      }
    } else {
      // Пользователь не найден - создаем нового
      console.log('🆕 Создание нового тестового пользователя:', devEmail);
      isNewUser = true;
      
      // Создаем нового пользователя с подтвержденным email
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: devEmail,
        password: devPassword,
        email_confirm: true, // КЛЮЧЕВОЙ МОМЕНТ: автоматически подтверждаем email
        user_metadata: {
          first_name: userData?.firstName || 'Разработчик',
          last_name: userData?.lastName || 'Тестовый',
          username: userData?.username || 'dev_user',
          auth_provider: 'dev_magic_link',
          created_via: 'dev_function',
        },
      });

      if (createError) {
        console.error('Ошибка при создании тестового пользователя:', createError);
        return new Response(
          JSON.stringify({ 
            error: 'Ошибка при создании нового тестового пользователя',
            details: createError.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      user = newUserData.user;
      console.log('✅ Тестовый пользователь создан с ID:', user.id);
    }

    // ИСПРАВЛЕННАЯ ЛОГИКА: Выполняем реальный вход через signInWithPassword
    console.log('🔑 Выполнение входа для получения реальной сессии');
    
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: devEmail,
      password: devPassword,
    });

    if (signInError) {
      console.error('Ошибка при входе тестового пользователя:', signInError);
      return new Response(
        JSON.stringify({ 
          error: 'Ошибка при входе тестового пользователя',
          details: signInError.message,
          suggestion: 'Возможно, пароль был изменен. Попробуйте пересоздать пользователя.'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Проверяем, что сессия создана корректно
    if (!signInData.session || !signInData.session.access_token) {
      console.error('Сессия не содержит access_token:', signInData);
      return new Response(
        JSON.stringify({ 
          error: 'Некорректная сессия',
          details: 'Сессия не содержит необходимых данных для входа'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Логирование для отладки
    console.log(`✅ Успешный вход тестового пользователя: ${user.email}, ${isNewUser ? 'новый' : 'существующий'}`);
    console.log('✅ Сессия содержит access_token:', !!signInData.session.access_token);

    // Возвращаем полноценную сессию и данные пользователя
    return new Response(
      JSON.stringify({ 
        success: true,
        session: signInData.session, // Теперь это полноценная сессия с access_token
        user: {
          id: signInData.user.id,
          email: signInData.user.email,
          email_confirmed: !!signInData.user.email_confirmed_at,
          is_new_user: isNewUser,
          metadata: signInData.user.user_metadata,
        },
        message: isNewUser 
          ? 'Тестовый пользователь создан и вход выполнен успешно'
          : 'Вход выполнен с существующим тестовым пользователем'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Неожиданная ошибка в create-dev-user function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Внутренняя ошибка сервера',
        message: 'Не удалось настроить тестового пользователя. Проверьте логи сервера.',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});