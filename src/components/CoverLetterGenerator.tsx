import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Send, Edit3, Save, X, CheckCircle, AlertCircle, Loader2, Brain, Sparkles } from 'lucide-react';
import { ResumeData, getFullName } from '../types/resumeData';

interface CoverLetterGeneratorProps {
  onGenerationComplete: (letter: string) => void;
  onEditingStateChange: (isEditing: boolean, hasUnsavedChanges: boolean) => void;
  savedLetter: string;
  resumeData: ResumeData | null;
  jobData: any;
}

/**
 * ОБНОВЛЕННЫЙ компонент генерации сопроводительного письма
 * 
 * НОВЫЕ ВОЗМОЖНОСТИ:
 * - Выбор стиля письма (4 варианта): Нейтральный, Креативный, Стартап, Строгий
 * - Настройки акцентов с dropdown + теги:
 *   - Опыт для акцента (лимит 2)
 *   - Образование для акцента (лимит 2) 
 *   - Навыки для акцента (лимит 4)
 * - Интерактивное редактирование сгенерированного письма
 * - Отслеживание состояния редактирования для Dashboard
 * 
 * Логика работы:
 * 1. Пользователь настраивает стиль и акценты (опционально)
 * 2. Генерируется письмо через API с учетом настроек
 * 3. Пользователь может редактировать результат
 * 4. Изменения автоматически сохраняются и передаются в Dashboard
 */
const CoverLetterGenerator: React.FC<CoverLetterGeneratorProps> = ({ 
  onGenerationComplete, 
  onEditingStateChange,
  savedLetter, 
  resumeData, 
  jobData 
}) => {
  // Основные состояния
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState(savedLetter || '');
  const [error, setError] = useState<string | null>(null);
  
  // Состояния для редактирования
  const [isEditing, setIsEditing] = useState(false);
  const [editedLetter, setEditedLetter] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // НОВЫЕ состояния для настроек письма
  const [letterStyle, setLetterStyle] = useState<'neutral' | 'creative' | 'startup' | 'formal'>('neutral');
  
  // Состояния для акцентов
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);
  const [selectedEducation, setSelectedEducation] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Генерация тестового user_id
  const generateDevUserId = (): string => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    return `${day}${month}${year}_${hours}${minutes}`;
  };

  // Восстановление сохраненного письма при монтировании
  useEffect(() => {
    if (savedLetter && !generatedLetter) {
      setGeneratedLetter(savedLetter);
      setEditedLetter(savedLetter);
    }
  }, [savedLetter, generatedLetter]);

  // Уведомление родительского компонента о состоянии редактирования
  useEffect(() => {
    onEditingStateChange(isEditing, hasUnsavedChanges);
  }, [isEditing, hasUnsavedChanges, onEditingStateChange]);

  /**
   * ОБНОВЛЕННАЯ ФУНКЦИЯ: Генерация сопроводительного письма с настройками
   */
  const generateCoverLetter = async () => {
    if (!resumeData || !jobData) {
      setError('Отсутствуют данные резюме или вакансии');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const userId = generateDevUserId();
      
      // Формируем payload с настройками стиля и акцентов
      const requestPayload = {
        resume_data: resumeData,
        job_data: jobData,
        user_id: userId,
        customization: {
          letter_style: letterStyle,
          highlight_experience: selectedExperience,
          highlight_education: selectedEducation,
          highlight_skills: selectedSkills
        }
      };

      console.log('📤 Генерация письма с настройками:', requestPayload);

      const response = await fetch('https://77xihg.buildship.run/cvV2Json-8e263af8b451', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const letter = data.letter_text || data.cover_letter || data.letter || 'Письмо не сгенерировано';
      
      setGeneratedLetter(letter);
      setEditedLetter(letter);
      onGenerationComplete(letter);
      
      console.log('✅ Письмо сгенерировано успешно');
      
    } catch (err: any) {
      console.error('❌ Ошибка генерации письма:', err);
      setError(`Не удалось сгенерировать письмо: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Начать редактирование письма
   */
  const startEditing = () => {
    setIsEditing(true);
    setEditedLetter(generatedLetter);
    setHasUnsavedChanges(false);
  };

  /**
   * Сохранить изменения
   */
  const saveChanges = () => {
    setGeneratedLetter(editedLetter);
    setIsEditing(false);
    setHasUnsavedChanges(false);
    onGenerationComplete(editedLetter);
  };

  /**
   * Отменить редактирование
   */
  const cancelEditing = () => {
    setIsEditing(false);
    setEditedLetter(generatedLetter);
    setHasUnsavedChanges(false);
  };

  /**
   * Обработка изменения текста письма
   */
  const handleLetterChange = (value: string) => {
    setEditedLetter(value);
    setHasUnsavedChanges(value !== generatedLetter);
  };

  /**
   * Сброс всех настроек
   */
  const resetAllSettings = () => {
    setLetterStyle('neutral');
    setSelectedExperience([]);
    setSelectedEducation([]);
    setSelectedSkills([]);
  };

  // Получение опций для dropdown из данных резюме
  const experienceOptions = resumeData?.experience.map((exp, index) => ({
    value: `${exp.position} в ${exp.company}`,
    label: `${exp.position} в ${exp.company}`,
    key: `exp-${index}`
  })) || [];

  const educationOptions = resumeData?.education.map((edu, index) => ({
    value: edu.institution + (edu.degree ? ` - ${edu.degree}` : ''),
    label: edu.institution + (edu.degree ? ` - ${edu.degree}` : ''),
    key: `edu-${index}`
  })) || [];

  const skillOptions = [
    ...(resumeData?.skills.hard_skills || []),
    ...(resumeData?.skills.soft_skills || [])
  ].map((skill, index) => ({
    value: skill,
    label: skill,
    key: `skill-${index}`
  }));

  // Функции для работы с тегами
  const removeExperience = (index: number) => {
    setSelectedExperience(prev => prev.filter((_, i) => i !== index));
  };

  const removeEducation = (index: number) => {
    setSelectedEducation(prev => prev.filter((_, i) => i !== index));
  };

  const removeSkill = (index: number) => {
    setSelectedSkills(prev => prev.filter((_, i) => i !== index));
  };

  const addExperience = (value: string) => {
    if (value && selectedExperience.length < 2 && !selectedExperience.includes(value)) {
      setSelectedExperience(prev => [...prev, value]);
    }
  };

  const addEducation = (value: string) => {
    if (value && selectedEducation.length < 2 && !selectedEducation.includes(value)) {
      setSelectedEducation(prev => [...prev, value]);
    }
  };

  const addSkill = (value: string) => {
    if (value && selectedSkills.length < 4 && !selectedSkills.includes(value)) {
      setSelectedSkills(prev => [...prev, value]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Генерация сопроводительного письма</h2>
        <p className="text-gray-300">
          ИИ создаст персональное письмо на основе вашего резюме и вакансии
        </p>
      </div>

      {!generatedLetter ? (
        <>
          {/* Основная информация о том, что делает ИИ */}
          <div className="bg-gray-500/10 border border-gray-500/20 rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Brain className="w-6 h-6 text-purple-400" />
              <h3 className="text-white font-semibold text-lg">🤖 Что делает ИИ:</h3>
            </div>
            <ul className="text-gray-300 space-y-2">
              <li>• Анализирует ваши навыки и опыт из резюме</li>
              <li>• Изучает требования и культуру компании</li>
              <li>• Создает персональное письмо под конкретную вакансию</li>
              <li>• Подчеркивает ключевые совпадения с требованиями</li>
              <li>• Использует профессиональный тон и структуру</li>
              <li>• Выделяет релевантные навыки, опыт и образование</li>
              <li>• Возвращает структурированный ответ с метаданными</li>
            </ul>
          </div>

          {/* Выбор стиля письма */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-blue-400 font-semibold">📝 Стиль письма</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { key: 'neutral', label: 'Нейтральный', desc: 'Классический деловой стиль' },
                { key: 'creative', label: 'Креативный', desc: 'Яркий и запоминающийся' },
                { key: 'startup', label: 'Стартап', desc: 'Современный и гибкий' },
                { key: 'formal', label: 'Строгий', desc: 'Консервативный и официальный' }
              ].map((style) => (
                <motion.button
                  key={style.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setLetterStyle(style.key as any)}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    letterStyle === style.key
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="font-medium mb-1">{style.label}</div>
                  <div className="text-xs opacity-80">{style.desc}</div>
                </motion.button>
              ))}
            </div>
            
            <div className="text-sm text-blue-300">
              ✅ Выбран стиль: <strong>{
                letterStyle === 'neutral' ? 'Нейтральный' :
                letterStyle === 'creative' ? 'Креативный' :
                letterStyle === 'startup' ? 'Стартап' : 'Строгий'
              }</strong>
            </div>
          </div>

          {/* Настройки акцентов */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-purple-400 font-semibold">🎯 Акценты в письме</h3>
              </div>
              <button
                onClick={resetAllSettings}
                className="px-3 py-1 bg-gray-500/20 hover:bg-gray-500/30 rounded-lg transition-colors text-xs text-gray-300"
              >
                Сбросить все
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Опыт для акцента */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">💼 Опыт для акцента (макс. 2):</label>
                
                {/* Теги выбранного опыта */}
                {selectedExperience.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedExperience.map((exp, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg text-sm flex items-center space-x-1"
                      >
                        <span>{exp}</span>
                        <button
                          onClick={() => removeExperience(index)}
                          className="text-red-400 hover:text-red-300 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    ))}
                  </div>
                )}
                
                {/* Dropdown для выбора опыта */}
                <select
                  value=""
                  onChange={(e) => addExperience(e.target.value)}
                  disabled={selectedExperience.length >= 2}
                  className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedExperience.length >= 2 
                      ? 'Достигнут лимит (2/2)' 
                      : experienceOptions.filter(opt => !selectedExperience.includes(opt.value)).length === 0
                      ? 'Нет доступных вариантов'
                      : 'Выберите опыт для акцента'
                    }
                  </option>
                  {experienceOptions
                    .filter(opt => !selectedExperience.includes(opt.value))
                    .map(option => (
                      <option key={option.key} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </div>

              {/* Образование для акцента */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">🎓 Образование для акцента (макс. 2):</label>
                
                {/* Теги выбранного образования */}
                {selectedEducation.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedEducation.map((edu, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-green-500/20 text-green-300 px-2 py-1 rounded-lg text-sm flex items-center space-x-1"
                      >
                        <span>{edu}</span>
                        <button
                          onClick={() => removeEducation(index)}
                          className="text-red-400 hover:text-red-300 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    ))}
                  </div>
                )}
                
                {/* Dropdown для выбора образования */}
                <select
                  value=""
                  onChange={(e) => addEducation(e.target.value)}
                  disabled={selectedEducation.length >= 2}
                  className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedEducation.length >= 2 
                      ? 'Достигнут лимит (2/2)' 
                      : educationOptions.filter(opt => !selectedEducation.includes(opt.value)).length === 0
                      ? 'Нет доступных вариантов'
                      : 'Выберите образование для акцента'
                    }
                  </option>
                  {educationOptions
                    .filter(opt => !selectedEducation.includes(opt.value))
                    .map(option => (
                      <option key={option.key} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </div>

              {/* Навыки для акцента */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">🛠️ Навыки для акцента (макс. 4):</label>
                
                {/* Теги выбранных навыков */}
                {selectedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedSkills.map((skill, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg text-sm flex items-center space-x-1"
                      >
                        <span>{skill}</span>
                        <button
                          onClick={() => removeSkill(index)}
                          className="text-red-400 hover:text-red-300 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    ))}
                  </div>
                )}
                
                {/* Dropdown для выбора навыков */}
                <select
                  value=""
                  onChange={(e) => addSkill(e.target.value)}
                  disabled={selectedSkills.length >= 4}
                  className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedSkills.length >= 4 
                      ? 'Достигнут лимит (4/4)' 
                      : skillOptions.filter(opt => !selectedSkills.includes(opt.value)).length === 0
                      ? 'Нет доступных вариантов'
                      : 'Выберите навыки для акцента'
                    }
                  </option>
                  {skillOptions
                    .filter(opt => !selectedSkills.includes(opt.value))
                    .map(option => (
                      <option key={option.key} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </div>

              {/* Сводка выбранных настроек */}
              {(selectedExperience.length > 0 || selectedEducation.length > 0 || selectedSkills.length > 0) && (
                <div className="bg-white/5 rounded-xl p-3 mt-4">
                  <h4 className="text-white font-medium mb-2 text-sm">✨ Выбранные акценты:</h4>
                  <div className="text-xs text-gray-300 space-y-1">
                    {selectedExperience.length > 0 && (
                      <div>💼 <strong>Опыт:</strong> {selectedExperience.join(', ')}</div>
                    )}
                    {selectedEducation.length > 0 && (
                      <div>🎓 <strong>Образование:</strong> {selectedEducation.join(', ')}</div>
                    )}
                    {selectedSkills.length > 0 && (
                      <div>🛠️ <strong>Навыки:</strong> {selectedSkills.join(', ')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Кнопка генерации */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateCoverLetter}
            disabled={!resumeData || !jobData || isGenerating}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-5 h-5" />
                </motion.div>
                <span>Генерируем письмо...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Сгенерировать письмо</span>
              </>
            )}
          </motion.button>
        </>
      ) : (
        /* Отображение сгенерированного письма */
        <div className="space-y-6">
          {/* Заголовок результата */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <span className="text-green-400 font-medium">Письмо готово!</span>
            </div>
            <button
              onClick={() => {
                setGeneratedLetter('');
                setEditedLetter('');
                setError(null);
                onGenerationComplete('');
              }}
              className="text-blue-400 hover:text-blue-300 text-sm underline transition-colors"
            >
              Сгенерировать новое
            </button>
          </div>

          {/* Письмо */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            {isEditing ? (
              /* Режим редактирования */
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">✏️ Редактирование письма</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={saveChanges}
                      className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 rounded-lg transition-colors text-sm text-green-300 flex items-center space-x-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>Сохранить</span>
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors text-sm text-red-300 flex items-center space-x-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Отмена</span>
                    </button>
                  </div>
                </div>
                
                <textarea
                  value={editedLetter}
                  onChange={(e) => handleLetterChange(e.target.value)}
                  className="w-full h-96 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 text-white resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Редактируйте текст письма..."
                />
                
                {hasUnsavedChanges && (
                  <div className="text-yellow-400 text-sm flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>У вас есть несохраненные изменения</span>
                  </div>
                )}
              </div>
            ) : (
              /* Режим просмотра */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">📝 Сопроводительное письмо</h3>
                  <button
                    onClick={startEditing}
                    className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors text-sm text-blue-300 flex items-center space-x-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Редактировать</span>
                  </button>
                </div>
                
                <div className="text-white whitespace-pre-wrap leading-relaxed bg-white/5 rounded-xl p-4 max-h-96 overflow-y-auto">
                  {generatedLetter}
                </div>
              </div>
            )}
          </div>

          {/* Информация о настройках */}
          <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4">
            <h4 className="text-white font-medium mb-2 text-sm">⚙️ Использованные настройки:</h4>
            <div className="text-xs text-gray-300 space-y-1">
              <div>📝 <strong>Стиль:</strong> {
                letterStyle === 'neutral' ? 'Нейтральный' :
                letterStyle === 'creative' ? 'Креативный' :
                letterStyle === 'startup' ? 'Стартап' : 'Строгий'
              }</div>
              {selectedExperience.length > 0 && (
                <div>💼 <strong>Акцент на опыте:</strong> {selectedExperience.join(', ')}</div>
              )}
              {selectedEducation.length > 0 && (
                <div>🎓 <strong>Акцент на образовании:</strong> {selectedEducation.join(', ')}</div>
              )}
              {selectedSkills.length > 0 && (
                <div>🛠️ <strong>Акцент на навыках:</strong> {selectedSkills.join(', ')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ошибки */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-red-400 font-medium">Ошибка генерации</h3>
          </div>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default CoverLetterGenerator;