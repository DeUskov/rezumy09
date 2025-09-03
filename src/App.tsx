import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import { useTelegram } from './hooks/useTelegram';
import { supabase } from './lib/supabase';

// Типы для состояния приложения
interface AppState {
  isFirstTime: boolean;
  currentStep: 'auth' | 'onboarding' | 'dashboard';
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

/**
 * Главный компонент приложения JobMatch AI
 * 
 * РЕЖИМ РАЗРАБОТКИ: Аутентификация временно деактивирована
 * 
 * Логика работы в dev-режиме:
 * 1. Сразу устанавливаем фиктивного пользователя
 * 2. Переходим напрямую к дашборду
 * 3. Пропускаем все проверки аутентификации
 * 4. Используем тестовые данные для разработки
 * 
 * Для включения аутентификации обратно:
 * - Измените DEV_MODE_SKIP_AUTH на false
 * - Раскомментируйте закомментированные useEffect
 */
function App() {
  // 🔧 РЕЖИМ РАЗРАБОТКИ: Флаг для пропуска аутентификации
  const DEV_MODE_SKIP_AUTH = true;

  const { tg, user: telegramUser } = useTelegram();
  
  // 🔧 ФИКТИВНЫЕ ДАННЫЕ для разработки
  const mockUser = {
    id: 'cdba5822-f73a-4a66-a342-7ccaa39fa406',
    firstName: 'Разработчик',
    lastName: 'Тестовый'
  };

  // Состояние приложения с начальными значениями для dev-режима
  const [appState, setAppState] = useState<AppState>({
    isFirstTime: DEV_MODE_SKIP_AUTH ? false : true, // Пропускаем онбординг в dev-режиме
    currentStep: DEV_MODE_SKIP_AUTH ? 'dashboard' : 'auth', // Сразу к дашборду
    user: DEV_MODE_SKIP_AUTH ? mockUser : null // Фиктивный пользователь
  });

  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(!DEV_MODE_SKIP_AUTH); // Не показываем загрузку в dev-режиме

  // Инициализация Telegram WebApp (оставляем для совместимости)
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.MainButton.hide();
      
      // Настройки для лучшего UX в Telegram
      tg.setHeaderColor('#000000');
      tg.setBackgroundColor('#000000');
    }
  }, [tg]);

  // 🔧 ДЕАКТИВИРОВАННАЯ ЛОГИКА АУТЕНТИФИКАЦИИ
  // Закомментировано для режима разработки
  /*
  const authenticateWithTelegram = async (telegramUser: any, initData: string) => {
    try {
      console.log('Начинаем аутентификацию через Telegram для пользователя:', telegramUser.id);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          telegramUserId: telegramUser.id,
          initData: initData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка аутентификации Telegram');
      }

      const { session, user } = await response.json();
      
      const { error: sessionError } = await supabase.auth.setSession(session);
      if (sessionError) {
        throw sessionError;
      }

      console.log('Успешная аутентификация через Telegram:', user.id);
      return true;
      
    } catch (error) {
      console.error('Ошибка аутентификации через Telegram:', error);
      return false;
    }
  };

  const createDevUser = async () => {
    try {
      console.log('🔧 Режим разработки: создание тестового пользователя через Edge Function');
      
      const devEmail = 'dev@mailinator.com';
      const devPassword = 'dev123456';
      const userData = {
        firstName: 'Разработчик',
        lastName: 'Тестовый',
        username: 'dev_user'
      };
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-dev-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          devEmail,
          devPassword,
          userData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка создания тестового пользователя');
      }

      const { session, user, message } = await response.json();
      
      const { error: sessionError } = await supabase.auth.setSession(session);
      if (sessionError) {
        throw sessionError;
      }

      console.log('✅ Тестовый пользователь настроен:', message);
      console.log('✅ Пользователь:', user.email, 'Email подтвержден:', user.email_confirmed);
      return true;
      
    } catch (error) {
      console.error('Ошибка создания/входа тестового пользователя:', error);
      return false;
    }
  };
  */

  // 🔧 УПРОЩЕННАЯ ИНИЦИАЛИЗАЦИЯ для dev-режима
  useEffect(() => {
    if (DEV_MODE_SKIP_AUTH) {
      console.log('🔧 РЕЖИМ РАЗРАБОТКИ: Аутентификация деактивирована');
      console.log('👤 Используется фиктивный пользователь:', mockUser);
      setIsAuthenticating(false);
      return;
    }

    // Оригинальная логика инициализации (закомментирована)
    /*
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Ошибка получения сессии:', error);
        }

        if (session?.user) {
          console.log('Найдена существующая сессия:', session.user.id);
          setSupabaseUser(session.user);
        } else if (import.meta.env.DEV) {
          console.log('🔧 Режим разработки: автоматический вход временно отключен');
          console.log('Используйте форму Magic Link для входа');
        } else if (telegramUser && telegramUser.id !== 'demo_user' && tg?.initData) {
          console.log('Попытка аутентификации через Telegram...');
          const success = await authenticateWithTelegram(telegramUser, tg.initData);
          
          if (!success) {
            console.log('Аутентификация через Telegram не удалась, показываем форму входа');
          }
        }
        
      } catch (error) {
        console.error('Ошибка инициализации аутентификации:', error);
      } finally {
        setIsAuthenticating(false);
      }
    };

    if (telegramUser || !tg) {
      initializeAuth();
    }
    */
  }, [DEV_MODE_SKIP_AUTH, mockUser]);

  // 🔧 ДЕАКТИВИРОВАННЫЙ слушатель изменений аутентификации
  /*
  useEffect(() => {
    if (DEV_MODE_SKIP_AUTH) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Изменение состояния аутентификации:', event, session?.user?.id);
      
      setSupabaseUser(session?.user || null);
      
      if (session?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, second_name')
            .eq('user_id', session.user.id)
            .single();

          let firstName = 'Пользователь';
          let lastName = '';

          if (profile && !profileError) {
            firstName = profile.username || 'Пользователь';
            lastName = profile.second_name || '';
          } else {
            firstName = session.user.user_metadata?.first_name || 
                       session.user.email?.split('@')[0] || 
                       'Пользователь';
            lastName = session.user.user_metadata?.last_name || '';
          }

          const userData = {
            id: session.user.id,
            firstName,
            lastName,
          };
          
          setAppState(prev => ({ ...prev, user: userData }));
          
          const hasCompletedOnboarding = localStorage.getItem('jobmatch-onboarding-complete');
          if (hasCompletedOnboarding) {
            setAppState(prev => ({
              ...prev,
              isFirstTime: false,
              currentStep: 'dashboard'
            }));
          } else {
            setAppState(prev => ({
              ...prev,
              currentStep: 'onboarding'
            }));
          }
        } catch (error) {
          console.error('Ошибка получения профиля пользователя:', error);
          const userData = {
            id: session.user.id,
            firstName: session.user.user_metadata?.first_name || 
                      session.user.email?.split('@')[0] || 
                      'Пользователь',
            lastName: session.user.user_metadata?.last_name || '',
          };
          setAppState(prev => ({ ...prev, user: userData }));
        }
      } else {
        setAppState(prev => ({
          ...prev,
          user: null,
          currentStep: 'auth'
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, [DEV_MODE_SKIP_AUTH]);
  */

  // 🔧 ДЕАКТИВИРОВАННАЯ логика связывания Telegram аккаунта
  /*
  useEffect(() => {
    if (DEV_MODE_SKIP_AUTH) return;

    const linkTelegramAccount = async () => {
      if (supabaseUser && telegramUser && telegramUser.id !== 'demo_user') {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('telegram_user_id')
            .eq('user_id', supabaseUser.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Ошибка при получении профиля для связывания:', error);
            return;
          }

          if (!profile || profile.telegram_user_id !== parseInt(telegramUser.id)) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                telegram_user_id: parseInt(telegramUser.id),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', supabaseUser.id);

            if (updateError) {
              console.error('Ошибка при связывании Telegram аккаунта:', updateError);
            } else {
              console.log('Telegram аккаунт успешно связан с профилем!');
            }
          }
        } catch (error) {
          console.error('Ошибка связывания Telegram аккаунта:', error);
        }
      }
    };

    linkTelegramAccount();
  }, [supabaseUser, telegramUser, DEV_MODE_SKIP_AUTH]);
  */

  // Обработчик завершения онбординга (оставляем для совместимости)
  const handleOnboardingComplete = () => {
    localStorage.setItem('jobmatch-onboarding-complete', 'true');
    setAppState(prev => ({ 
      ...prev, 
      isFirstTime: false, 
      currentStep: 'dashboard' 
    }));
  };

  // Обработчик успешной аутентификации (оставляем для совместимости)
  const handleAuthSuccess = () => {
    console.log('Аутентификация успешна, ожидаем обновления состояния...');
  };

  // 🔧 УПРОЩЕННАЯ логика показа загрузки
  if (isAuthenticating && !DEV_MODE_SKIP_AUTH) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900/40 to-black/80"></div>
        <div className="fixed inset-0 backdrop-blur-3xl"></div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
          />
          <h2 className="text-white text-xl font-semibold mb-2">JobMatch AI</h2>
          <p className="text-gray-300">Инициализация приложения...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Фоновые эффекты в стиле iPad OS */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900/40 to-black/80"></div>
      <div className="fixed inset-0 backdrop-blur-3xl"></div>
      
      {/* 🔧 РЕЖИМ РАЗРАБОТКИ: Индикатор деактивированной аутентификации */}
      {DEV_MODE_SKIP_AUTH && (
        <div className="fixed top-4 left-4 z-50 bg-yellow-500/20 border border-yellow-500/40 rounded-xl px-3 py-2">
          <p className="text-yellow-400 text-xs font-medium">
            🔧 DEV MODE: Auth Disabled
          </p>
        </div>
      )}
      
      {/* Основной контент */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {DEV_MODE_SKIP_AUTH ? (
            /* 🔧 РЕЖИМ РАЗРАБОТКИ: Сразу показываем дашборд */
            <motion.div
              key="dev-dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <Dashboard user={appState.user} />
            </motion.div>
          ) : (
            /* Оригинальная логика для продакшена */
            <>
              {!supabaseUser ? (
                /* Экран аутентификации */
                <motion.div
                  key="auth"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Auth onAuthSuccess={handleAuthSuccess} />
                </motion.div>
              ) : appState.currentStep === 'onboarding' ? (
                /* Экран онбординга */
                <motion.div
                  key="onboarding"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Onboarding onComplete={handleOnboardingComplete} />
                </motion.div>
              ) : (
                /* Основное приложение */
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <Dashboard user={appState.user} />
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;