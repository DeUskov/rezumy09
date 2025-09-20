import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Search, CheckCircle, AlertCircle, ExternalLink, Loader2, MapPin, Building, Briefcase, Clock, Edit3, X } from 'lucide-react';

interface JobAnalysisProps {
  onAnalysisComplete: (analysisData: any) => void;
  savedAnalysis: any;
}

/**
 * НОВАЯ ФУНКЦИЯ: Валидация URL вакансии
 * 
 * Проверяет, что введенный URL принадлежит одному из поддерживаемых сайтов
 * и имеет корректный формат
 * 
 * Поддерживаемые сайты:
 * - HeadHunter (hh.ru, hh.kz, hh.by и другие домены)
 * - LinkedIn (linkedin.com)
 * - Djinni (djinni.co)
 * - Habr Career (career.habr.com)
 * - SuperJob (superjob.ru)
 * - Work.ua (work.ua)
 * - Rabota.ua (rabota.ua)
 * - Jobs.ua (jobs.ua)
 * 
 * @param url - URL для валидации
 * @returns объект с результатом валидации и сообщением об ошибке
 */
const validateJobUrl = (url: string): { isValid: boolean; error?: string; detectedSite?: string } => {
  // Проверяем, что URL не пустой
  if (!url || url.trim().length === 0) {
    return {
      isValid: false,
      error: 'Введите URL вакансии'
    };
  }

  const trimmedUrl = url.trim();

  // Проверяем базовый формат URL
  let parsedUrl: URL;
  try {
    // Добавляем https:// если протокол не указан
    const urlToCheck = trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`;
    parsedUrl = new URL(urlToCheck);
  } catch (error) {
    return {
      isValid: false,
      error: 'Некорректный формат URL. Пример: https://hh.ru/vacancy/123456'
    };
  }

  // Список поддерживаемых доменов с их названиями
  const supportedSites = [
    // HeadHunter (различные домены)
    { domains: ['hh.ru', 'hh.kz', 'hh.by', 'hh.uz', 'hh.kg'], name: 'HeadHunter', pathPattern: /\/vacancy\/\d+/ },
    
    // LinkedIn
    { domains: ['linkedin.com', 'www.linkedin.com'], name: 'LinkedIn', pathPattern: /\/jobs\/view\/\d+/ },
    
    // Djinni
    { domains: ['djinni.co', 'www.djinni.co'], name: 'Djinni', pathPattern: /\/jobs\/\d+/ },
    
    // Habr Career
    { domains: ['career.habr.com'], name: 'Habr Career', pathPattern: /\/vacancies\/\d+/ },
    
    // SuperJob
    { domains: ['superjob.ru', 'www.superjob.ru'], name: 'SuperJob', pathPattern: /\/vakansii\// },
    
    // Украинские сайты
    { domains: ['work.ua', 'www.work.ua'], name: 'Work.ua', pathPattern: /\/jobs\/\d+/ },
    { domains: ['rabota.ua', 'www.rabota.ua'], name: 'Rabota.ua', pathPattern: /\/company\d+\/vacancy\d+/ },
    { domains: ['jobs.ua', 'www.jobs.ua'], name: 'Jobs.ua', pathPattern: /\/vacancy\// },
    
    // Можно добавить другие сайты по мере необходимости
  ];

  // Проверяем домен
  const hostname = parsedUrl.hostname.toLowerCase();
  const matchedSite = supportedSites.find(site => 
    site.domains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))
  );

  if (!matchedSite) {
    return {
      isValid: false,
      error: `Сайт "${hostname}" не поддерживается. Используйте один из поддерживаемых сайтов.`
    };
  }

  // Дополнительная проверка пути для некоторых сайтов
  const pathname = parsedUrl.pathname;
  if (matchedSite.pathPattern && !matchedSite.pathPattern.test(pathname)) {
    return {
      isValid: false,
      error: `Некорректный формат ссылки для ${matchedSite.name}. Убедитесь, что это прямая ссылка на вакансию.`
    };
  }

  // Проверяем, что URL использует HTTPS (рекомендуется)
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return {
      isValid: false,
      error: 'URL должен использовать протокол HTTP или HTTPS'
    };
  }

  return {
    isValid: true,
    detectedSite: matchedSite.name
  };
};

/**
 * НОВАЯ ФУНКЦИЯ: Гибкий парсинг данных вакансии
 * 
 * Извлекает только ключевые поля из ответа API:
 * - title (job_title)
 * - skills: { hard_skills, soft_skills, languages }
 * 
 * Если поле отсутствует - оставляет пустым массив/строку
 * 
 * @param rawData - сырые данные от API
 * @returns объект с базовыми полями вакансии
 */
const parseJobDataFlexibly = (rawData: any) => {
  console.log('🔍 Гибкий парсинг данных вакансии:', rawData);
  
  // ИСПРАВЛЕНИЕ: Извлекаем вложенный объект job_data если он есть
  const actualJobData = rawData?.job_data || rawData;
  console.log('🔍 Фактические данные для парсинга (после извлечения job_data):', actualJobData);
  
  // Извлекаем title из actualJobData
  const title = actualJobData?.job_title || actualJobData?.title || '';
  
  // Извлекаем навыки
  const skills = {
    hard_skills: Array.isArray(actualJobData?.skills?.hard_skills) ? actualJobData.skills.hard_skills : 
                 Array.isArray(actualJobData?.required_skills) ? actualJobData.required_skills : [],
    soft_skills: Array.isArray(actualJobData?.skills?.soft_skills) ? actualJobData.skills.soft_skills : [],
    languages: Array.isArray(actualJobData?.skills?.languages) ? actualJobData.skills.languages : []
  };
  
  // Сохраняем остальные поля для совместимости
  const parsedData = {
    job_title: title,
    title: title, // Дублируем для совместимости
    skills: skills,
    // Сохраняем остальные поля из actualJobData
    company_name: actualJobData?.company_name || '',
    location: actualJobData?.location || {},
    employment_type: actualJobData?.employment_type || '',
    experience_level: actualJobData?.experience_level || '',
    industry: actualJobData?.industry || '',
    description: actualJobData?.description || '',
    required_skills: skills.hard_skills // Для обратной совместимости
  };
  
  console.log('✅ Результат гибкого парсинга:', parsedData);
  return parsedData;
};
/**
 * НОВОЕ: Анимированные сообщения для этапов анализа вакансии
 * Каждое сообщение отображается последовательно с задержкой
 */
const LOADING_MESSAGES = [
  { id: 1, text: "Отправляем данные...", delay: 0 },
  { id: 2, text: "Обрабатываем информацию...", delay: 3000 },
  { id: 3, text: "Генерируем результат...", delay: 6000 },
  { id: 4, text: "Получаем результат", delay: 9000 }
];

/**
 * Генерация тестового user_id в формате ddmmyy_hhmm для dev режима
 * 
 * Пример: 25 декабря 2024, 14:30 → "251224_1430"
 * 
 * @returns строка в формате ddmmyy_hhmm
 */
const generateDevUserId = (): string => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2);
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  return `${day}${month}${year}_${hours}${minutes}`;
};

/**
 * ОБНОВЛЕННЫЙ компонент анализа вакансий
 * 
 * Новая логика работы с API:
 * 1. Пользователь вводит URL вакансии
 * 2. Отправляем POST запрос с vacancy_url и user_id
 * 3. Получаем JSON с данными вакансии
 * 4. Отображаем извлеченную информацию
 * 
 * Поддерживаемые поля API:
 * - company_name: название компании
 * - employment_type: тип занятости
 * - experience_level: уровень опыта
 * - industry: отрасль
 * - job_title: название должности
 * - location: { city, country }
 * - required_skills: массив навыков
 */
const JobAnalysis: React.FC<JobAnalysisProps> = ({ onAnalysisComplete, savedAnalysis }) => {
  const [jobUrl, setJobUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(savedAnalysis);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState({
    title: '',
    hard_skills: [] as string[],
    soft_skills: [] as string[],
    languages: [] as string[]
  });
  
  // НОВОЕ: Состояние для уведомления о сохранении
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  
  // НОВОЕ: Состояние для анимированных сообщений
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);

  // Генерируем user_id при монтировании компонента
  useEffect(() => {
    const userId = generateDevUserId();
    setCurrentUserId(userId);
    console.log('🔧 Сгенерирован тестовый user_id для анализа вакансии:', userId);
  }, []);

  // Восстанавливаем сохраненные данные при монтировании
  useEffect(() => {
    if (savedAnalysis && !analysisResult) {
      setAnalysisResult(savedAnalysis);
      // Заполняем редактируемые поля
      setEditableData({
        title: savedAnalysis.job_title || savedAnalysis.title || '',
        hard_skills: savedAnalysis.skills?.hard_skills || savedAnalysis.required_skills || [],
        soft_skills: savedAnalysis.skills?.soft_skills || [],
        languages: savedAnalysis.skills?.languages || []
      });
    }
  }, [savedAnalysis, analysisResult]);

  /**
   * НОВЫЙ ЭФФЕКТ: Управление анимированными сообщениями
   * Запускается при начале анализа и показывает сообщения последовательно
   */
  useEffect(() => {
    if (!isAnalyzing) {
      // Сбрасываем состояние сообщений когда анализ завершен
      setCurrentMessageIndex(0);
      setVisibleMessages([]);
      return;
    }

    // Запускаем таймеры для показа сообщений
    const timers: NodeJS.Timeout[] = [];

    LOADING_MESSAGES.forEach((message, index) => {
      const timer = setTimeout(() => {
        setCurrentMessageIndex(index);
        setVisibleMessages(prev => [...prev, message.id]);
      }, message.delay);
      
      timers.push(timer);
    });

    // Очищаем таймеры при размонтировании или изменении состояния
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isAnalyzing]);

  /**
   * ОБНОВЛЕННАЯ ФУНКЦИЯ: Гибкий анализ вакансии через API
   * 
   * Логика работы:
   * 1. Отправляем POST запрос с JSON body: { vacancy_url, user_id }
   * 2. Получаем JSON ответ и парсим гибко
   * 3. Если данных нет - оставляем поля пустыми для ручного заполнения
   * 
   * @param url - URL вакансии для анализа
   * @param userId - идентификатор пользователя
   */
  const analyzeJobVacancy = async (url: string, userId: string) => {
    setError(null);
    setIsAnalyzing(true);

    try {
      console.log('📤 Отправка вакансии на анализ:', {
        vacancy_url: url,
        user_id: userId,
        endpoint: 'https://77xihg.buildship.run2_vacancy_upload'
      });

      // Отправляем запрос на эндпоинт загрузки вакансии
      const response = await fetch('https://77xihg.buildship.run2_vacancy_upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vacancy_url: url.trim(),
          user_id: userId
        }),
      });

      console.log('🌐 Получен ответ от API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Ошибка API (response not ok):', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Ошибка API: ${response.status} - ${errorText}`);
      }

      // Парсим JSON ответ
      const data = await response.json();
      console.log('📥 Сырые данные от API (полный объект):', data);
      console.log('📥 Размер данных от API:', JSON.stringify(data).length, 'символов');
      
      // НОВОЕ: Гибкий парсинг данных
      const parsedData = parseJobDataFlexibly(data);
      console.log('🔄 Результат parseJobDataFlexibly:', parsedData);
      console.log('🔄 Проверка ключевых полей после парсинга:');
      console.log('  - job_title:', parsedData.job_title);
      console.log('  - company_name:', parsedData.company_name);
      console.log('  - skills.hard_skills:', parsedData.skills?.hard_skills);
      console.log('  - skills.soft_skills:', parsedData.skills?.soft_skills);
      console.log('  - location:', parsedData.location);
      
      console.log('💾 Вызываем setAnalysisResult с данными:', parsedData);
      setAnalysisResult(parsedData);
      
      // Заполняем редактируемые поля
      const newEditableData = {
        title: parsedData.job_title || '',
        hard_skills: parsedData.skills?.hard_skills || [],
        soft_skills: parsedData.skills?.soft_skills || [],
        languages: parsedData.skills?.languages || []
      };
      console.log('📝 Устанавливаем editableData:', newEditableData);
      setEditableData({
        title: parsedData.job_title || '',
        hard_skills: parsedData.skills?.hard_skills || [],
        soft_skills: parsedData.skills?.soft_skills || [],
        languages: parsedData.skills?.languages || []
      });
      
      console.log('🔄 Завершаем анализ: setIsAnalyzing(false)');
      setIsAnalyzing(false);
      
      // Передаем данные в родительский компонент
      console.log('📤 Передаем данные в родительский компонент через onAnalysisComplete');
      onAnalysisComplete(parsedData);
      
      console.log('✅ Анализ вакансии завершен успешно!');
      
    } catch (err: any) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА в analyzeJobVacancy:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        fullError: err
      });
      
      const userError = `Не удалось проанализировать вакансию: ${err.message}`;
      console.error('❌ Устанавливаем error для пользователя:', userError);
      setError(userError);
      
      console.log('🔄 Завершаем анализ с ошибкой: setIsAnalyzing(false)');
      setIsAnalyzing(false);
      
      // НОВОЕ: При ошибке создаем пустую структуру для ручного заполнения
      const emptyData = {
        job_title: '',
        title: '',
        company_name: '',
        skills: {
          hard_skills: [],
          soft_skills: [],
          languages: []
        },
        location: {},
        employment_type: '',
        experience_level: '',
        industry: '',
        description: '',
        required_skills: []
      };
      
      setAnalysisResult(emptyData);
      setEditableData({
        title: '',
        hard_skills: [],
        soft_skills: [],
        languages: []
      });
      setIsEditing(true); // Автоматически включаем режим редактирования при ошибке
    }
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Сохранение отредактированных данных
   */
  const handleSaveEdits = () => {
    const updatedData = {
      ...analysisResult,
      job_title: editableData.title,
      title: editableData.title,
      skills: {
        hard_skills: editableData.hard_skills,
        soft_skills: editableData.soft_skills,
        languages: editableData.languages
      },
      required_skills: editableData.hard_skills
    };
    
    setAnalysisResult(updatedData);
    onAnalysisComplete(updatedData);
    setIsEditing(false);
    
    // НОВОЕ: Показываем уведомление о сохранении
    setShowSaveNotification(true);
    setTimeout(() => {
      setShowSaveNotification(false);
    }, 3000);
    
    console.log('✅ Сохранены отредактированные данные:', updatedData);
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Добавление навыка
   */
  const addSkill = (category: 'hard_skills' | 'soft_skills' | 'languages', skill: string) => {
    if (skill.trim()) {
      setEditableData(prev => ({
        ...prev,
        [category]: [...prev[category], skill.trim()]
      }));
    }
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Удаление навыка
   */
  const removeSkill = (category: 'hard_skills' | 'soft_skills' | 'languages', index: number) => {
    setEditableData(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };
  // Обработчик анализа вакансии
  const handleAnalyze = async () => {
    if (!jobUrl.trim()) return;

    // Проверяем URL перед отправкой запроса
    const validation = validateJobUrl(jobUrl);
    if (!validation.isValid) {
      setError(validation.error || 'Некорректный URL вакансии');
      return;
    }

    console.log('✅ URL валидация пройдена:', {
      url: jobUrl.trim(),
      detectedSite: validation.detectedSite
    });

    await analyzeJobVacancy(jobUrl.trim(), currentUserId);
  };

  // Сброс анализа для новой вакансии - ИСПРАВЛЕННАЯ ФУНКЦИЯ
  const resetAnalysis = () => {
    // Полностью очищаем все состояния
    setAnalysisResult(null);
    setJobUrl('');
    setError(null);
    setIsAnalyzing(false);
    setIsEditing(false);
    setEditableData({
      title: '',
      hard_skills: [],
      soft_skills: [],
      languages: []
    });
    
    // Сбрасываем анимированные сообщения
    setCurrentMessageIndex(0);
    setVisibleMessages([]);
    
    // Генерируем новый user_id для следующего анализа
    const newUserId = generateDevUserId();
    setCurrentUserId(newUserId);
    console.log('🔧 Сгенерирован новый user_id для анализа вакансии:', newUserId);
    
    // Уведомляем родительский компонент об очистке данных
    // Передаем null чтобы сбросить сохраненные данные
    onAnalysisComplete(null);
  };

  return (
    <div className="space-y-6">
      {/* НОВОЕ: Единый стиль уведомления о сохранении */}
      {showSaveNotification && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          transition={{ 
            type: "spring", 
            stiffness: 500, 
            damping: 30,
            duration: 0.3 
          }}
          className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-green-500/90 backdrop-blur-xl border border-green-400/30 rounded-2xl px-6 py-4 shadow-2xl"
        >
          <div className="flex items-center space-x-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 600, damping: 25 }}
            >
              <CheckCircle className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <p className="text-white font-semibold">Изменения сохранены!</p>
              <p className="text-green-100 text-sm">Данные вакансии обновлены</p>
            </div>
          </div>
          
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-green-300 rounded-b-2xl"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 3, ease: "linear" }}
          />
        </motion.div>
      )}

      {/* Заголовок */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Анализ вакансии</h2>
        <p className="text-gray-300">
          Вставьте ссылку на интересную вакансию из любого сайта
        </p>
      </div>

      {/* 🔧 DEV INFO: Показываем текущий user_id и эндпоинт */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Clock className="w-4 h-4 text-yellow-400" />
          <h3 className="text-yellow-400 font-medium text-sm">🔧 Dev Mode Info</h3>
        </div>
        <div className="text-yellow-300 text-xs space-y-1">
          <p>• User ID: <span className="font-mono bg-yellow-500/20 px-2 py-1 rounded">{currentUserId}</span></p>
          <p>• Эндпоинт: <span className="font-mono">https://77xihg.buildship.run2_vacancy_upload</span></p>
          <p>• Формат: JSON (vacancy_url: text, user_id: text)</p>
        </div>
      </div>

      {/* Поле ввода URL - показываем только если нет результата */}
      {!analysisResult && (
        <div className="space-y-4">
          {/* НОВОЕ: Информация о валидации URL */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
            <h3 className="text-blue-400 font-medium mb-2">🔗 Поддерживаемые форматы ссылок:</h3>
            <div className="text-blue-300 text-sm space-y-1">
              <p>• <strong>HeadHunter:</strong> https://hh.ru/vacancy/123456</p>
              <p>• <strong>LinkedIn:</strong> https://linkedin.com/jobs/view/123456</p>
              <p>• <strong>Djinni:</strong> https://djinni.co/jobs/123456</p>
              <p>• <strong>Habr Career:</strong> https://career.habr.com/vacancies/123456</p>
              <p>• <strong>SuperJob:</strong> https://superjob.ru/vakansii/...</p>
              <p>• <strong>Work.ua:</strong> https://work.ua/jobs/123456</p>
            </div>
          </div>

          <div className="relative">
            <Link2 className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://hh.ru/vacancy/123456"
              className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              disabled={isAnalyzing}
            />
          </div>

          {/* НОВОЕ: Динамическая валидация при вводе */}
          {jobUrl.trim() && (
            <div className="text-sm">
              {(() => {
                const validation = validateJobUrl(jobUrl);
                if (validation.isValid) {
                  return (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>✅ {validation.detectedSite} - URL корректен</span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex items-center space-x-2 text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>{validation.error}</span>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAnalyze}
            disabled={!jobUrl.trim() || isAnalyzing || !validateJobUrl(jobUrl).isValid}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
          >
            {isAnalyzing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Search className="w-5 h-5" />
                </motion.div>
                <span>Анализируем вакансию...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Анализировать вакансию</span>
              </>
            )}
          </motion.button>
        </div>
      )}

      {/* НОВЫЙ БЛОК: Анимированный прогресс анализа с последовательными сообщениями */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6"
        >
          {/* Заголовок с анимированным спиннером */}
          <div className="flex items-center justify-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mr-3"
            >
              <Loader2 className="w-8 h-8 text-blue-400" />
            </motion.div>
            <h3 className="text-white font-semibold text-lg">Анализируем вакансию</h3>
          </div>

          {/* Анимированные сообщения */}
          <div className="space-y-4">
            <AnimatePresence>
              {LOADING_MESSAGES.map((message, index) => {
                const isVisible = visibleMessages.includes(message.id);
                const isCurrent = currentMessageIndex === index;
                const isCompleted = currentMessageIndex > index;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-500 ${
                      isCurrent 
                        ? 'bg-blue-500/20 border border-blue-500/30' 
                        : isCompleted
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    {/* Индикатор состояния */}
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        </motion.div>
                      ) : isCurrent ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 className="w-5 h-5 text-blue-400" />
                        </motion.div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-500" />
                      )}
                    </div>

                    {/* Текст сообщения */}
                    <motion.span
                      className={`font-medium transition-colors duration-300 ${
                        isCurrent 
                          ? 'text-blue-300' 
                          : isCompleted
                          ? 'text-green-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {message.text}
                    </motion.span>

                    {/* Анимированные точки для текущего сообщения */}
                    {isCurrent && (
                      <motion.div
                        className="flex space-x-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        {[0, 1, 2].map((dot) => (
                          <motion.div
                            key={dot}
                            className="w-1 h-1 bg-blue-400 rounded-full"
                            animate={{ 
                              scale: [1, 1.5, 1],
                              opacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: dot * 0.2
                            }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Прогресс-бар */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Прогресс</span>
              <span>{Math.round(((currentMessageIndex + 1) / LOADING_MESSAGES.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentMessageIndex + 1) / LOADING_MESSAGES.length) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* ОБНОВЛЕННЫЙ: Результат анализа с новыми полями API */}
      {analysisResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Заголовок результата */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span className="text-green-400 font-medium">Вакансия проанализирована!</span>
            </div>
            {/* ИСПРАВЛЕННАЯ КНОПКА - теперь вызывает resetAnalysis */}
            <button
              onClick={resetAnalysis}
              className="text-blue-400 hover:text-blue-300 text-sm underline transition-colors"
            >
              Анализировать другую
            </button>
          </div>

          {/* НОВАЯ КАРТОЧКА: Информация о вакансии с полями из API */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6">
            <div className="space-y-6">
              {/* Основная информация о вакансии */}
              <div className="space-y-4">
                {/* Название должности и компания */}
                <div>
                  <h3 className="text-white font-semibold text-xl mb-2">
                    {analysisResult.job_title || 'Название должности'}
                  </h3>
                  <div className="flex items-center space-x-2 text-green-400">
                    <Building className="w-4 h-4" />
                    <span className="font-medium">{analysisResult.company_name || 'Название компании'}</span>
                  </div>
                </div>

                {/* Локация */}
                {analysisResult.location && (
                  <div className="flex items-center space-x-2 text-gray-300">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {analysisResult.location.city && analysisResult.location.country 
                        ? `${analysisResult.location.city}, ${analysisResult.location.country}`
                        : analysisResult.location.city || analysisResult.location.country || 'Локация не указана'
                      }
                    </span>
                  </div>
                )}

                {/* Дополнительная информация в сетке */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {/* Тип занятости */}
                  {analysisResult.employment_type && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Briefcase className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400 text-sm font-medium">Тип занятости</span>
                      </div>
                      <p className="text-white text-sm">{analysisResult.employment_type}</p>
                    </div>
                  )}

                  {/* Уровень опыта */}
                  {analysisResult.experience_level && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400 text-sm font-medium">Опыт</span>
                      </div>
                      <p className="text-white text-sm">{analysisResult.experience_level}</p>
                    </div>
                  )}

                  {/* Отрасль */}
                  {analysisResult.industry && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Building className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm font-medium">Отрасль</span>
                      </div>
                      <p className="text-white text-sm">{analysisResult.industry}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Заголовок с кнопкой редактирования */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">📋 Данные вакансии</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-colors text-sm text-blue-300 flex items-center space-x-1"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{isEditing ? 'Сохранить' : 'Редактировать'}</span>
                </button>
              </div>

              {isEditing ? (
                /* Режим редактирования */
                <div className="space-y-4">
                  {/* Редактирование названия должности */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">🎯 Название должности:</label>
                    <input
                      type="text"
                      value={editableData.title}
                      onChange={(e) => setEditableData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Введите название должности"
                    />
                  </div>

                  {/* Редактирование навыков */}
                  {['hard_skills', 'soft_skills', 'languages'].map((category) => {
                    const categoryNames = {
                      hard_skills: '💻 Технические навыки',
                      soft_skills: '🤝 Гибкие навыки', 
                      languages: '🌍 Языки'
                    };
                    
                    return (
                      <div key={category}>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                          {categoryNames[category as keyof typeof categoryNames]}:
                        </label>
                        
                        {/* Список текущих навыков */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {editableData[category as keyof typeof editableData].map((skill: string, index: number) => (
                            <span key={index} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-sm flex items-center space-x-1">
                              <span>{skill}</span>
                              <button
                                onClick={() => removeSkill(category as any, index)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        
                        {/* Поле для добавления нового навыка */}
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            className="flex-1 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                            placeholder={`Добавить ${categoryNames[category as keyof typeof categoryNames].toLowerCase()}`}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addSkill(category as any, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                              addSkill(category as any, input.value);
                              input.value = '';
                            }}
                            className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-colors text-sm text-green-300"
                          >
                            Добавить
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Кнопка сохранения */}
                  <button
                    onClick={handleSaveEdits}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl shadow-xl transition-all hover:from-blue-500 hover:to-purple-500"
                  >
                    ✅ Сохранить изменения
                  </button>
                </div>
              ) : (
                /* Режим просмотра */
                <div className="space-y-4">
                  {/* Название должности */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="text-blue-400 font-medium mb-2">🎯 Название должности</h4>
                    <p className="text-white text-lg font-semibold">
                      {analysisResult.job_title || analysisResult.title || 'Не указано'}
                    </p>
                  </div>

                  {/* НОВОЕ: Требуемые навыки */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="text-blue-400 font-medium mb-3">🛠️ Навыки и требования</h4>
                    
                    {/* Технические навыки */}
                    {analysisResult.skills?.hard_skills?.length > 0 && (
                      <div className="mb-3">
                        <span className="text-gray-300 text-sm font-medium mb-2 block">💻 Технические навыки:</span>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.skills.hard_skills.map((skill: string, index: number) => (
                            <span key={index} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Гибкие навыки */}
                    {analysisResult.skills?.soft_skills?.length > 0 && (
                      <div className="mb-3">
                        <span className="text-gray-300 text-sm font-medium mb-2 block">🤝 Гибкие навыки:</span>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.skills.soft_skills.map((skill: string, index: number) => (
                            <span key={index} className="bg-green-500/20 text-green-300 px-2 py-1 rounded-lg text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Языки */}
                    {analysisResult.skills?.languages?.length > 0 && (
                      <div>
                        <span className="text-gray-300 text-sm font-medium mb-2 block">🌍 Языки:</span>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.skills.languages.map((language: string, index: number) => (
                            <span key={index} className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg text-xs">
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Если навыков нет */}
                    {(!analysisResult.skills?.hard_skills?.length && 
                      !analysisResult.skills?.soft_skills?.length && 
                      !analysisResult.skills?.languages?.length) && (
                      <p className="text-gray-400 text-sm italic">Навыки не извлечены. Нажмите "Редактировать" для ручного добавления.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Показываем ошибку если есть */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-red-400 font-medium">Ошибка анализа</h3>
          </div>
          <p className="text-red-300 text-sm mb-4">{error}</p>
          
          {/* НОВОЕ: Информация о поддерживаемых сайтах при ошибке */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
            <h3 className="text-white font-medium mb-2">✅ Поддерживаемые сайты:</h3>
            <div className="grid grid-cols-2 gap-2 text-gray-300 text-sm">
              <div>• <strong>HeadHunter</strong> (hh.ru, hh.kz)</div>
              <div>• <strong>LinkedIn</strong> (linkedin.com)</div>
              <div>• <strong>Djinni</strong> (djinni.co)</div>
              <div>• <strong>Habr Career</strong> (career.habr.com)</div>
              <div>• <strong>SuperJob</strong> (superjob.ru)</div>
              <div>• <strong>Avito Работа</strong> (avito.ru)</div>
              <div>• <strong>Rabota.ru</strong> (rabota.ru)</div>
              <div>• <strong>Zarplata.ru</strong> (zarplata.ru)</div>
              <div>• <strong>Work.ua</strong> (work.ua)</div>
            </div>
            
            {/* ОБНОВЛЕННАЯ информация о гибком парсинге */}
            <div className="mt-4 pt-4 border-t border-gray-500/20">
              <h4 className="text-white font-medium mb-2">📊 Гибкий парсинг данных:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• <strong>Приоритет:</strong> title, skills (hard/soft/languages)</li>
                <li>• <strong>Если нет данных:</strong> поля остаются пустыми</li>
                <li>• <strong>Ручное редактирование:</strong> можно добавить любые навыки</li>
                <li>• <strong>Без строгой валидации:</strong> принимаем любой формат JSON</li>
                <li>• <strong>Гибкость:</strong> работает даже при ошибках API</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobAnalysis;