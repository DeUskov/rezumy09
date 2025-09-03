import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyTelegramWebAppSignature } from './utils.ts';

/**
 * Supabase Edge Function для аутентификации через Telegram WebApp
 * 
 * Логика работы:
 * 1. Получает данные от Telegram WebApp (initData, telegramUserId)
 * 2. Верифицирует подпись для обеспечения безопасности
 * 3. Ищет существующий профиль по telegram_user_id
 * 4. Если найден - генерирует сессию для существующего пользователя
 * 5. Если не найден - создает нового пользователя и профиль
 * 6. Возвращает сессию для входа в приложение
 */

// CORS заголовки для поддержки браузерных запросов
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Генерация уникального email для Telegram пользователей
 * Используется когда Telegram не предоставляет email
 */
function generateTelegramEmail(telegramUserId: string, username?: string): string {
  const domain = 'telegram.jobmatch.ai';
  if (username) {
    return `${username}.${telegramUserId}@${domain}`;
  }
  return `user.${telegramUserId}@${domain}`;
}

/**
 * Извлечение данных пользователя из Telegram initData
 */
function parseTelegramUserData(initData: string) {
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    
    if (!userParam) {
      throw new Error('Отсутствуют данные пользователя в initData');
    }
    
    const userData = JSON.parse(decodeURIComponent(userParam));
    return {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      username: userData.username,
      photoUrl: userData.photo_url,
    };
  } catch (error) {
    console.error('Ошибка парсинга данных пользователя Telegram:', error);
    throw new Error('Некорректные данные пользователя Telegram');
  }
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
    // Парсинг тела запроса
    const { telegramUserId, initData } = await req.json();

    // Валидация входных данных
    if (!telegramUserId || !initData) {
      return new Response(
        JSON.stringify({ 
          error: 'Отсутствуют обязательные параметры: telegramUserId, initData' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Получение токена бота из переменных окружения
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
      return new Response(
        JSON.stringify({ error: 'Конфигурация сервера не завершена' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // КРИТИЧЕСКИ ВАЖНО: Верификация подписи Telegram
    // Это предотвращает подделку данных злоумышленниками
    const isValid = verifyTelegramWebAppSignature(initData, BOT_TOKEN);
    if (!isValid) {
      console.error('Неверная подпись Telegram initData для пользователя:', telegramUserId);
      return new Response(
        JSON.stringify({ error: 'Неверная подпись Telegram данных' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Извлечение данных пользователя из initData
    const telegramUserData = parseTelegramUserData(initData);

    // Инициализация Supabase клиента с административными правами
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let user;
    let isNewUser = false;

    // Поиск существующего профиля по telegram_user_id
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('telegram_user_id', telegramUserId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = No rows found
      console.error('Ошибка при поиске профиля:', profileError);
      throw new Error('Ошибка при поиске профиля в базе данных');
    }

    if (profileData) {
      // Пользователь найден - получаем его данные из auth.users
      console.log('Найден существующий пользователь с Telegram ID:', telegramUserId);
      
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profileData.user_id);
      if (userError) {
        console.error('Ошибка при получении пользователя Supabase:', userError);
        throw new Error('Ошибка при получении данных пользователя');
      }
      user = userData.user;
    } else {
      // Пользователь не найден - создаем нового
      console.log('Создание нового пользователя для Telegram ID:', telegramUserId);
      isNewUser = true;
      
      // Генерируем уникальный email для Telegram пользователя
      const email = generateTelegramEmail(telegramUserId.toString(), telegramUserData.username);
      
      // Создаем нового пользователя в Supabase Auth
      const { data: newUserAuthData, error: newUserAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true, // Автоматически подтверждаем email
        user_metadata: {
          telegram_user_id: telegramUserId,
          first_name: telegramUserData.firstName,
          last_name: telegramUserData.lastName,
          username: telegramUserData.username,
          photo_url: telegramUserData.photoUrl,
          auth_provider: 'telegram',
        },
      });

      if (newUserAuthError) {
        console.error('Ошибка при создании пользователя Supabase:', newUserAuthError);
        throw new Error('Ошибка при создании нового пользователя');
      }
      user = newUserAuthData.user;

      // Создаем профиль в таблице profiles
      // Триггер handle_new_user() автоматически создаст базовый профиль,
      // но мы обновим его с данными Telegram
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          telegram_user_id: telegramUserId,
          username: telegramUserData.username || `tg_user_${telegramUserId}`,
          second_name: telegramUserData.lastName,
          avatar_url: telegramUserData.photoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateProfileError) {
        console.error('Ошибка при обновлении профиля:', updateProfileError);
        // Не критическая ошибка - пользователь создан, профиль можно обновить позже
      }
    }

    // Генерация сессии для клиента
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
    });

    if (sessionError) {
      console.error('Ошибка при генерации сессии:', sessionError);
      throw new Error('Ошибка при создании сессии пользователя');
    }

    // Логирование для мониторинга
    console.log(`Успешная аутентификация Telegram пользователя: ${telegramUserId}, ${isNewUser ? 'новый' : 'существующий'} пользователь`);

    // Возвращаем сессию клиенту
    return new Response(
      JSON.stringify({ 
        session: sessionData.session,
        user: {
          id: user.id,
          email: user.email,
          telegram_user_id: telegramUserId,
          is_new_user: isNewUser,
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Неожиданная ошибка в telegram-auth function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Внутренняя ошибка сервера',
        message: 'Не удалось выполнить аутентификацию через Telegram. Попробуйте еще раз.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});