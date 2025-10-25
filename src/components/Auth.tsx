import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, CheckCircle, AlertCircle, Sparkles, ArrowRight, User, TestTube, X, Key, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onAuthSuccess: () => void;
}

/**
 * Компонент аутентификации через Magic Link
 * Обеспечивает вход/регистрацию пользователей через email
 * 
 * ОБНОВЛЕНО: Добавлено поле "Имя" для новых пользователей
 * ИСПРАВЛЕНО: getRedirectUrl теперь всегда возвращает localhost в режиме разработки
 * 
 * Логика работы:
 * 1. Пользователь вводит email и имя (для новых пользователей)
 * 2. Отправляется Magic Link на почту с метаданными
 * 3. После клика по ссылке пользователь автоматически входит
 * 4. Создается профиль в таблице profiles с указанным именем
 */
const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'sent'>('input');

  // НОВЫЕ состояния для тестового входа
  const [showTestModal, setShowTestModal] = useState(false);
  const [testUsername, setTestUsername] = useState('');
  const [testKey, setTestKey] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testError, setTestError] = useState('');

  /**
   * НОВАЯ ФУНКЦИЯ: Обработчик тестового входа
   */
  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestLoading(true);
    setTestError('');

    try {
      console.log('🧪 Попытка тестового входа:', { username: testUsername });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-user-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          username: testUsername.trim(),
          key: testKey.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }

      const { session, user, message } = await response.json();
      
      const { error: sessionError } = await supabase.auth.setSession(session);
      if (sessionError) {
        throw sessionError;
      }

      console.log('✅ Успешный тестовый вход:', message);
      setShowTestModal(false);
      
      // Сбрасываем поля формы
      setTestUsername('');
      setTestKey('');
      setTestError('');
      
      onAuthSuccess();
      
    } catch (err: any) {
      console.error('❌ Ошибка тестового входа:', err);
      
      // Обрабатываем различные типы ошибок
      let errorMessage = 'Произошла ошибка при входе';
      
      if (err.message) {
        if (err.message.includes('Неверные учетные данные')) {
          errorMessage = 'Неверное имя пользователя или ключ доступа';
        } else if (err.message.includes('режима разработки')) {
          errorMessage = 'Тестовый вход доступен только в режиме разработки';
        } else if (err.message.includes('Конфигурация сервера')) {
          errorMessage = 'Сервер не настроен. Обратитесь к администратору';
        } else {
          errorMessage = err.message;
        }
      }
      
      setTestError(errorMessage);
    } finally {
      setIsTestLoading(false);
    }
  };

  /**
   * ИСПРАВЛЕННАЯ ФУНКЦИЯ: Определение корректного URL для редиректа
   * 
   * КРИТИЧЕСКИ ВАЖНО: В режиме разработки ВСЕГДА возвращаем localhost:5173
   * Это гарантирует, что даже если Magic Link был отправлен из продакшн версии,
   * после аутентификации пользователь будет перенаправлен в локальную среду разработки
   * 
   * Логика:
   * 1. Если import.meta.env.DEV === true - возвращаем localhost:5173
   * 2. Иначе определяем URL на основе текущего домена
   */
  const getRedirectUrl = () => {
    // ПРИОРИТЕТ 1: Режим разработки - ВСЕГДА localhost
    if (import.meta.env.DEV) {
      console.log('🔧 Режим разработки: принудительное использование localhost для Magic Link');
      return 'http://localhost:5173';
    }
    
    // ПРИОРИТЕТ 2: Продакшн - определяем автоматически
    const isProduction = window.location.hostname !== 'localhost' && 
                         window.location.hostname !== '127.0.0.1' &&
                         !window.location.hostname.includes('stackblitz') &&
                         !window.location.hostname.includes('webcontainer');
    
    if (isProduction) {
      // В продакшене используем текущий домен
      return `${window.location.origin}`;
    } else {
      // Fallback для других локальных сред
      return 'http://localhost:5173';
    }
  };

  /**
   * ОБНОВЛЕННАЯ ФУНКЦИЯ: Обработчик отправки Magic Link с именем пользователя
   * Теперь включает имя пользователя в метаданные для создания профиля
   * 
   * Пример использования:
   * 1. Пользователь вводит: email="test@example.com", firstName="Иван"
   * 2. Отправляется Magic Link с emailRedirectTo="http://localhost:5173"
   * 3. В user_metadata сохраняется: { first_name: "Иван", username: "Иван" }
   * 4. После клика по ссылке создается профиль с именем "Иван"
   */
  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const redirectUrl = getRedirectUrl();
      console.log('📧 Отправка Magic Link с редиректом на:', redirectUrl);
      console.log('👤 Данные пользователя:', { 
        email: email.trim().toLowerCase(), 
        firstName: firstName.trim() || 'Пользователь' 
      });

      // Отправляем Magic Link через Supabase Auth с метаданными пользователя
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          // КРИТИЧЕСКИ ВАЖНО: URL для редиректа после клика по ссылке
          emailRedirectTo: redirectUrl,
          // НОВОЕ: Дополнительные данные для создания профиля
          data: {
            email: email.trim().toLowerCase(),
            first_name: firstName.trim() || 'Пользователь',
            username: firstName.trim() || email.split('@')[0],
            auth_provider: 'magic_link',
            created_at: new Date().toISOString(),
          }
        },
      });

      if (error) {
        throw error;
      }

      // Успешная отправка
      setStep('sent');
      setMessage('Проверьте вашу почту! Мы отправили ссылку для входа.');
      
    } catch (err: any) {
      console.error('❌ Ошибка при отправке Magic Link:', err);
      setError(
        err.message === 'Invalid email' 
          ? 'Пожалуйста, введите корректный email адрес'
          : err.message || 'Произошла ошибка при отправке ссылки. Попробуйте еще раз.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Сброс формы для повторной отправки
   */
  const resetForm = () => {
    setStep('input');
    setMessage('');
    setError('');
    setEmail('');
    setFirstName('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl max-w-md w-full space-y-6"
      >
        {/* Заголовок с иконкой */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-2xl mb-4"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Добро пожаловать!</h2>
          <p className="text-gray-300">
            {step === 'input' 
              ? 'Войдите или зарегистрируйтесь с помощью Magic Link'
              : 'Ссылка для входа отправлена на вашу почту'
            }
          </p>
        </div>

        {step === 'input' ? (
          /* ОБНОВЛЕННАЯ ФОРМА: Добавлено поле имени */
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleMagicLinkLogin}
            className="space-y-4"
          >
            {/* НОВОЕ ПОЛЕ: Имя пользователя */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Ваше имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={loading}
              />
            </div>

            {/* Поле email */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={loading}
                required
              />
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Send className="w-5 h-5" />
                  </motion.div>
                  <span>Отправляем ссылку...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Получить Magic Link</span>
                </>
              )}
            </motion.button>
          </motion.form>
        ) : (
          /* Экран успешной отправки */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 mb-4"
            >
              <CheckCircle className="w-8 h-8 text-green-400" />
            </motion.div>
            
            <div>
              <h3 className="text-white font-semibold text-lg mb-2">Ссылка отправлена!</h3>
              <p className="text-gray-300 text-sm mb-4">
                Проверьте почту <span className="text-blue-400 font-medium">{email}</span> и перейдите по ссылке для входа
              </p>
              
              {/* ОБНОВЛЕНО: Показываем имя пользователя если указано */}
              {firstName && (
                <p className="text-gray-300 text-sm mb-4">
                  Привет, <span className="text-purple-400 font-medium">{firstName}</span>! 👋
                </p>
              )}
              
              {/* ОБНОВЛЕННАЯ ИНФОРМАЦИЯ: Показываем куда будет редирект */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4">
                <p className="text-blue-300 text-xs">
                  После клика по ссылке вы будете перенаправлены на:<br />
                  <span className="font-mono text-blue-400">{getRedirectUrl()}</span>
                </p>
                {import.meta.env.DEV && (
                  <p className="text-green-400 text-xs mt-2">
                    ✅ Режим разработки: гарантированный редирект на localhost
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={resetForm}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors text-gray-300 hover:text-white flex items-center justify-center space-x-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Отправить на другой email</span>
              </button>
            </div>
          </motion.div>
        )}
        {/* НОВАЯ КНОПКА: Войти как тестер */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowTestModal(true)}
          className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2"
        >
          <TestTube className="w-5 h-5" />
          <span>Войти как тестер</span>
        </motion.button>

        {/* Сообщения об успехе */}
        {message && step === 'sent' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4 flex items-center space-x-3"
          >
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-sm">{message}</p>
          </motion.div>
        )}

        {/* Сообщения об ошибках */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 flex items-center space-x-3"
          >
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Информация о Magic Link */}
        {step === 'input' && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
            <h4 className="text-white font-medium mb-2">🔗 Что такое Magic Link?</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Безопасный вход без пароля</li>
              <li>• Ссылка действует 1 час</li>
              <li>• Автоматическая регистрация новых пользователей</li>
              <li>• Проверьте папку "Спам" если письмо не пришло</li>
            </ul>
          </div>
        )}

        {/* НОВАЯ ИНФОРМАЦИЯ: Подсказка о поле имени */}
        {step === 'input' && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
            <h4 className="text-white font-medium mb-2">👤 Зачем нужно имя?</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Персонализация интерфейса приложения</li>
              <li>• Создание профессиональных сопроводительных писем</li>
              <li>• Улучшение пользовательского опыта</li>
              <li>• Можно изменить позже в настройках профиля</li>
            </ul>
          </div>
        )}

      </motion.div>

      {/* НОВОЕ: Модальное окно для тестового входа */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 max-w-md w-full"
          >
            {/* Заголовок модального окна */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-green-500/20">
                  <TestTube className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Тестовый вход</h3>
                  <p className="text-gray-400 text-sm">Введите учетные данные тестера</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestError('');
                  setTestUsername('');
                  setTestKey('');
                }}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Форма тестового входа */}
            <form onSubmit={handleTestLogin} className="space-y-4">
              {/* Поле имени пользователя */}
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Имя пользователя"
                  value={testUsername}
                  onChange={(e) => setTestUsername(e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  disabled={isTestLoading}
                  required
                />
              </div>

              {/* Поле ключа */}
              <div className="relative">
                <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="Ключ доступа"
                  value={testKey}
                  onChange={(e) => setTestKey(e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  disabled={isTestLoading}
                  required
                />
              </div>

              {/* Кнопка входа */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isTestLoading || !testUsername.trim() || !testKey.trim()}
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
              >
                {isTestLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <TestTube className="w-5 h-5" />
                    </motion.div>
                    <span>Проверяем...</span>
                  </>
                ) : (
                  <>
                    <TestTube className="w-5 h-5" />
                    <span>Войти</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Ошибки тестового входа */}
            {testError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h4 className="text-red-400 font-medium">Ошибка входа</h4>
                </div>
                <p className="text-red-300 text-sm">{testError}</p>
              </div>
            )}

            {/* Список тестовых аккаунтов */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mt-4">
              <h4 className="text-white font-medium mb-3">🧪 Тестовые аккаунты:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                  <span className="text-green-300 font-mono">tester1</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-300 font-mono">test123</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                  <span className="text-green-300 font-mono">tester2</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-300 font-mono">demo456</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                  <span className="text-green-300 font-mono">admin</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-300 font-mono">admin789</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                  <span className="text-green-300 font-mono">demo</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-300 font-mono">demo2024</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Auth;