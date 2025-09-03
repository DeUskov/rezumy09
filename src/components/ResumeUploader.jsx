import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, X, FileText } from 'lucide-react';

/**
 * Компонент для загрузки резюме с валидацией на клиенте и сервере
 * Поддерживает drag-and-drop и выбор файлов через диалог
 */
const ResumeUploader = ({ onUploadComplete, onUploadError }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Константы для валидации
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB в байтах
  const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

  /**
   * Клиентская валидация файла
   * Проверяет тип файла и размер перед отправкой на сервер
   */
  const validateFile = (file) => {
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
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return {
        isValid: false,
        error: 'Неподдерживаемое расширение файла. Используйте .pdf или .docx'
      };
    }

    return { isValid: true };
  };

  /**
   * Вызов Supabase Edge Function для получения подписанного URL
   * Выполняет серверную валидацию перед генерацией URL
   */
  const getSignedUploadUrl = async (file) => {
    try {
      const response = await fetch('/api/upload-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка сервера при подготовке загрузки');
      }

      const data = await response.json();
      return data.signedUrl;
    } catch (error) {
      console.error('Ошибка получения подписанного URL:', error);
      throw error;
    }
  };

  /**
   * Загрузка файла в Supabase Storage используя подписанный URL
   * Отслеживает прогресс загрузки
   */
  const uploadFileToStorage = async (file, signedUrl) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Отслеживание прогресса загрузки
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Ошибка загрузки: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Ошибка сети при загрузке файла'));
      });

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  /**
   * Основная функция обработки загрузки файла
   * Выполняет полный цикл: валидация → получение URL → загрузка
   */
  const handleFileUpload = async (file) => {
    setError(null);
    setUploadProgress(0);

    // Клиентская валидация
    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setIsUploading(true);

    try {
      // Получение подписанного URL с серверной валидацией
      const signedUrl = await getSignedUploadUrl(file);

      // Загрузка файла в Supabase Storage
      await uploadFileToStorage(file, signedUrl);

      // Успешная загрузка
      setUploadedFile(file);
      setIsUploading(false);
      setUploadProgress(100);

      // Уведомление родительского компонента
      if (onUploadComplete) {
        onUploadComplete(file);
      }

    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      const errorMessage = error.message || 'Произошла ошибка при загрузке файла';
      setError(errorMessage);

      // Уведомление родительского компонента об ошибке
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  /**
   * Обработчики drag-and-drop событий
   */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  /**
   * Обработчик выбора файла через input
   */
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  /**
   * Удаление загруженного файла
   */
  const removeFile = () => {
    setUploadedFile(null);
    setError(null);
    setUploadProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Загрузите ваше резюме</h2>
        <p className="text-gray-300">
          Поддерживаются файлы PDF и DOCX размером до 10MB
        </p>
      </div>

      {/* Зона загрузки - показываем только если файл не загружен */}
      {!uploadedFile && (
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
            disabled={isUploading}
          />

          <motion.div
            animate={isUploading ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 1, repeat: isUploading ? Infinity : 0, ease: 'linear' }}
            className="mb-4"
          >
            <Upload className={`w-16 h-16 mx-auto ${
              isDragActive ? 'text-blue-500' : 
              error ? 'text-red-500' : 
              'text-gray-400'
            }`} />
          </motion.div>

          {isUploading ? (
            <div>
              <p className="text-white font-medium mb-2">Загружаем ваше резюме...</p>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-gray-400 text-sm">{uploadProgress}%</p>
            </div>
          ) : (
            <div>
              <p className="text-white font-semibold text-lg mb-2">
                {isDragActive ? 'Отпустите файл здесь' : 'Перетащите файл сюда'}
              </p>
              <p className="text-gray-400">
                или{' '}
                <label htmlFor="file-upload" className="text-blue-400 underline cursor-pointer hover:text-blue-300">
                  выберите файл
                </label>
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Успешно загруженный файл */}
      {uploadedFile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">{uploadedFile.name}</p>
                  <p className="text-green-400 text-sm">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • Загружено успешно
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              title="Удалить файл"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
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
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-red-400 font-medium">Ошибка загрузки</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Информация о поддерживаемых форматах */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
        <h3 className="text-white font-medium mb-2">📋 Требования к файлу:</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Поддерживаемые форматы: PDF, DOCX</li>
          <li>• Максимальный размер: 10 МБ</li>
          <li>• Файл должен содержать текстовую информацию</li>
          <li>• Рекомендуется структурированное резюме</li>
        </ul>
      </div>
    </div>
  );
};

export default ResumeUploader;