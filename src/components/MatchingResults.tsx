import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, CheckCircle, XCircle, TrendingUp, Award, AlertTriangle, RefreshCw, Target, MapPin, Building, Clock, Star, Loader2, Brain, Zap, Shield, Database, Timer, Gauge, Users, Briefcase, ThumbsUp, ArrowRight } from 'lucide-react';
import { ResumeData, getFullName } from '../types/resumeData';

interface MatchingResultsProps {
  onScoringComplete: (scoringData: any) => void;
  resumeData: ResumeData | null; // Типизированные данные резюме из API
  jobData: any;    // Данные вакансии из API
  savedResults: any;
}

/**
 * ОБНОВЛЕННЫЙ ИНТЕРФЕЙС: Новая схема ответа от API скорринга
 * 
 * Соответствует обновленной схеме JSON с фокусом на детализированные метрики:
 * - total_score: общая оценка соответствия (0-100)
 * - breakdown: детализация по 4 параметрам с score, summary, description
 * - recommendation: категория совпадения
 * - recruiter_recommendation: рекомендации для рекрутера
 * - candidate_recommendation: рекомендации для кандидата
 */
interface NewScoringResponse {
  scoring_result: {
    // Общий балл соответствия
    total_score: number;
    
    // Детализация по параметрам
    breakdown: {
      hard_skills: {
        score: number;      // 0-100: Балл по техническим навыкам
        summary: string;    // Краткий анализ совпадений
        description: string; // Объяснение важности параметра
      };
      soft_skills: {
        score: number;      // 0-100: Балл по гибким навыкам
        summary: string;    // Краткий анализ совпадений
        description: string; // Объяснение важности параметра
      };
      experience_match: {
        score: number;      // 0-100: Балл по соответствию опыта
        summary: string;    // Краткий анализ совпадений
        description: string; // Объяснение важности параметра
      };
      position_match: {
        score: number;      // 0-100: Балл по соответствию должности
        summary: string;    // Краткий анализ совпадений
        description: string; // Объяснение важности параметра
      };
    };
    
    // Категория совпадения и рекомендации
    recommendation: string;           // Категория (good_match, excellent_match и т.д.)
    recruiter_recommendation: string; // Советы для рекрутера
    candidate_recommendation: string; // Советы для кандидата
  };
}

/**
 * ОБНОВЛЕННЫЕ анимированные сообщения для этапов скорринга
 * Отражают новый процесс анализа с детализированными метриками
 */
const SCORING_MESSAGES = [
  { id: 1, text: "Отправляем данные в Gemini AI...", delay: 0 },
  { id: 2, text: "Анализируем технические навыки...", delay: 3000 },
  { id: 3, text: "Оцениваем гибкие навыки...", delay: 6000 },
  { id: 4, text: "Проверяем соответствие опыта...", delay: 9000 },
  { id: 5, text: "Анализируем соответствие должности...", delay: 12000 },
  { id: 6, text: "Формируем рекомендации...", delay: 15000 }
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
 * ОБНОВЛЕННАЯ ФУНКЦИЯ: Валидация данных перед отправкой на скорринг
 * 
 * Проверяет наличие всех необходимых данных для анализа соответствия
 * 
 * @param resumeData - данные резюме
 * @param jobData - данные вакансии
 * @param userId - идентификатор пользователя
 * @returns объект с результатом валидации
 */
const validateScoringData = (resumeData: ResumeData | null, jobData: any, userId: string) => {
  const errors: string[] = [];

  console.log('🔍 ВАЛИДАЦИЯ ДАННЫХ ДЛЯ НОВОГО СКОРРИНГА:');
  console.log('📄 Resume Data:', resumeData);
  console.log('💼 Job Data:', jobData);
  console.log('👤 User ID:', userId);

  // Проверка данных резюме
  if (!resumeData) {
    errors.push('Отсутствуют данные резюме');
    console.error('❌ Данные резюме отсутствуют полностью');
  } else {
    console.log('✅ Данные резюме присутствуют');
    console.log('  - Имя:', resumeData.personal_info.first_name);
    console.log('  - Фамилия:', resumeData.personal_info.last_name);
    console.log('  - Навыки:', resumeData.skills);
    console.log('  - Опыт работы:', resumeData.experience);
    console.log('  - Образование:', resumeData.education);
    
    // Проверка критически важных полей резюме
    if (!resumeData.personal_info.first_name || resumeData.personal_info.first_name.trim().length === 0) {
      errors.push('В резюме отсутствует имя кандидата');
      console.error('❌ В резюме отсутствует имя кандидата');
    }
    if (!resumeData.personal_info.last_name || resumeData.personal_info.last_name.trim().length === 0) {
      errors.push('В резюме отсутствует фамилия кандидата');
      console.error('❌ В резюме отсутствует фамилия кандидата');
    }
    if (!resumeData.skills.hard_skills.length && !resumeData.skills.soft_skills.length) {
      errors.push('В резюме не указаны навыки');
      console.error('❌ В резюме не указаны навыки');
    } else {
      // Проверяем, что навыки содержат осмысленные данные
      const hardSkills = resumeData.skills.hard_skills;
      const softSkills = resumeData.skills.soft_skills;
      const totalSkills = [...hardSkills, ...softSkills];
      
      const validSkills = totalSkills.filter((skill: any) => 
        skill && typeof skill === 'string' && skill.trim().length > 0
      );
      
      if (validSkills.length === 0) {
        errors.push('Навыки в резюме пустые или некорректные');
        console.error('❌ Навыки в резюме пустые или некорректные');
      }
    }
    
    // Проверка опыта работы
    if (resumeData.experience.length === 0) {
      console.warn('⚠️ В резюме нет записей об опыте работы');
    } else {
      const validExperience = resumeData.experience.filter((exp: any) => 
        exp && exp.position && exp.position.trim().length > 0
      );
      if (validExperience.length === 0) {
        console.warn('⚠️ Опыт работы в резюме не содержит валидных позиций');
      }
    }
  }

  // Проверка данных вакансии
  if (!jobData) {
    errors.push('Отсутствуют данные вакансии');
    console.error('❌ Данные вакансии отсутствуют полностью');
  } else {
    console.log('✅ Данные вакансии присутствуют');
    console.log('  - Должность:', jobData.job_title);
    console.log('  - Компания:', jobData.company_name);
    console.log('  - Требуемые навыки:', jobData.required_skills);
    console.log('  - Локация:', jobData.location);
    console.log('  - Отрасль:', jobData.industry);
    
    if (!jobData.job_title || jobData.job_title.trim().length === 0) {
      errors.push('В вакансии не указана должность');
      console.error('❌ В вакансии не указана должность');
    }
    if (!jobData.company_name || jobData.company_name.trim().length === 0) {
      errors.push('В вакансии не указана компания');
      console.error('❌ В вакансии не указана компания');
    }
    
    // Проверка требуемых навыков
    if (!jobData.required_skills || !Array.isArray(jobData.required_skills) || jobData.required_skills.length === 0) {
      console.warn('⚠️ В вакансии не указаны требуемые навыки');
    } else {
      const validRequiredSkills = jobData.required_skills.filter((skill: any) => 
        skill && typeof skill === 'string' && skill.trim().length > 0
      );
      if (validRequiredSkills.length === 0) {
        console.warn('⚠️ Требуемые навыки в вакансии пустые или некорректные');
      }
    }
    
    // Проверка описания вакансии
    if (!jobData.description || jobData.description.trim().length === 0) {
      console.warn('⚠️ В вакансии отсутствует описание');
    }
  }

  // Проверка user_id
  if (!userId || userId.trim().length === 0) {
    errors.push('Отсутствует идентификатор пользователя');
    console.error('❌ Отсутствует user_id');
  } else {
    console.log('✅ User ID присутствует:', userId);
    
    // Проверка формата user_id
    if (userId.length < 3) {
      errors.push('Некорректный формат идентификатора пользователя');
      console.error('❌ Некорректный формат user_id:', userId);
    }
  }

  const isValid = errors.length === 0;
  console.log(`📊 РЕЗУЛЬТАТ ВАЛИДАЦИИ: ${isValid ? '✅ УСПЕШНО' : '❌ ОШИБКИ'}`);
  if (!isValid) {
    console.error('❌ Ошибки валидации:', errors);
  } else {
    console.log('✅ Все данные прошли валидацию, готовы к отправке на новый API');
  }

  return {
    isValid,
    errors
  };
};

/**
 * ОБНОВЛЕННАЯ ФУНКЦИЯ: Отправка запроса к новому API эндпоинту для скорринга
 * 
 * Логика работы:
 * 1. Валидирует входные данные
 * 2. Формирует JSON payload с resume_data, job_data и user_id
 * 3. Отправляет POST запрос на новый эндпоинт
 * 4. Обрабатывает ответ согласно новой схеме с scoring_result
 * 5. Обрабатывает ошибки и возвращает понятные сообщения
 * 
 * @param resumeData - данные резюме из предыдущего шага
 * @param jobData - данные вакансии из предыдущего шага
 * @param userId - идентификатор пользователя
 * @returns Promise<NewScoringResponse> - результаты скорринга от нового API
 */
const performScoringAnalysis = async (
  resumeData: ResumeData, 
  jobData: any,
  userId: string
): Promise<NewScoringResponse> => {
  console.log('🚀 НАЧАЛО ФУНКЦИИ performScoringAnalysis (НОВЫЙ API)');
  console.log('📥 Входные параметры:');
  console.log('  - resumeData:', resumeData);
  console.log('  - jobData:', jobData);
  console.log('  - userId:', userId);

  // Валидация входных данных
  const validation = validateScoringData(resumeData, jobData, userId);
  if (!validation.isValid) {
    const errorMessage = `Ошибка валидации данных: ${validation.errors.join(', ')}`;
    console.error('❌ ВАЛИДАЦИЯ НЕ ПРОЙДЕНА:', errorMessage);
    throw new Error(errorMessage);
  }

  // Формирование payload для нового API
  const requestPayload = {
    resume_data: resumeData,
    job_data: jobData,
    user_id: userId
  };

  console.log('📦 ФОРМИРОВАНИЕ PAYLOAD ДЛЯ НОВОГО API:');
  console.log('📤 Полный requestPayload:', JSON.stringify(requestPayload, null, 2));
  console.log('📊 Размер payload:', JSON.stringify(requestPayload).length, 'символов');
  
  // Детальная проверка каждого поля
  console.log('🔍 ДЕТАЛЬНАЯ ПРОВЕРКА PAYLOAD:');
  console.log('  ✓ resume_data присутствует:', !!requestPayload.resume_data);
  console.log('  ✓ job_data присутствует:', !!requestPayload.job_data);
  console.log('  ✓ user_id присутствует:', !!requestPayload.user_id);

  console.log('📤 Отправка запроса на новый API скорринга через Gemini AI:', {
    endpoint: 'https://77xihg.buildship.run/resume-vacancy-letter-copy-248ea5426c1b',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'JobMatch-AI/2.0-NewSchema',
      'X-Requested-With': 'XMLHttpRequest'
    },
    payloadSize: JSON.stringify(requestPayload).length,
    timestamp: new Date().toISOString()
  });

  try {
    // Отправка POST запроса к новому эндпоинту
    const response = await fetch('https://77xihg.buildship.run/resume-vacancy-letter-copy-248ea5426c1b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'JobMatch-AI/2.0-NewSchema',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(requestPayload)
    });

    console.log('📡 ОТВЕТ ОТ НОВОГО API:');
    console.log('  - Статус:', response.status);
    console.log('  - Status Text:', response.statusText);
    console.log('  - Headers:', Object.fromEntries(response.headers.entries()));

    // Проверка статуса ответа
    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        console.error('❌ Ошибка нового API (JSON):', errorData);
        if (errorData.error || errorData.message) {
          errorMessage = errorData.error || errorData.message;
        }
      } catch (parseError) {
        const errorText = await response.text();
        console.error('❌ Ошибка нового API (TEXT):', errorText);
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      console.error('❌ Ошибка нового API при скорринге:', {
        status: response.status,
        statusText: response.statusText,
        errorMessage
      });
      
      throw new Error(errorMessage);
    }

    // Парсинг JSON ответа
    const responseData = await response.json();
    console.log('✅ УСПЕШНЫЙ ОТВЕТ ОТ НОВОГО API:');
    console.log('📥 Полный responseData:', JSON.stringify(responseData, null, 2));

    // Валидация структуры ответа согласно новой схеме
    console.log('🔍 ВАЛИДАЦИЯ СТРУКТУРЫ НОВОГО ОТВЕТА:');
    
    // Проверяем, что responseData является объектом
    if (!responseData || typeof responseData !== 'object') {
      console.error('❌ Ответ нового API не является объектом:', responseData);
      throw new Error('Некорректный формат ответа API: ожидался объект');
    }
    
    // Проверяем наличие scoring_result
    if (!responseData.scoring_result) {
      console.error('❌ ОТСУТСТВУЕТ scoring_result в ответе:', Object.keys(responseData));
      throw new Error('Ответ API не содержит обязательное поле: scoring_result');
    }
    
    const scoringResult = responseData.scoring_result;
    console.log('✅ scoring_result найден:', typeof scoringResult);
    
    // Проверяем обязательные поля в scoring_result
    const requiredFields = ['total_score', 'breakdown', 'recommendation', 'recruiter_recommendation', 'candidate_recommendation'];
    for (const field of requiredFields) {
      const isPresent = scoringResult[field] !== undefined;
      console.log(`  - ${field}: ${isPresent ? '✅' : '❌'}`);
      if (!isPresent) {
        console.error('❌ ОТСУТСТВУЕТ ОБЯЗАТЕЛЬНОЕ ПОЛЕ В scoring_result:', field);
        console.error('❌ Полный ответ API:', JSON.stringify(responseData, null, 2));
        throw new Error(`Ответ API не содержит обязательное поле: scoring_result.${field}`);
      }
    }

    // Проверка структуры breakdown
    console.log('🔍 ВАЛИДАЦИЯ СТРУКТУРЫ breakdown:');
    const breakdown = scoringResult.breakdown;
    const breakdownFields = ['hard_skills', 'soft_skills', 'experience_match', 'position_match'];
    
    for (const field of breakdownFields) {
      const isPresent = breakdown && breakdown[field] !== undefined;
      console.log(`  - breakdown.${field}: ${isPresent ? '✅' : '❌'}`);
      
      if (isPresent) {
        const item = breakdown[field];
        const itemFields = ['score', 'summary', 'description'];
        for (const itemField of itemFields) {
          const itemIsPresent = item[itemField] !== undefined;
          console.log(`    - ${field}.${itemField}: ${itemIsPresent ? '✅' : '❌'}`);
        }
      }
    }

    if (!breakdown || 
        !breakdown.hard_skills || !breakdown.soft_skills || 
        !breakdown.experience_match || !breakdown.position_match) {
      console.error('❌ Некорректная структура breakdown:', breakdown);
      throw new Error('Некорректная структура поля breakdown в ответе API');
    }

    // Проверка диапазонов значений (0-100)
    const scoreFields = [
      { name: 'total_score', value: scoringResult.total_score },
      { name: 'breakdown.hard_skills.score', value: breakdown.hard_skills.score },
      { name: 'breakdown.soft_skills.score', value: breakdown.soft_skills.score },
      { name: 'breakdown.experience_match.score', value: breakdown.experience_match.score },
      { name: 'breakdown.position_match.score', value: breakdown.position_match.score }
    ];

    console.log('🔍 ПРОВЕРКА ДИАПАЗОНОВ ЗНАЧЕНИЙ (0-100):');
    for (const scoreField of scoreFields) {
      const isValid = typeof scoreField.value === 'number' && scoreField.value >= 0 && scoreField.value <= 100;
      console.log(`  - ${scoreField.name}: ${scoreField.value} ${isValid ? '✅' : '⚠️'}`);
      if (!isValid) {
        console.warn(`⚠️ Значение ${scoreField.name} вне диапазона 0-100: ${scoreField.value}`);
      }
    }

    console.log('✅ НОВЫЙ СКОРРИНГ УСПЕШНО ВЫПОЛНЕН ЧЕРЕЗ GEMINI AI');
    console.log('📊 Итоговые результаты:');
    console.log('  - Общий балл:', scoringResult.total_score);
    console.log('  - Технические навыки:', breakdown.hard_skills.score);
    console.log('  - Гибкие навыки:', breakdown.soft_skills.score);
    console.log('  - Соответствие опыта:', breakdown.experience_match.score);
    console.log('  - Соответствие должности:', breakdown.position_match.score);
    console.log('  - Категория совпадения:', scoringResult.recommendation);

    return responseData as NewScoringResponse;

  } catch (error: any) {
    console.error('❌ ОШИБКА В performScoringAnalysis (НОВЫЙ API):', error);
    
    // Обработка различных типов ошибок
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = 'Ошибка сети: не удается подключиться к новому серверу скорринга';
      console.error('❌ Сетевая ошибка:', networkError);
      throw new Error(networkError);
    }
    
    if (error.name === 'SyntaxError') {
      const parseError = 'Ошибка парсинга ответа: новый сервер вернул некорректный JSON';
      console.error('❌ Ошибка парсинга:', parseError);
      throw new Error(parseError);
    }
    
    // Передаем ошибку дальше, если она уже обработана
    throw error;
  }
};

const MatchingResults: React.FC<MatchingResultsProps> = ({ 
  onScoringComplete, 
  resumeData, 
  jobData, 
  savedResults 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(!!savedResults);
  const [scoringData, setScoringData] = useState<NewScoringResponse | null>(savedResults || null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // Состояние для анимированных сообщений
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);

  // Генерируем user_id при монтировании компонента
  useEffect(() => {
    const userId = generateDevUserId();
    setCurrentUserId(userId);
    console.log('🔧 Сгенерирован тестовый user_id для нового скорринга:', userId);
  }, []);

  // Восстанавливаем сохраненные результаты при монтировании
  useEffect(() => {
    if (savedResults && !scoringData) {
      setScoringData(savedResults);
      setAnalysisComplete(true);
    }
  }, [savedResults, scoringData]);

  /**
   * ЭФФЕКТ: Управление анимированными сообщениями для скорринга
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

    SCORING_MESSAGES.forEach((message, index) => {
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
   * ОБНОВЛЕННАЯ ФУНКЦИЯ: Запуск анализа соответствия через новый API
   * 
   * Теперь использует новый API с детализированными метриками
   * 
   * Логика работы:
   * 1. Сбрасывает предыдущие ошибки
   * 2. Устанавливает состояние загрузки
   * 3. Вызывает новую API функцию скорринга с user_id
   * 4. Обрабатывает успешный результат согласно новой схеме
   * 5. Обновляет UI соответственно
   */
  const startAnalysis = async () => {
    console.log('🎯 ЗАПУСК АНАЛИЗА СООТВЕТСТВИЯ (НОВЫЙ API)');
    console.log('📊 Проверка входных данных перед анализом:');
    console.log('  - resumeData:', resumeData);
    console.log('  - jobData:', jobData);
    console.log('  - currentUserId:', currentUserId);

    // Дополнительная проверка данных перед началом анализа
    if (!resumeData || !jobData || !currentUserId) {
      const missingData = [];
      if (!resumeData) missingData.push('данные резюме');
      if (!jobData) missingData.push('данные вакансии');
      if (!currentUserId) missingData.push('идентификатор пользователя');
      
      const errorMessage = `Отсутствуют критически важные данные: ${missingData.join(', ')}`;
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПЕРЕД АНАЛИЗОМ:', errorMessage);
      setError(errorMessage);
      return;
    }
    setError(null);
    setIsAnalyzing(true);

    try {
      console.log('🚀 Начинаем новый скорринг через Gemini AI');
      
      // Вызываем новую API функцию скорринга с user_id
      const scoringResult = await performScoringAnalysis(resumeData, jobData, currentUserId);

      console.log('✅ ПОЛУЧЕН РЕЗУЛЬТАТ НОВОГО СКОРРИНГА:', scoringResult);

      setScoringData(scoringResult);
      setIsAnalyzing(false);
      setAnalysisComplete(true);
      
      // Передаем результаты в родительский компонент
      onScoringComplete(scoringResult);
      
      console.log('✅ Новый скорринг успешно выполнен и отображен');
      
    } catch (err: any) {
      console.error('❌ ОШИБКА ПРИ ВЫПОЛНЕНИИ НОВОГО СКОРРИНГА:', err);
      
      // Устанавливаем понятное сообщение об ошибке для пользователя
      const userFriendlyError = err.message || 'Произошла неизвестная ошибка при анализе соответствия';
      console.error('❌ Пользовательское сообщение об ошибке:', userFriendlyError);
      setError(userFriendlyError);
      setIsAnalyzing(false);
    }
  };

  // Переход к следующему шагу (в Dashboard)
  const goToNextStep = () => {
    // Этот обработчик будет передан из Dashboard
    console.log('➡️ Переход к следующему шагу');
  };

  // Определение цвета для оценки
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  // Определение текста категории совпадения
  const getRecommendationText = (rec: string) => {
    switch (rec) {
      case 'excellent_match':
        return 'Превосходное совпадение!';
      case 'good_match':
        return 'Хорошее совпадение!';
      case 'average_match':
        return 'Среднее совпадение.';
      case 'low_match':
        return 'Низкое совпадение.';
      default:
        return '';
    }
  };

  // Если анализ еще не запущен
  if (!analysisComplete && !isAnalyzing) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Скорринг соответствия</h2>
          <p className="text-gray-300">
            Проанализируем совместимость вашего резюме с вакансией через новый Gemini AI
          </p>
        </div>

        {/* 🔧 DEV INFO: Показываем информацию о данных и новом API */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-4 h-4 text-yellow-400" />
            <h3 className="text-yellow-400 font-medium text-sm">🔧 Новый Gemini AI Scoring (v2.0)</h3>
          </div>
          <div className="text-yellow-300 text-xs space-y-1">
            <p>• User ID: <span className="font-mono bg-yellow-500/20 px-2 py-1 rounded">{currentUserId}</span></p>
            <p>• Эндпоинт: <span className="font-mono">https://77xihg.buildship.run4_scoring</span></p>
            <p>• Данные резюме: {resumeData ? '✅ Загружены' : '❌ Отсутствуют'}</p>
            <p>• Данные вакансии: {jobData ? '✅ Загружены' : '❌ Отсутствуют'}</p>
            <p>• Схема: Новая с детализированными метриками и рекомендациями</p>
          </div>
        </div>

        {/* Информация о данных для анализа */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
          <h3 className="text-white font-medium mb-4">📊 Данные для нового скорринга:</h3>
          <div className="space-y-3">
            {resumeData && (
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">
                  Резюме: {getFullName(resumeData)}
                  {` (${resumeData.skills.hard_skills.length + resumeData.skills.soft_skills.length} навыков)`}
                </span>
              </div>
            )}
            {jobData && (
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">
                  Вакансия: {jobData.job_title} в {jobData.company_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Кнопка запуска анализа */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={startAnalysis}
          disabled={!resumeData || !jobData}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:from-blue-500 hover:to-purple-500 flex items-center justify-center space-x-2"
        >
          <BarChart3 className="w-5 h-5" />
          <span>Запустить новый анализ через Gemini AI v2.0</span>
        </motion.button>

        {/* ОБНОВЛЕННАЯ информация о том, что будет проанализировано */}
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-2xl p-4">
          <h3 className="text-white font-medium mb-2">🤖 Что анализирует новый Gemini AI:</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• <strong>Технические навыки:</strong> Анализ соответствия hard skills</li>
            <li>• <strong>Гибкие навыки:</strong> Оценка soft skills и коммуникативных способностей</li>
            <li>• <strong>Соответствие опыта:</strong> Релевантность прошлого опыта работы</li>
            <li>• <strong>Соответствие должности:</strong> Подходящость для конкретной позиции</li>
            <li>• <strong>Рекомендации:</strong> Персональные советы для кандидата и рекрутера</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Скорринг соответствия</h2>
        <p className="text-gray-300">
          Детализированный анализ через новый Gemini AI v2.0
        </p>
      </div>

      {/* БЛОК: Анимированный прогресс скорринга с этапами Gemini AI */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6"
        >
          {/* Заголовок с анимированным спиннером */}
          <div className="flex items-center justify-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mr-3"
            >
              <Brain className="w-8 h-8 text-purple-400" />
            </motion.div>
            <h3 className="text-white font-semibold text-lg">Новый Gemini AI выполняет детальный анализ</h3>
          </div>

          {/* Анимированные сообщения */}
          <div className="space-y-4">
            <AnimatePresence>
              {SCORING_MESSAGES.map((message, index) => {
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
                        ? 'bg-purple-500/20 border border-purple-500/30' 
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
                          <Loader2 className="w-5 h-5 text-purple-400" />
                        </motion.div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-500" />
                      )}
                    </div>

                    {/* Текст сообщения */}
                    <motion.span
                      className={`font-medium transition-colors duration-300 ${
                        isCurrent 
                          ? 'text-purple-300' 
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
                            className="w-1 h-1 bg-purple-400 rounded-full"
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
              <span>Прогресс анализа</span>
              <span>{Math.round(((currentMessageIndex + 1) / SCORING_MESSAGES.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentMessageIndex + 1) / SCORING_MESSAGES.length) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Отображение ошибок API */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4"
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-400 font-medium mb-1">Ошибка анализа соответствия</h4>
              <p className="text-red-300 text-sm mb-3">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 text-sm underline transition-colors"
              >
                Скрыть ошибку
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* НОВЫЕ результаты анализа с новой схемой */}
      {scoringData && analysisComplete && (
        <div className="space-y-6" id="scoring-results-container">
          {/* 1. Общая оценка - упрощенная версия */}
          <div className="text-center p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '24px' }}>
            <div className="mb-4">
              <h2 className="text-white text-2xl font-bold mb-2">
                🎯 Общий балл соответствия: {scoringData.scoring_result.total_score}%
              </h2>
              <p className="text-gray-300">
                {getRecommendationText(scoringData.scoring_result.recommendation)}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                🤖 Анализ выполнен новым Gemini AI v2.0
              </p>
            </div>
          </div>

          {/* 2. Упрощенная таблица результатов */}
          <div className="p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px' }}>
            <h3 className="text-white text-xl font-semibold mb-4">📊 Детализация соответствия</h3>
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <th style={{ color: '#ffffff', fontWeight: '600', padding: '12px', textAlign: 'left', width: '30%' }}>
                    Параметр
                  </th>
                  <th style={{ color: '#ffffff', fontWeight: '600', padding: '12px', textAlign: 'center', width: '15%' }}>
                    Балл
                  </th>
                  <th style={{ color: '#ffffff', fontWeight: '600', padding: '12px', textAlign: 'left', width: '55%' }}>
                    Анализ
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Технические навыки */}
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '16px 12px', color: '#60a5fa', fontWeight: '500' }}>
                    💻 Технические навыки
                  </td>
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <span style={{ 
                      color: '#ffffff', 
                      fontWeight: 'bold', 
                      fontSize: '18px',
                      backgroundColor: '#3b82f6',
                      padding: '4px 12px',
                      borderRadius: '8px'
                    }}>
                      {scoringData.scoring_result.breakdown.hard_skills.score}%
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <p style={{ color: '#d1d5db', fontSize: '14px', margin: '0 0 8px 0' }}>
                      {scoringData.scoring_result.breakdown.hard_skills.summary}
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic', margin: '0' }}>
                      {scoringData.scoring_result.breakdown.hard_skills.description}
                    </p>
                  </td>
                </tr>
                
                {/* Гибкие навыки */}
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '16px 12px', color: '#34d399', fontWeight: '500' }}>
                    🤝 Гибкие навыки
                  </td>
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <span style={{ 
                      color: '#ffffff', 
                      fontWeight: 'bold', 
                      fontSize: '18px',
                      backgroundColor: '#10b981',
                      padding: '4px 12px',
                      borderRadius: '8px'
                    }}>
                      {scoringData.scoring_result.breakdown.soft_skills.score}%
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <p style={{ color: '#d1d5db', fontSize: '14px', margin: '0 0 8px 0' }}>
                      {scoringData.scoring_result.breakdown.soft_skills.summary}
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic', margin: '0' }}>
                      {scoringData.scoring_result.breakdown.soft_skills.description}
                    </p>
                  </td>
                </tr>
                
                {/* Соответствие опыта */}
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '16px 12px', color: '#a78bfa', fontWeight: '500' }}>
                    💼 Соответствие опыта
                  </td>
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <span style={{ 
                      color: '#ffffff', 
                      fontWeight: 'bold', 
                      fontSize: '18px',
                      backgroundColor: '#8b5cf6',
                      padding: '4px 12px',
                      borderRadius: '8px'
                    }}>
                      {scoringData.scoring_result.breakdown.experience_match.score}%
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <p style={{ color: '#d1d5db', fontSize: '14px', margin: '0 0 8px 0' }}>
                      {scoringData.scoring_result.breakdown.experience_match.summary}
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic', margin: '0' }}>
                      {scoringData.scoring_result.breakdown.experience_match.description}
                    </p>
                  </td>
                </tr>
                
                {/* Соответствие должности */}
                <tr>
                  <td style={{ padding: '16px 12px', color: '#facc15', fontWeight: '500' }}>
                    🎯 Соответствие должности
                  </td>
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <span style={{ 
                      color: '#ffffff', 
                      fontWeight: 'bold', 
                      fontSize: '18px',
                      backgroundColor: '#f59e0b',
                      padding: '4px 12px',
                      borderRadius: '8px'
                    }}>
                      {scoringData.scoring_result.breakdown.position_match.score}%
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <p style={{ color: '#d1d5db', fontSize: '14px', margin: '0 0 8px 0' }}>
                      {scoringData.scoring_result.breakdown.position_match.summary}
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic', margin: '0' }}>
                      {scoringData.scoring_result.breakdown.position_match.description}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3. Рекомендации - упрощенная версия */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Рекомендации для кандидата */}
            <div className="p-6" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px' }}>
              <h3 className="text-white font-semibold mb-3">
                👤 Рекомендации для вас (кандидата)
              </h3>
              <p style={{ color: '#d1d5db', fontSize: '14px', lineHeight: '1.6', margin: '0' }}>
                {scoringData.scoring_result.candidate_recommendation}
              </p>
            </div>
            
            {/* Рекомендации для рекрутера */}
            <div className="p-6" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px' }}>
              <h3 className="text-white font-semibold mb-3">
                🎯 Что увидит рекрутер
              </h3>
              <p style={{ color: '#d1d5db', fontSize: '14px', lineHeight: '1.6', margin: '0' }}>
                {scoringData.scoring_result.recruiter_recommendation}
              </p>
            </div>
          </div>

          {/* 4. Общая рекомендация */}
          <div className="p-6" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '16px' }}>
            <h3 className="text-white font-semibold mb-3">
              🎓 Общая категория соответствия
            </h3>
            <p style={{ color: '#d1d5db', fontSize: '16px', fontWeight: '500', margin: '0' }}>
              {scoringData.scoring_result.recommendation}
            </p>
          </div>

          {/* 5. Кнопки действий */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={goToNextStep}
              className="w-full py-4 px-6 font-semibold rounded-2xl transition-all duration-300 text-center"
              style={{ 
                background: 'linear-gradient(to right, #059669, #047857)', 
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                maxWidth: '400px'
              }}
            >
              ✅ Далее →
            </button>
            
            <button
              onClick={() => {
                console.log('🔄 СБРОС НОВОГО АНАЛИЗА: Начинаем полный сброс состояний');
                
                // ИСПРАВЛЕНО: Полный сброс всех состояний
                setAnalysisComplete(false);
                setScoringData(null);
                setError(null);
                setIsAnalyzing(false);
                
                // ИСПРАВЛЕНО: Сбрасываем анимированные сообщения
                setCurrentMessageIndex(0);
                setVisibleMessages([]);
                
                console.log('📊 Состояния сброшены для нового анализа');
                
                // Генерируем новый user_id для повторного анализа
                const newUserId = generateDevUserId();
                setCurrentUserId(newUserId);
                console.log('🔧 Сгенерирован новый user_id для повторного скорринга:', newUserId);
                
                // НОВОЕ: Уведомляем родительский компонент о сбросе данных
                // Это очистит сохраненные результаты в Dashboard
                onScoringComplete(null);
                
                console.log('✅ Полный сброс завершен, компонент готов к новому анализу');
              }}
              className="px-6 py-3 rounded-2xl transition-colors text-center"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer'
              }}
            >
              🔄 Повторить анализ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingResults;