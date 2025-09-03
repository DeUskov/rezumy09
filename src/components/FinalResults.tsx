import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Copy, CheckCircle, Send, FileText, BarChart3, Star, Award, Building, Briefcase, Timer, RefreshCw, Loader2, Save, Database } from 'lucide-react';
import { ResumeData, getFullName } from '../types/resumeData';
import { supabase } from '../lib/supabase';

/**
 * НОВЫЙ ИНТЕРФЕЙС: Структура ответа от нового API скорринга
 * Соответствует NewScoringResponse из MatchingResults.tsx
 */
interface NewScoringResponse {
  scoring_result: {
    total_score: number;
    breakdown: {
      hard_skills: {
        score: number;
        summary: string;
        description: string;
      };
      soft_skills: {
        score: number;
        summary: string;
        description: string;
      };
      experience_match: {
        score: number;
        summary: string;
        description: string;
      };
      position_match: {
        score: number;
        summary: string;
        description: string;
      };
    };
    recommendation: string;
    recruiter_recommendation: string;
    candidate_recommendation: string;
  };
}

interface FinalResultsProps {
  coverLetter: string;
  matchingResults: NewScoringResponse | null;
  resumeData?: ResumeData | null; // НОВОЕ: добавляем типизированные данные резюме
  jobData?: any; // НОВОЕ: добавляем данные вакансии
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
  } | null;
  onGenerationSaved?: () => void; // НОВЫЙ проп для уведомления о сохранении
}

const FinalResults: React.FC<FinalResultsProps> = ({ coverLetter, matchingResults, resumeData, jobData, user, onGenerationSaved }) => {
  // НОВЫЕ состояния для сохранения
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setShowSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'letter' | 'scoring'>('letter');
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [showCopyScoringNotification, setShowCopyScoringNotification] = useState(false);


  /**
   * НОВАЯ ФУНКЦИЯ: Генерация текстового представления скорринга
   * 
   * Создает копируемый текст результатов скорринга в читаемом формате
   * для вставки в письма или документы
   * 
   * Формат вывода:
   * 1. Технические навыки: 60%. Анализ...
   * 2. Гибкие навыки: 70%. Анализ...
   * 3. Соответствие опыта: 80%. Анализ...
   * 4. Соответствие должности: 75%. Анализ...
   * 5. Итого: 71%
   * 6. Рекомендация для рекрутера: текст...
   * 
   * @returns строка с форматированными результатами скорринга
   */
  const generateScoringText = (): string => {
    if (!matchingResults?.scoring_result) {
      return 'Результаты скорринга недоступны. Выполните анализ соответствия на предыдущем шаге.';
    }

    const breakdown = matchingResults.scoring_result.breakdown;
    const totalScore = matchingResults.scoring_result.total_score;
    const recruiterRec = matchingResults.scoring_result.recruiter_recommendation;

    const scoringText = `Ниже приведены значения скорринга вакансии и кандидата:

1. Технические навыки: ${breakdown.hard_skills.score}%.
"${breakdown.hard_skills.summary}"

2. Гибкие навыки: ${breakdown.soft_skills.score}%.
"${breakdown.soft_skills.summary}"

3. Соответствие опыта: ${breakdown.experience_match.score}%.
"${breakdown.experience_match.summary}"

4. Соответствие должности: ${breakdown.position_match.score}%.
"${breakdown.position_match.summary}"

5. Итого: ${totalScore}%

6. Рекомендация для рекрутера от ИИ: "${recruiterRec}"`;

    return scoringText;
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Копирование текста скорринга
   * 
   * Копирует текстовое представление результатов скорринга в буфер обмена
   * с показом уведомления об успешном копировании
   */
  const copyScoringText = () => {
    const scoringText = generateScoringText();
    
    try {
      navigator.clipboard.writeText(scoringText).then(() => {
        setShowCopyScoringNotification(true);
        setTimeout(() => {
          setShowCopyScoringNotification(false);
        }, 2000);
      }).catch((error) => {
        console.error('Ошибка при копировании текста скорринга:', error);
        
        // Fallback для старых браузеров
        try {
          const textArea = document.createElement('textarea');
          textArea.value = scoringText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          
          setShowCopyScoringNotification(true);
          setTimeout(() => {
            setShowCopyScoringNotification(false);
          }, 2000);
        } catch (fallbackError) {
          console.error('Fallback копирование также не удалось:', fallbackError);
          alert('Не удалось скопировать текст. Попробуйте выделить и скопировать вручную.');
        }
      });
    } catch (error) {
      console.error('Clipboard API недоступен:', error);
      alert('Функция копирования недоступна в вашем браузере');
    }
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Сохранение результатов генерации в базу данных
   * 
   * Отправляет все данные генерации на Supabase Edge Function для сохранения
   * После успешного сохранения показывает уведомление
   */
  const handleSaveGeneration = async () => {
    if (!matchingResults || !coverLetter || !resumeData || !jobData || !user) {
      setSaveError('Отсутствуют необходимые данные для сохранения');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      console.log('💾 Начинаем сохранение генерации в базу данных');
      
      // Получаем текущую сессию пользователя
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Пользователь не аутентифицирован');
      }

      // Подготавливаем данные для сохранения
      const saveData = {
        job_title: jobData.job_title || jobData.title || 'Неизвестная должность',
        company_name: jobData.company_name || 'Неизвестная компания',
        overall_score: matchingResults.scoring_result.total_score,
        cover_letter_text: coverLetter,
        scoring_results_json: matchingResults,
        resume_data_json: resumeData,
        job_data_json: jobData,
        title: `${jobData.job_title || 'Должность'} в ${jobData.company_name || 'компании'}`,
        status: 'completed'
      };

      console.log('📤 Отправляем данные на сохранение:', {
        job_title: saveData.job_title,
        company_name: saveData.company_name,
        overall_score: saveData.overall_score,
        letter_length: saveData.cover_letter_text.length,
        has_scoring: !!saveData.scoring_results_json,
        has_resume: !!saveData.resume_data_json,
        has_job_data: !!saveData.job_data_json
      });

      // Отправляем запрос на Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(saveData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Генерация успешно сохранена:', result);

      // Показываем уведомление об успешном сохранении
      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
        // НОВОЕ: Уведомляем родительский компонент о сохранении
        if (onGenerationSaved) {
          onGenerationSaved();
        }
      }, 3000);

    } catch (error: any) {
      console.error('❌ Ошибка при сохранении генерации:', error);
      setSaveError(`Не удалось сохранить результаты: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * ОБНОВЛЕННАЯ ФУНКЦИЯ: Копирование письма с уведомлением
   * 
   * ИСПРАВЛЕНО: Добавлено визуальное уведомление о копировании
   * 
   * Логика работы:
   * 1. Копирует текст письма в буфер обмена
   * 2. Показывает анимированное уведомление об успешном копировании
   * 3. Автоматически скрывает уведомление через 2 секунды
   * 4. Обрабатывает ошибки копирования (например, в старых браузерах)
   * 
   * Пример использования:
   * - Пользователь нажимает кнопку "Копировать"
   * - Текст копируется в буфер обмена
   * - Появляется зеленое уведомление "Скопировано!"
   * - Уведомление исчезает через 2 секунды
   */
  const copyLetter = () => {
    try {
      // Копируем текст в буфер обмена
      navigator.clipboard.writeText(coverLetter).then(() => {
        // Показываем уведомление об успешном копировании
        setShowCopyNotification(true);
        
        // Автоматически скрываем уведомление через 2 секунды
        setTimeout(() => {
          setShowCopyNotification(false);
        }, 2000);
      }).catch((error) => {
        console.error('Ошибка при копировании в буфер обмена:', error);
        
        // Fallback для старых браузеров - используем устаревший API
        try {
          const textArea = document.createElement('textarea');
          textArea.value = coverLetter;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          
          // Показываем уведомление
          setShowCopyNotification(true);
          setTimeout(() => {
            setShowCopyNotification(false);
          }, 2000);
        } catch (fallbackError) {
          console.error('Fallback копирование также не удалось:', fallbackError);
          alert('Не удалось скопировать текст. Попробуйте выделить и скопировать вручную.');
        }
      });
    } catch (error) {
      console.error('Clipboard API недоступен:', error);
      alert('Функция копирования недоступна в вашем браузере');
    }
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

  // Определение уровня соответствия
  const getMatchLevel = (score: number) => {
    if (score >= 90) return 'Превосходное соответствие';
    if (score >= 80) return 'Отличное соответствие';
    if (score >= 70) return 'Хорошее соответствие';
    if (score >= 60) return 'Среднее соответствие';
    if (score >= 40) return 'Низкое соответствие';
    return 'Слабое соответствие';
  };

  return (
    <div className="space-y-6">
      {/* НОВОЕ: Модальное уведомление о копировании */}
      {showCopyNotification && (
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
              <p className="text-white font-semibold">Скопировано!</p>
              <p className="text-green-100 text-sm">Сопроводительное письмо скопировано в буфер обмена</p>
            </div>
          </div>
          
          {/* Анимированный прогресс-бар исчезновения */}
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-green-300 rounded-b-2xl"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 2, ease: "linear" }}
          />
        </motion.div>
      )}

      {/* НОВОЕ: Уведомление об успешном сохранении */}
      {saveSuccess && (
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
              <Database className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <p className="text-white font-semibold">Результаты сохранены!</p>
              <p className="text-green-100 text-sm">Генерация добавлена в ваш личный кабинет</p>
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

      {/* НОВОЕ: Уведомление о копировании текста скорринга */}
      {showCopyScoringNotification && (
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
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-purple-500/90 backdrop-blur-xl border border-purple-400/30 rounded-2xl px-6 py-4 shadow-2xl"
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
              <p className="text-white font-semibold">Скорринг скопирован!</p>
              <p className="text-purple-100 text-sm">Текст результатов скопирован в буфер обмена</p>
            </div>
          </div>
          
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-purple-300 rounded-b-2xl"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 2, ease: "linear" }}
          />
        </motion.div>
      )}

      {/* Заголовок */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="mb-4"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-2xl">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Готово! 🎉</h2>
        <p className="text-gray-300">
          Ваше сопроводительное письмо и анализ соответствия готовы
        </p>
      </div>

      {/* Краткая сводка */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {matchingResults?.scoring_result?.total_score || 0}%
            </div>
            <div className="text-sm text-gray-300">Соответствие</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {coverLetter.split(' ').length}
            </div>
            <div className="text-sm text-gray-300">Слов в письме</div>
          </div>
        </div>
        
        {/* НОВОЕ: Информация о PDF */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mt-4">
          <h4 className="text-white font-medium mb-2">📄 PDF содержит:</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• <strong>Полное сопроводительное письмо</strong> в профессиональном оформлении</li>
            <li>• <strong>Общий балл соответствия</strong> с цветовой индикацией и графиками</li>
            <li>• <strong>Детальные метрики</strong> по всем критериям с прогресс-барами</li>
            <li>• <strong>Персональные рекомендации</strong> от Gemini AI для улучшения</li>
            <li>• <strong>Информация о кандидате</strong> и метаданные анализа</li>
            <li>• <strong>Готовый к печати формат</strong> для презентации работодателю</li>
          </ul>
        </div>
      </motion.div>

      {/* Переключатель вкладок */}
      <div className="flex bg-white/5 rounded-2xl p-1">
        <button
          onClick={() => setActiveTab('letter')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'letter'
              ? 'bg-blue-500/20 text-blue-300'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Письмо</span>
        </button>
        <button
          onClick={() => setActiveTab('scoring')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 ${
            activeTab === 'scoring'
              ? 'bg-purple-500/20 text-purple-300'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Скорринг</span>
        </button>
      </div>

      {/* Контент вкладок */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'letter' ? (
          /* Сопроводительное письмо */
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="text-white whitespace-pre-wrap font-mono text-sm leading-relaxed max-h-80 overflow-y-auto">
                {coverLetter}
              </div>
            </div>
            
            {/* Действия с письмом */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={copyLetter}
                className="flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Copy className="w-4 h-4" />
                <span>Копировать</span>
              </button>
              
              {/* НОВАЯ КНОПКА: Сохранить вместо PDF */}
              <button
                onClick={handleSaveGeneration}
                className="flex items-center justify-center space-x-2 py-3 px-4 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Сохраняем...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Сохранить</span>
                  </>
                )}
              </button>
            </div>
            
            {/* НОВОЕ: Отображение ошибок сохранения */}
            {saveError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h4 className="text-red-400 font-medium">Ошибка сохранения</h4>
                </div>
                <p className="text-red-300 text-sm">{saveError}</p>
                <button
                  onClick={() => setSaveError(null)}
                  className="text-red-400 hover:text-red-300 text-sm underline transition-colors mt-2"
                >
                  Скрыть ошибку
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ОБНОВЛЕННАЯ ВКЛАДКА: Результаты скорринга с текстовым форматом */
          <div className="space-y-6">
            {matchingResults ? (
              <div className="space-y-6">
                {/* Краткая сводка */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-4">
                    🎯 Общий балл: {matchingResults.scoring_result.total_score}%
                  </div>
                  <p className="text-gray-300 text-lg mb-2">
                    {getMatchLevel(matchingResults.scoring_result.total_score)}
                  </p>
                  <p className="text-gray-400 text-sm">
                    🤖 Анализ выполнен через Gemini AI v2.0
                  </p>
                </div>

                {/* НОВОЕ: Текстовый формат для копирования */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-lg">📊 Результаты для копирования</h3>
                    <button
                      onClick={copyScoringText}
                      className="flex items-center justify-center space-x-2 py-2 px-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Копировать текст</span>
                    </button>
                  </div>
                  
                  <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 max-h-80 overflow-y-auto">
                    <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                      {generateScoringText()}
                    </pre>
                  </div>
                  
                  <p className="text-gray-400 text-xs mt-3">
                    💡 Этот текст можно скопировать и вставить в письмо рекрутеру или отчет
                  </p>
                </div>

                {/* Краткая визуальная сводка (упрощенная) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      💻 {matchingResults.scoring_result.breakdown.hard_skills.score}%
                    </div>
                    <div className="text-blue-400 text-sm font-medium">Технические навыки</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      🤝 {matchingResults.scoring_result.breakdown.soft_skills.score}%
                    </div>
                    <div className="text-green-400 text-sm font-medium">Гибкие навыки</div>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      💼 {matchingResults.scoring_result.breakdown.experience_match.score}%
                    </div>
                    <div className="text-purple-400 text-sm font-medium">Соответствие опыта</div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      🎯 {matchingResults.scoring_result.breakdown.position_match.score}%
                    </div>
                    <div className="text-yellow-400 text-sm font-medium">Соответствие должности</div>
                  </div>
                </div>
              </div>
            ) : (
              /* Fallback если нет данных скорринга */
              <div className="text-center py-8">
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-2xl p-6">
                  <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">Данные скорринга недоступны</h3>
                  <p className="text-gray-400 text-sm">
                    Вернитесь к шагу "Скорринг" для выполнения анализа соответствия
                  </p>
                </div>
              </div>
            )}

            {/* ОБНОВЛЕННАЯ ИНФОРМАЦИЯ: О сохранении вместо PDF */}
            {matchingResults && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                <h4 className="text-white font-medium mb-2">💾 Что будет сохранено:</h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• <strong>Полное сопроводительное письмо</strong> для повторного использования</li>
                  <li>• <strong>Детальные результаты скорринга</strong> по всем 4 параметрам</li>
                  <li>• <strong>Данные резюме и вакансии</strong> для контекста</li>
                  <li>• <strong>Персональные рекомендации</strong> от Gemini AI</li>
                  <li>• <strong>История генераций</strong> в личном кабинете</li>
                  <li>• <strong>Возможность повторного просмотра</strong> и анализа</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FinalResults;