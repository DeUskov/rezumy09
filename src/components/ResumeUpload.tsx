import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, X, FileText, Loader2, Brain, Zap, Database, Clock, CreditCard as Edit3, AlertTriangle } from 'lucide-react';
import { ResumeData, validateResumeData, getFullName, getTotalSkillsCount } from '../types/resumeData';

interface ResumeUploadProps {
  onUploadComplete: (data: { file: File; resumeData: any }) => void;
  savedFile: File | null;
  savedResumeData: any;
}

/**
 * НОВЫЕ анимированные сообщения для глубокого парсинга резюме
 * 8 этапов по 4 секунды каждый (общая длительность 32 секунды)
 */
const PARSING_MESSAGES = [
  { id: 1, text: "Загружаем резюме на сервер...", delay: 0 },
  { id: 2, text: "Инициализируем нейросети для анализа...", delay: 2000 },
  { id: 3, text: "Глубокий анализ структуры документа...", delay: 4000 },
  { id: 4, text: "Извлечение персональной информации...", delay: 6000 },
  { id: 5, text: "Анализ навыков и компетенций...", delay: 8000 },
  { id: 6, text: "Обработка опыта работы и образования...", delay: 10000 },
  { id: 7, text: "Генерация карьерных рекомендаций...", delay: 12000 },
  { id: 8, text: "Финализация и валидация данных...", delay: 14000 }
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
 * НОВАЯ ФУНКЦИЯ: Гибкий парсинг ответа без строгой валидации
 * 
 * Принимает данные "как есть" и передает полный объект дальше
 * На фронте показывает только ключевые поля для пользователя
 * 
 * @param file - файл резюме для парсинга
 * @param userId - идентификатор пользователя
 * @returns Promise<any> - полные данные резюме без валидации
 */
const parseResumeAPI = async (file: File, userId: string): Promise<any> => {
  console.log('📄 Начинаем прямую загрузку и парсинг резюме:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    userId,
    endpoint: 'https://77xihg.buildship.run/first-resume-upload',
    timeout: '120 секунд'
  });

  // Создаем AbortController с увеличенным таймаутом для парсинга больших файлов
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error('⏰ Таймаут парсинга резюме (120 секунд)');
    controller.abort();
  }, 120000);

  try {
    // Формируем FormData согласно требованиям API
    const formData = new FormData();
    formData.append('file_itself', file);
    formData.append('user_id', userId);
    formData.append('File_path', `resume_${userId}_${Date.now()}_${file.name}`);

    console.log('📤 Отправляем файл на API парсинга:', {
      fileName: file.name,
      userId: userId,
      filePath: `resume_${userId}_${Date.now()}_${file.name}`
    });

    // Отправляем POST запрос с FormData
    const response = await fetch('https://77xihg.buildship.run/first-resume-upload', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'JobMatch-AI/1.0',
        'X-Requested-With': 'XMLHttpRequest'
        // Content-Type не устанавливаем - браузер сам установит для FormData
      },
      body: formData,
      signal: controller.signal
    });

    // Очищаем таймаут
    clearTimeout(timeoutId);

    console.log('📡 Ответ от API:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    // Проверяем статус ответа
    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
      
      try {
        // Пытаемся получить детали ошибки
        const errorData = await response.json();
        console.error('❌ Ошибка API (JSON):', errorData);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (parseError) {
        // Fallback на текстовую ошибку
        const errorText = await response.text();
        console.error('❌ Ошибка API (TEXT):', errorText);
        if (errorText) errorMessage = errorText;
      }
      
      throw new Error(errorMessage);
    }

    // Парсим JSON ответ с данными резюме
    const responseData = await response.json();
    console.log('✅ Получены сырые данные от API:', responseData);

    // НОВОЕ: Принимаем данные как есть, без валидации
    console.log('✅ Парсинг резюме завершен без валидации схемы');
    console.log('📊 Размер полученных данных:', JSON.stringify(responseData).length, 'символов');

    return responseData;

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    console.error('❌ Ошибка API парсинга резюме:', error);
    
    // Обработка различных типов ошибок
    if (error.name === 'AbortError') {
      throw new Error('Время ожидания парсинга истекло (120 секунд). Файл слишком большой или сложный для обработки.');
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Ошибка сети: не удается подключиться к серверу парсинга резюме');
    }
    
    if (error.name === 'SyntaxError') {
      throw new Error('Сервер вернул некорректный ответ. Возможно, файл поврежден или имеет неподдерживаемый формат.');
    }
    
    // Передаем ошибку как есть
    throw error;
  }
};

/**
 * НОВАЯ ФУНКЦИЯ: Гибкое извлечение данных для отображения на фронте
 * 
 * Извлекает только нужные поля с поддержкой вариативного написания:
 * - desired_position
 * - personal_info.first_name / first_name
 * - personal_info.last_name / last_name  
 * - skills.hard_skills, skills.soft_skills, skills.languages
 * - summary
 * 
 * @param rawData - сырые данные от API
 * @returns объект с извлеченными полями для отображения
 */
const extractDisplayData = (rawData: any) => {
  console.log('🔍 Гибкое извлечение данных для отображения:', rawData);
  
  // Извлекаем desired_position
  const desired_position = rawData?.desired_position || rawData?.desiredPosition || '';
  
  // Извлекаем имя (разные варианты написания)
  const first_name = rawData?.personal_info?.first_name || 
                     rawData?.personalInfo?.first_name ||
                     rawData?.first_name || 
                     rawData?.firstName || '';
  
  // Извлекаем фамилию (разные варианты написания)
  const last_name = rawData?.personal_info?.last_name || 
                    rawData?.personalInfo?.last_name ||
                    rawData?.last_name || 
                    rawData?.lastName || '';
  
  // Извлекаем навыки (разные варианты написания)
  const skills = {
    hard_skills: rawData?.skills?.hard_skills || 
                 rawData?.skills?.hardSkills || 
                 rawData?.hardSkills || [],
    soft_skills: rawData?.skills?.soft_skills || 
                 rawData?.skills?.softSkills || 
                 rawData?.softSkills || [],
    languages: rawData?.skills?.languages || 
               rawData?.languages || []
  };
  
  // Извлекаем summary
  const summary = rawData?.summary || rawData?.description || '';
  
  const displayData = {
    desired_position,
    personal_info: {
      first_name,
      last_name
    },
    skills,
    summary
  };
  
  console.log('✅ Извлеченные данные для отображения:', displayData);
  return displayData;
};

const ResumeUpload: React.FC<ResumeUploadProps> = ({ onUploadComplete, savedFile, savedResumeData }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(savedFile);
  const [resumeData, setResumeData] = useState<any>(savedResumeData);
  const [displayData, setDisplayData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Состояние для глубокого анализа с анимированными сообщениями
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);

  // Генерируем user_id при монтировании компонента
  useEffect(() => {
    const userId = generateDevUserId();
    setCurrentUserId(userId);
    console.log('🔧 Сгенерирован тестовый user_id для парсинга резюме:', userId);
  }, []);

  // Восстанавливаем сохраненные данные при монтировании
  useEffect(() => {
    if (savedFile && !uploadedFile) {
      setUploadedFile(savedFile);
    }
    if (savedResumeData && !resumeData) {
      setResumeData(savedResumeData);
    }
  }, [savedFile, savedResumeData, uploadedFile, resumeData]);

  /**
   * НОВЫЙ ЭФФЕКТ: Глубокий анализ с анимированными сообщениями
   * 8 шагов по 5 секунд каждый с плавным появлением
   */
  useEffect(() => {
    if (!isParsing) {
      // Сбрасываем состояние сообщений когда анализ завершен
      setCurrentMessageIndex(0);
      setVisibleMessages([]);
      return;
    }

    // Запускаем таймеры для показа сообщений глубокого анализа
    const timers: NodeJS.Timeout[] = [];

    PARSING_MESSAGES.forEach((message, index) => {
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
  }, [isParsing]);

  // Константы для валидации
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB в байтах
  const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

  /**
   * Клиентская валидация файла
   * Проверяет тип файла и размер перед отправкой на сервер
   */
  const validateFile = (file: File) => {
    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `Файл слишком большой. Максимальный размер: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    // Проверка типа файла по MIME-type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Неподдерживаемый тип файла. Используйте PDF или DOCX'
      };
    }

    // Дополнительная проверка по расширению файла
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return {
        isValid: false,
        error: 'Неподдерживаемое расширение файла. Используйте .pdf или .docx'
      };
    }

    return { isValid: true };
  };

  /**
   * ОБНОВЛЕННАЯ ФУНКЦИЯ: Обработка файла с глубоким анализом
   * 
   * 40 секунд минимум для показа глубокого анализа
   * 
   * Логика работы:
   * 1. Валидация файла на клиенте
   * 2. Запуск анимации глубокого анализа
   * 3. Параллельный вызов API
   * 4. Ожидание минимум 40 секунд для качественной демонстрации процесса
   * 5. Передача результата в родительский компонент
   */
  const handleFileUpload = async (file: File) => {
    setError(null);

    // Клиентская валидация файла
    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Ошибка валидации файла');
      return;
    }

    // Начинаем процесс и засекаем время для синхронизации
    const startTime = Date.now();
    const MINIMUM_ANIMATION_TIME = 32000; // 32 секунды минимум для глубокого анализа
    setIsParsing(true);

    try {
      // Вызываем API параллельно с анимацией
      const parsedData = await parseResumeAPI(file, currentUserId);
      
      // Вычисляем, сколько времени прошло с начала
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MINIMUM_ANIMATION_TIME - elapsedTime);
      
      console.log(`⏱️ Глубокий анализ: API ответил за ${elapsedTime}мс, ждем еще ${remainingTime}мс для завершения 32-секундной демонстрации`);
      
      // Ждем завершения 32-секундной анимации глубокого анализа
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // НОВОЕ: Извлекаем данные для отображения
      const extractedDisplayData = extractDisplayData(parsedData);
      setDisplayData(extractedDisplayData);
      
      // Сохраняем результаты
      setUploadedFile(file);
      setResumeData(parsedData);
      setEditableData(parsedData); // Инициализируем редактируемые данные
      setIsParsing(false);
      setHasUnsavedChanges(false);
      setShowSaveSuccess(false);

      // Уведомляем родительский компонент (передаем полные данные)
      onUploadComplete({
        file: file,
        resumeData: parsedData
      });

      console.log('✅ Глубокий анализ резюме завершен успешно');

    } catch (error: any) {
      console.error('❌ Ошибка глубокого анализа резюме:', error);
      
      setIsParsing(false);
      
      // Устанавливаем понятное сообщение об ошибке
      let errorMessage = error.message || 'Произошла ошибка при глубоком анализе резюме';
      setError(errorMessage);
    }
  };

  /**
   * ОБНОВЛЕННАЯ ФУНКЦИЯ: Загрузка файла в Supabase Storage (УДАЛЕНА)
   * 
   * Эта функция больше не используется, так как загрузка теперь происходит
   * через Edge Function с подписанными URL для обхода RLS политик
   */
  // Функция удалена - теперь используется getSignedUploadUrl + uploadFileWithSignedUrl

  // Обработчики drag-and-drop событий остаются без изменений
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  /**
   * Обработчик выбора файла через input
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  /**
   * Удаление загруженного файла и данных
   */
  const removeFile = () => {
    setUploadedFile(null);
    setResumeData(null);
    setDisplayData(null);
    setError(null);
    setIsEditing(false);
    setEditableData(null);
    setHasUnsavedChanges(false);
    setShowSaveSuccess(false);
    
    // Генерируем новый user_id для следующей загрузки
    const newUserId = generateDevUserId();
    setCurrentUserId(newUserId);
    console.log('🔧 Сгенерирован новый user_id для следующей загрузки:', newUserId);
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Валидация редактируемых данных резюме
   */
  const validateResumeEditData = (data: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Проверка персональной информации
    if (!data.personal_info?.first_name || data.personal_info.first_name.trim().length === 0) {
      errors.push('Имя не может быть пустым');
    }
    if (!data.personal_info?.last_name || data.personal_info.last_name.trim().length === 0) {
      errors.push('Фамилия не может быть пустой');
    }
    if (!data.personal_info?.email || data.personal_info.email.trim().length === 0) {
      errors.push('Email не может быть пустым');
    } else {
      // Простая валидация email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.personal_info.email.trim())) {
        errors.push('Введите корректный email адрес');
      }
    }
    if (!data.personal_info?.phone || data.personal_info.phone.trim().length === 0) {
      errors.push('Телефон не может быть пустым');
    }

    // Проверка желаемой позиции
    if (!data.desired_position || data.desired_position.trim().length === 0) {
      errors.push('Желаемая позиция не может быть пустой');
    }

    // Проверка summary
    if (!data.summary || data.summary.trim().length === 0) {
      errors.push('Краткое описание не может быть пустым');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Сохранение отредактированных данных резюме
   */
  const handleSaveResumeEdits = () => {
    if (!editableData) return;

    // Валидация данных
    const validation = validateResumeEditData(editableData);
    if (!validation.isValid) {
      setError(`Ошибка валидации: ${validation.errors.join(', ')}`);
      return;
    }

    // Очищаем ошибки и сохраняем изменения
    setError(null);
    setResumeData(editableData);
    
    // Обновляем данные для отображения
    const updatedDisplayData = extractDisplayData(editableData);
    setDisplayData(updatedDisplayData);
    
    setIsEditing(false);
    setHasUnsavedChanges(false);
    
    // Показываем уведомление об успешном сохранении
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 3000); // Скрываем через 3 секунды

    // Передаем обновленные данные в родительский компонент
    if (uploadedFile) {
      onUploadComplete({
        file: uploadedFile,
        resumeData: editableData
      });
    }

    console.log('✅ Сохранены отредактированные данные резюме:', editableData);
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Добавление навыка
   */
  const addResumeSkill = (category: 'hard_skills' | 'soft_skills' | 'languages', skill: string) => {
    if (!editableData || !skill.trim()) return;

    setEditableData(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: [...(prev.skills[category] || []), skill.trim()]
      }
    }));
    setHasUnsavedChanges(true);
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Удаление навыка
   */
  const removeResumeSkill = (category: 'hard_skills' | 'soft_skills' | 'languages', index: number) => {
    if (!editableData) return;

    setEditableData(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: (prev.skills[category] || []).filter((_, i) => i !== index)
      }
    }));
    setHasUnsavedChanges(true);
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Добавление опыта работы
   */
  const addWorkExperience = () => {
    if (!editableData) return;

    const newExperience = {
      position: '',
      company: '',
      bullet_list: [],
      start_date: '',
      end_date: '',
      industry: ''
    };

    setEditableData(prev => ({
      ...prev,
      experience: [...(prev.experience || []), newExperience]
    }));
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Удаление опыта работы
   */
  const removeWorkExperience = (index: number) => {
    if (!editableData) return;

    setEditableData(prev => ({
      ...prev,
      experience: (prev.experience || []).filter((_, i) => i !== index)
    }));
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Обновление поля опыта работы
   */
  const updateWorkExperience = (index: number, field: string, value: any) => {
    if (!editableData) return;

    setEditableData(prev => ({
      ...prev,
      experience: (prev.experience || []).map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Добавление образования
   */
  const addEducation = () => {
    if (!editableData) return;

    const newEducation = {
      institution: '',
      degree: '',
      graduation_year: '',
      field_of_study: '',
      additional_info: ''
    };

    setEditableData(prev => ({
      ...prev,
      education: [...(prev.education || []), newEducation]
    }));
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Удаление образования
   */
  const removeEducation = (index: number) => {
    if (!editableData) return;

    setEditableData(prev => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index)
    }));
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Обновление поля образования
   */
  const updateEducation = (index: number, field: string, value: string) => {
    if (!editableData) return;

    setEditableData(prev => ({
      ...prev,
      education: (prev.education || []).map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  // Обработчик изменений в полях формы
  const handleFieldChange = (field: string, value: string, nestedField?: string) => {
    setEditableData(prev => {
      if (nestedField) {
        return {
          ...prev,
          [field]: {
            ...prev[field as keyof any],
            [nestedField]: value
          }
        };
      } else {
        return {
          ...prev,
          [field]: value
        };
      }
    });
    setHasUnsavedChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Уведомление об успешном сохранении */}
      {showSaveSuccess && (
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
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500/90 backdrop-blur-xl border border-green-400/30 rounded-2xl px-6 py-4 shadow-2xl"
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
              <p className="text-green-100 text-sm">Данные резюме обновлены и готовы к использованию</p>
            </div>
          </div>
          
          {/* Анимированный прогресс-бар исчезновения */}
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
        <h2 className="text-2xl font-bold text-white mb-2">Загрузите ваше резюме</h2>
        <p className="text-gray-300">
          Поддерживаются файлы PDF и DOCX размером до 10MB
        </p>
      </div>

      {/* 🔧 DEV INFO: Показываем информацию о прямой загрузке только в режиме разработки */}
      {import.meta.env.DEV && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <h3 className="text-yellow-400 font-medium text-sm">🔧 Direct Upload Info</h3>
          </div>
          <div className="text-yellow-300 text-xs space-y-1">
            <p>• User ID: <span className="font-mono bg-yellow-500/20 px-2 py-1 rounded">{currentUserId}</span></p>
            <p>• Upload Method: <span className="font-mono">Direct FormData Upload</span></p>
            <p>• Storage: <span className="font-mono">⚡ Минуя Supabase Storage</span></p>
            <p>• Parse Endpoint: <span className="font-mono">file-upload/resume</span></p>
            <p>• Parse Timeout: <span className="font-mono">120 секунд</span></p>
          </div>
        </div>
      )}

      {/* Зона загрузки - показываем только если файл не загружен */}
      {!uploadedFile && !resumeData && (
        <motion.div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 ${
            isDragActive 
              ? 'border-blue-500 bg-blue-500/10' 
              : error
              ? 'border-red-500 bg-red-500/5'
              : 'border-gray-500 hover:border-blue-500 hover:bg-blue-500/5'
          }`}
        >
          {/* Скрытый input для выбора файлов */}
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isUploading || isParsing}
          />

          <motion.div className="mb-4">
            <Upload className={`w-16 h-16 mx-auto ${isDragActive ? 'text-blue-500' : error ? 'text-red-500' : 'text-gray-400'}`} />
          </motion.div>

          <div>
            <p className="text-white font-semibold text-lg mb-2">
              {isDragActive ? 'Отпустите файл здесь' : isParsing ? 'Анализируем резюме...' : 'Перетащите файл сюда'}
            </p>
            <p className="text-gray-400">
              {!isParsing && (
                <>
                  или{' '}
                  <label htmlFor="file-upload" className="text-blue-400 underline cursor-pointer hover:text-blue-300">
                    выберите файл
                  </label>
                </>
              )}
            </p>
          </div>
        </motion.div>
      )}

      {/* ОБНОВЛЕННЫЙ БЛОК: Анимированный прогресс глубокого анализа */}
      {isParsing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6"
        >
          {/* Заголовок глубокого анализа с предупреждением */}
          <div className="flex items-center justify-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mr-3"
            >
              <Brain className="w-8 h-8 text-purple-400" />
            </motion.div>
            <div className="text-center">
              <h3 className="text-white font-semibold text-lg">Глубокий анализ резюме с помощью ИИ</h3>
              <p className="text-orange-400 text-sm mt-1">⏳ Процесс может занять до 2 минут</p>
            </div>
          </div>

          {/* Анимированные сообщения глубокого анализа */}
          <div className="space-y-3">
            <AnimatePresence>
              {PARSING_MESSAGES.map((message, index) => {
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
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Прогресс-бар глубокого анализа */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Прогресс глубокого анализа</span>
              <span>{Math.round(((currentMessageIndex + 1) / PARSING_MESSAGES.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentMessageIndex + 1) / PARSING_MESSAGES.length) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Информация о процессе глубокого анализа */}
          <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Brain className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Процесс глубокого анализа</span>
            </div>
            <p className="text-gray-300 text-xs">
              ИИ проводит детальный анализ всех аспектов вашего резюме.
              <br />
              <span className="text-orange-400 font-semibold">Время выполнения: до 2 минут</span>
              <br />
              <span className="text-green-400">Минимальная демонстрация: 32 секунды</span>
            </p>
          </div>
        </motion.div>
      )}

      {/* Успешно загруженный файл и данные */}
      {uploadedFile && displayData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Информация о файле */}
          <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">{uploadedFile.name}</p>
                    <p className="text-green-400 text-sm">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • Обработано успешно
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    if (isEditing) {
                      // Отмена редактирования - восстанавливаем исходные данные
                      setEditableData(resumeData);
                      setIsEditing(false);
                      setError(null);
                      setHasUnsavedChanges(false);
                    } else {
                      // Включение режима редактирования
                      setEditableData(resumeData);
                      setIsEditing(true);
                    }
                  }}
                  className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-colors text-sm text-blue-300 flex items-center space-x-1"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{isEditing ? 'Отменить' : 'Редактировать'}</span>
                </button>
                <button
                  onClick={removeFile}
                  className="text-red-400 hover:text-red-300 text-sm underline transition-colors"
                >
                  Удалить файл
                </button>
              </div>
            </div>
          </div>

          {/* НОВЫЕ извлеченные данные резюме - только ключевые поля */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Database className="w-5 h-5 text-blue-400" />
              <h3 className="text-white font-semibold">
                {isEditing ? 'Редактирование данных резюме:' : 'Ключевые извлеченные данные:'}
              </h3>
            </div>

            {isEditing ? (
              /* НОВЫЙ БЛОК: Режим редактирования */
              <div className="space-y-6">
                {/* Персональная информация */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-blue-400 font-medium mb-4">👤 Персональная информация</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Имя:</label>
                      <input
                        type="text"
                        value={editableData?.personal_info?.first_name || ''}
                        onChange={(e) => handleFieldChange('personal_info', e.target.value, 'first_name')}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Введите имя"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Фамилия:</label>
                      <input
                        type="text"
                        value={editableData?.personal_info?.last_name || ''}
                        onChange={(e) => handleFieldChange('personal_info', e.target.value, 'last_name')}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Введите фамилию"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Email:</label>
                      <input
                        type="email"
                        value={editableData?.personal_info?.email || ''}
                        onChange={(e) => handleFieldChange('personal_info', e.target.value, 'email')}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Телефон:</label>
                      <input
                        type="tel"
                        value={editableData?.personal_info?.phone || ''}
                        onChange={(e) => handleFieldChange('personal_info', e.target.value, 'phone')}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="+7 (XXX) XXX-XX-XX"
                      />
                    </div>
                  </div>
                </div>

                {/* Желаемая позиция */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-yellow-400 font-medium mb-2">🎯 Желаемая позиция</h4>
                  <input
                    type="text"
                    value={editableData?.desired_position || ''}
                    onChange={(e) => handleFieldChange('desired_position', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Например: Frontend Developer"
                  />
                </div>

                {/* Навыки */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-green-400 font-medium mb-3">🛠️ Навыки</h4>
                  
                  {/* Технические навыки */}
                  <div className="mb-4">
                    <span className="text-gray-300 text-sm font-medium mb-2 block">💻 Технические навыки:</span>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(editableData?.skills?.hard_skills || []).map((skill: string, index: number) => (
                        <span key={index} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-sm flex items-center space-x-1">
                          <span>{skill}</span>
                          <button
                            onClick={() => removeResumeSkill('hard_skills', index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                        placeholder="Добавить технический навык"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addResumeSkill('hard_skills', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                          addResumeSkill('hard_skills', input.value);
                          input.value = '';
                        }}
                        className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl transition-colors text-sm text-blue-300"
                      >
                        Добавить
                      </button>
                    </div>
                  </div>

                  {/* Гибкие навыки */}
                  <div className="mb-4">
                    <span className="text-gray-300 text-sm font-medium mb-2 block">🤝 Гибкие навыки:</span>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(editableData?.skills?.soft_skills || []).map((skill: string, index: number) => (
                        <span key={index} className="bg-green-500/20 text-green-300 px-2 py-1 rounded-lg text-sm flex items-center space-x-1">
                          <span>{skill}</span>
                          <button
                            onClick={() => removeResumeSkill('soft_skills', index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                        placeholder="Добавить гибкий навык"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addResumeSkill('soft_skills', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                          addResumeSkill('soft_skills', input.value);
                          input.value = '';
                        }}
                        className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-xl transition-colors text-sm text-green-300"
                      >
                        Добавить
                      </button>
                    </div>
                  </div>

                  {/* Языки */}
                  <div>
                    <span className="text-gray-300 text-sm font-medium mb-2 block">🌍 Языки:</span>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(editableData?.skills?.languages || []).map((language: string, index: number) => (
                        <span key={index} className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg text-sm flex items-center space-x-1">
                          <span>{language}</span>
                          <button
                            onClick={() => removeResumeSkill('languages', index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                        placeholder="Добавить язык"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addResumeSkill('languages', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement;
                          addResumeSkill('languages', input.value);
                          input.value = '';
                        }}
                        className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-colors text-sm text-purple-300"
                      >
                        Добавить
                      </button>
                    </div>
                  </div>
                </div>

                {/* Краткое описание */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-cyan-400 font-medium mb-2">📄 Краткое описание</h4>
                  <textarea
                    value={editableData?.summary || ''}
                    onChange={(e) => handleFieldChange('summary', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    rows={4}
                    placeholder="Опишите ваши профессиональные цели и ключевые достижения..."
                  />
                </div>

                {/* Кнопка сохранения */}
                <div className="flex justify-center">
                  <button
                    onClick={handleSaveResumeEdits}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl shadow-xl transition-all hover:from-blue-500 hover:to-purple-500"
                  >
                    ✅ Сохранить изменения
                  </button>
                </div>
                
                {/* Предупреждение о несохраненных изменениях */}
                {hasUnsavedChanges && (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 mt-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <p className="text-yellow-300 text-sm">
                        У вас есть несохраненные изменения. Нажмите "Сохранить изменения" перед переходом к следующему шагу.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Режим просмотра */
              <div className="space-y-4">
                {/* 1. Персональная информация */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-blue-400 font-medium mb-2">👤 Персональная информация</h4>
                  <div className="text-center">
                    <p className="text-white text-lg font-semibold">
                      {displayData.personal_info.first_name} {displayData.personal_info.last_name}
                    </p>
                  </div>
                </div>

                {/* 2. Желаемая позиция */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-yellow-400 font-medium mb-2">🎯 Желаемая позиция</h4>
                  <p className="text-white text-lg font-semibold text-center">
                    {displayData.desired_position || 'Не указана'}
                  </p>
                </div>

                {/* 3. Навыки - гибкое отображение */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-green-400 font-medium mb-3">🛠️ Навыки</h4>
                  
                  {/* Технические навыки */}
                  {displayData.skills.hard_skills?.length > 0 && (
                    <div className="mb-3">
                      <span className="text-gray-300 text-sm font-medium mb-2 block">💻 Технические навыки:</span>
                      <div className="flex flex-wrap gap-2">
                        {displayData.skills.hard_skills.map((skill: string, index: number) => (
                          <span key={index} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Гибкие навыки */}
                  {displayData.skills.soft_skills?.length > 0 && (
                    <div className="mb-3">
                      <span className="text-gray-300 text-sm font-medium mb-2 block">🤝 Гибкие навыки:</span>
                      <div className="flex flex-wrap gap-2">
                        {displayData.skills.soft_skills.map((skill: string, index: number) => (
                          <span key={index} className="bg-green-500/20 text-green-300 px-2 py-1 rounded-lg text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Языки */}
                  {displayData.skills.languages?.length > 0 && (
                    <div>
                      <span className="text-gray-300 text-sm font-medium mb-2 block">🌍 Языки:</span>
                      <div className="flex flex-wrap gap-2">
                        {displayData.skills.languages.map((language: string, index: number) => (
                          <span key={index} className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg text-xs">
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Если навыков нет */}
                  {(!displayData.skills.hard_skills?.length && 
                    !displayData.skills.soft_skills?.length && 
                    !displayData.skills.languages?.length) && (
                    <p className="text-gray-400 text-sm italic">Навыки не извлечены из резюме</p>
                  )}
                </div>

                {/* 4. Резюме кандидата (summary) */}
                {displayData.summary && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="text-cyan-400 font-medium mb-2">📄 Резюме кандидата</h4>
                    <p className="text-white text-sm leading-relaxed">
                      {displayData.summary}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {!isEditing && (
              /* Информационная панель - показываем только в режиме просмотра */
              <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-3 mt-4">
                <h4 className="text-gray-400 font-medium mb-1 text-sm">📊 Полные данные сохранены</h4>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• <span className="text-white">Весь объект данных от API сохранен</span></p>
                  <p>• <span className="text-white">Отображаются только ключевые поля</span></p>
                  <p className="text-green-400 font-medium">✓ Полные данные передаются на следующие шаги</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Отображение ошибок */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium mb-1">Ошибка обработки резюме</p>
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

      {/* Информация о поддерживаемых форматах */}
      {!uploadedFile && !resumeData && !isParsing && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
          <h3 className="text-white font-medium mb-2">📋 Требования к файлу:</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Поддерживаемые форматы: PDF, DOCX</li>
            <li>• Максимальный размер: 10 МБ</li>
            <li>• Файл должен содержать текстовую информацию</li>
            <li>• Рекомендуется структурированное резюме</li>
            <li>• <strong>Время обработки:</strong> до 2 минут для сложных резюме</li>
          </ul>
        </div>
      )}

      {/* НОВАЯ ИНФОРМАЦИЯ: О парсинге и таймауте */}
      {!uploadedFile && !resumeData && !isParsing && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">Простая анимация</span>
          </div>
          <p className="text-gray-300 text-xs">
            4 простых шага по 1 секунде каждый.
            <br />
            Если API быстрее - ждем завершения анимации.
          </p>
        </div>
      )}

      {/* НОВАЯ ИНФОРМАЦИЯ: О парсинге и таймауте */}
      {!uploadedFile && !resumeData && !isParsing && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
          <h3 className="text-white font-medium mb-2">🤖 Как работает обработка:</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• <strong>Глубина:</strong> 8 этапов по 4 секунды каждый</li>
            <li>• <strong>Качество:</strong> Минимум 32 секунды детального анализа</li>
            <li>• <strong>ИИ-анализ:</strong> Нейросети обрабатывают все аспекты резюме</li>
            <li>• <strong>Терпение:</strong> Процесс может занять до 2 минут</li>
            <li>• <strong>Гибкость:</strong> Принимаем данные как есть, без строгой валидации</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;