import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Link2, FileText, BarChart3, Settings, User, Mail, LogOut, Plus, Calendar, Building, Star, Eye, Trash2, Search, Filter } from 'lucide-react';
import ResumeUpload from './ResumeUpload';
import JobAnalysis from './JobAnalysis';
import CoverLetterGenerator from './CoverLetterGenerator';
import MatchingResults from './MatchingResults';
import FinalResults from './FinalResults';
import { supabase } from '../lib/supabase';
import { ResumeData } from '../types/resumeData';
import { Generation, GenerationSummary, getFormattedCreatedDate, getScoreColor, getStatusText, getStatusColor } from '../types/generation';

interface DashboardProps {
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

// Типы для шагов процесса
type Step = 'dashboard' | 'upload' | 'analyze' | 'generate' | 'scoring' | 'final';

// Данные шагов
const steps = [
  { id: 'dashboard', title: 'Личный кабинет', icon: User, description: 'Просмотр сохраненных генераций и создание новых' },
  { id: 'upload', title: 'Загрузка Резюме', icon: Upload, description: 'Загрузите ваше резюме в формате PDF или DOCX' },
  { id: 'analyze', title: 'Загрузка вакансии', icon: Link2, description: 'Вставьте ссылку на интересную вакансию' },
  { id: 'generate', title: 'Генерация Письма', icon: FileText, description: 'Сгенерируйте персональное сопроводительное письмо' },
  { id: 'scoring', title: 'Скорринг', icon: BarChart3, description: 'Посмотрите анализ соответствия и рекомендации' },
  { id: 'final', title: 'Итого', icon: Mail, description: 'Финальные результаты и отправка' }
];

// Интерфейсы для сохранения данных
interface SavedData {
  resume: File | null;
  resumeData: ResumeData | null; // Типизированные данные из резюме
  jobAnalysis: any;
  coverLetter: string;
  matchingResults: any;
}

/**
 * ОБНОВЛЕННЫЙ Dashboard компонент
 * Добавлено отображение имени пользователя и кнопка выхода
 */
const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [currentStep, setCurrentStep] = useState<Step>('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // НОВЫЕ СОСТОЯНИЯ для личного кабинета
  const [savedGenerations, setSavedGenerations] = useState<GenerationSummary[]>([]);
  const [isLoadingGenerations, setIsLoadingGenerations] = useState(false);
  const [generationsError, setGenerationsError] = useState<string | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'company'>('date');
  
  // Состояния для отслеживания завершения этапов
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [jobAnalyzed, setJobAnalyzed] = useState(false);
  const [letterGenerated, setLetterGenerated] = useState(false);
  const [scoringCompleted, setScoringCompleted] = useState(false);

  // НОВЫЕ СОСТОЯНИЯ для отслеживания редактирования сопроводительного письма
  const [isCoverLetterEditing, setIsCoverLetterEditing] = useState(false);
  const [hasUnsavedCoverLetterChanges, setHasUnsavedCoverLetterChanges] = useState(false);

  // Сохраненные данные для каждого этапа
  const [savedData, setSavedData] = useState<SavedData>({
    resume: null,
    resumeData: null,
    jobAnalysis: null,
    coverLetter: '',
    matchingResults: null
  });

  /**
   * НОВАЯ ФУНКЦИЯ: Загрузка сохраненных генераций пользователя
   */
  const loadSavedGenerations = async () => {
    if (!user?.id) return;

    setIsLoadingGenerations(true);
    setGenerationsError(null);

    try {
      console.log('📥 Загрузка сохраненных генераций для пользователя:', user.id);

      const { data: generations, error } = await supabase
        .from('generations')
        .select(`
          id,
          created_at,
          job_title,
          company_name,
          overall_score,
          title,
          status
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Ошибка при загрузке генераций:', error);
        throw error;
      }

      console.log('✅ Загружено генераций:', generations?.length || 0);
      setSavedGenerations(generations || []);

    } catch (err: any) {
      console.error('❌ Ошибка загрузки генераций:', err);
      setGenerationsError(`Не удалось загрузить историю: ${err.message}`);
    } finally {
      setIsLoadingGenerations(false);
    }
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Загрузка детальной информации о генерации
   */
  const loadGenerationDetails = async (generationId: string) => {
    setIsLoadingDetails(true);

    try {
      console.log('📄 Загрузка деталей генерации:', generationId);

      const { data: generation, error } = await supabase
        .from('generations')
        .select('*')
        .eq('id', generationId)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('❌ Ошибка при загрузке деталей генерации:', error);
        throw error;
      }

      console.log('✅ Детали генерации загружены');
      setSelectedGeneration(generation);

    } catch (err: any) {
      console.error('❌ Ошибка загрузки деталей:', err);
      alert(`Не удалось загрузить детали: ${err.message}`);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Удаление генерации
   */
  const deleteGeneration = async (generationId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту генерацию? Это действие нельзя отменить.')) {
      return;
    }

    try {
      console.log('🗑️ Удаление генерации:', generationId);

      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', generationId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('❌ Ошибка при удалении генерации:', error);
        throw error;
      }

      console.log('✅ Генерация удалена');
      
      // Обновляем список генераций
      setSavedGenerations(prev => prev.filter(gen => gen.id !== generationId));
      
      // Закрываем модальное окно если оно открыто
      if (selectedGeneration?.id === generationId) {
        setSelectedGeneration(null);
      }

    } catch (err: any) {
      console.error('❌ Ошибка удаления:', err);
      alert(`Не удалось удалить генерацию: ${err.message}`);
    }
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Начать новую генерацию
   */
  const startNewGeneration = () => {
    console.log('🆕 Начинаем новую генерацию');
    
    // Сбрасываем все состояния
    setResumeUploaded(false);
    setJobAnalyzed(false);
    setLetterGenerated(false);
    setScoringCompleted(false);
    setIsCoverLetterEditing(false);
    setHasUnsavedCoverLetterChanges(false);
    
    // Очищаем сохраненные данные
    setSavedData({
      resume: null,
      resumeData: null,
      jobAnalysis: null,
      coverLetter: '',
      matchingResults: null
    });
    
    // Переходим к первому шагу
    setCurrentStep('upload');
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Возврат в личный кабинет
   */
  const returnToDashboard = () => {
    setCurrentStep('dashboard');
    // Перезагружаем генерации на случай если были изменения
    loadSavedGenerations();
  };

  // Загружаем генерации при монтировании компонента или изменении пользователя
  useEffect(() => {
    if (user?.id && currentStep === 'dashboard') {
      loadSavedGenerations();
    }
  }, [user?.id, currentStep]);

  /**
   * НОВАЯ ФУНКЦИЯ: Выход из системы
   */
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Ошибка при выходе:', error);
      } else {
        console.log('Пользователь вышел из системы');
        // Очищаем локальные данные
        localStorage.removeItem('jobmatch-onboarding-complete');
      }
    } catch (error) {
      console.error('Ошибка при выходе из системы:', error);
    }
  };

  // ОБНОВЛЕННАЯ ФУНКЦИЯ - обрабатывает загрузку резюме и его данные
  const handleResumeUpload = (data: { file: File; resumeData: ResumeData }) => {
    setSavedData(prev => ({ 
      ...prev, 
      resume: data.file,
      resumeData: data.resumeData 
    }));
    setResumeUploaded(true);
  };

  // ИСПРАВЛЕННАЯ ФУНКЦИЯ - обрабатывает сброс данных анализа
  const handleJobAnalysis = (analysisData: any) => {
    setSavedData(prev => ({ ...prev, jobAnalysis: analysisData }));
    
    // Если данные сброшены (null), сбрасываем состояние завершения
    if (analysisData === null) {
      setJobAnalyzed(false);
      // Также сбрасываем последующие этапы, так как они зависят от анализа вакансии
      setLetterGenerated(false);
      setScoringCompleted(false);
      setSavedData(prev => ({ 
        ...prev, 
        jobAnalysis: null, 
        coverLetter: '', 
        matchingResults: null 
      }));
    } else {
      setJobAnalyzed(true);
    }
  };

  const handleLetterGeneration = (letter: string) => {
    setSavedData(prev => ({ ...prev, coverLetter: letter }));
    setLetterGenerated(true);
  };

  // НОВАЯ ФУНКЦИЯ: Обработчик изменения состояния редактирования письма
  const handleCoverLetterEditingStateChange = (isEditing: boolean, hasUnsavedChanges: boolean) => {
    setIsCoverLetterEditing(isEditing);
    setHasUnsavedCoverLetterChanges(hasUnsavedChanges);
  };

  const handleScoringComplete = (scoringData: any) => {
    setSavedData(prev => ({ ...prev, matchingResults: scoringData }));
    setScoringCompleted(true);
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Обработчик успешного сохранения генерации
   */
  const handleGenerationSaved = () => {
    console.log('✅ Генерация сохранена, возвращаемся в личный кабинет');
    returnToDashboard();
  };

  // Переход к следующему этапу
  const goToNextStep = () => {
    const stepOrder: Step[] = ['dashboard', 'upload', 'analyze', 'generate', 'scoring', 'final'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  // Проверка возможности перехода к следующему этапу
  const canProceedToNext = () => {
    switch (currentStep) {
      case 'dashboard':
        return false; // Из личного кабинета переходим через кнопку "Создать письмо"
      case 'upload':
        return resumeUploaded;
      case 'analyze':
        return jobAnalyzed;
      case 'generate':
        // ОБНОВЛЕННАЯ ЛОГИКА: письмо сгенерировано И не в режиме редактирования И нет несохраненных изменений
        return letterGenerated && !isCoverLetterEditing && !hasUnsavedCoverLetterChanges;
      case 'scoring':
        return scoringCompleted;
      case 'final':
        return false; // Последний этап
      default:
        return false;
    }
  };

  // НОВАЯ ФУНКЦИЯ: Проверка можно ли перейти к следующему шагу для загрузки резюме
  const canProceedFromUpload = () => {
    return resumeUploaded && (!savedData.resumeData || !isResumeEdited());
  };

  // НОВАЯ ФУНКЦИЯ: Проверка, редактировалось ли резюме
  const isResumeEdited = () => {
    // Здесь должна быть логика проверки, что данные резюме были изменены
    // и пользователь не сохранил изменения
    // Это может быть передано через props от ResumeUpload
    return false; // Заглушка - будет реализовано в ResumeUpload
  };

  // Фильтрация и сортировка генераций
  const filteredAndSortedGenerations = savedGenerations
    .filter(gen => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        gen.job_title.toLowerCase().includes(query) ||
        gen.company_name.toLowerCase().includes(query) ||
        (gen.title && gen.title.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'score':
          return (b.overall_score || 0) - (a.overall_score || 0);
        case 'company':
          return a.company_name.localeCompare(b.company_name);
        default:
          return 0;
      }
    });

  // Рендер содержимого шага
  const renderStepContent = () => {
    switch (currentStep) {
      case 'dashboard':
        return renderDashboardContent();
      case 'upload':
        return (
          <ResumeUpload 
            onUploadComplete={handleResumeUpload}
            savedFile={savedData.resume}
            savedResumeData={savedData.resumeData}
          />
        );
      case 'analyze':
        return (
          <JobAnalysis 
            onAnalysisComplete={handleJobAnalysis}
            savedAnalysis={savedData.jobAnalysis}
          />
        );
      case 'generate':
        return (
          <CoverLetterGenerator 
            onGenerationComplete={handleLetterGeneration}
            onEditingStateChange={handleCoverLetterEditingStateChange}
            savedLetter={savedData.coverLetter}
            resumeData={savedData.resumeData} // Передаем структурированные данные
            jobData={savedData.jobAnalysis}
          />
        );
      case 'scoring':
        return (
          <MatchingResults 
            onScoringComplete={handleScoringComplete}
            resumeData={savedData.resumeData} // Передаем структурированные данные
            jobData={savedData.jobAnalysis}
            savedResults={savedData.matchingResults}
          />
        );
      case 'final':
        return (
          <FinalResults 
            coverLetter={savedData.coverLetter}
            matchingResults={savedData.matchingResults}
            resumeData={savedData.resumeData}
            jobData={savedData.jobAnalysis}
            user={user}
            onGenerationSaved={handleGenerationSaved}
          />
        );
      default:
        return null;
    }
  };

  /**
   * НОВАЯ ФУНКЦИЯ: Рендер содержимого личного кабинета
   */
  const renderDashboardContent = () => {
    return (
      <div className="space-y-6">
        {/* Заголовок личного кабинета */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Личный кабинет</h2>
          <p className="text-gray-300">
            Управляйте своими сопроводительными письмами и результатами скорринга
          </p>
        </div>

        {/* Кнопка создания нового письма */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={startNewGeneration}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Создать новое письмо</span>
        </motion.button>

        {/* Поиск и фильтры */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Поиск */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по должности, компании..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
            
            {/* Сортировка */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'score' | 'company')}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl pl-10 pr-8 py-2 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
              >
                <option value="date">По дате</option>
                <option value="score">По баллу</option>
                <option value="company">По компании</option>
              </select>
            </div>
          </div>
        </div>

        {/* Список генераций */}
        <div className="space-y-4">
          {isLoadingGenerations ? (
            /* Состояние загрузки */
            <div className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
              />
              <p className="text-gray-300">Загружаем ваши генерации...</p>
            </div>
          ) : generationsError ? (
            /* Состояние ошибки */
            <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6 text-center">
              <p className="text-red-400 mb-4">{generationsError}</p>
              <button
                onClick={loadSavedGenerations}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-xl transition-colors text-red-300"
              >
                Попробовать снова
              </button>
            </div>
          ) : filteredAndSortedGenerations.length === 0 ? (
            /* Пустое состояние */
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">
                {searchQuery ? 'Ничего не найдено' : 'У вас пока нет сохраненных писем'}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchQuery 
                  ? 'Попробуйте изменить поисковый запрос'
                  : 'Создайте свое первое сопроводительное письмо'
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={startNewGeneration}
                  className="px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl transition-all"
                >
                  Создать первое письмо
                </button>
              )}
            </div>
          ) : (
            /* Список генераций */
            <div className="grid gap-4">
              {filteredAndSortedGenerations.map((generation) => (
                <motion.div
                  key={generation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => loadGenerationDetails(generation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-white font-semibold text-lg">
                          {generation.title || generation.job_title}
                        </h3>
                        {generation.overall_score !== null && (
                          <span className={`px-2 py-1 rounded-lg text-sm font-medium ${getScoreColor(generation.overall_score)} bg-current/10`}>
                            {generation.overall_score}%
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-300 mb-3">
                        <div className="flex items-center space-x-1">
                          <Building className="w-4 h-4" />
                          <span>{generation.company_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{getFormattedCreatedDate(generation)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-lg text-xs ${getStatusColor(generation.status)} bg-current/10`}>
                          {getStatusText(generation.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadGenerationDetails(generation.id);
                        }}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                        title="Просмотреть детали"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteGeneration(generation.id);
                        }}
                        className="p-2 hover:bg-red-500/20 rounded-xl transition-colors text-gray-400 hover:text-red-400"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-safe-bottom">
      {/* ОБНОВЛЕННАЯ ШАПКА: Добавлено меню пользователя */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pt-safe-top px-6 py-6 backdrop-blur-xl bg-black/20 border-b border-white/10"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">JobMatch AI</h1>
            <p className="text-gray-300 text-sm">
              Привет, <span className="text-blue-400 font-medium">{user?.firstName || 'пользователь'}</span>! 👋
              {import.meta.env.DEV && (
                <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg">
                  🔧 DEV
                </span>
              )}
            </p>
          </div>
          
          {/* НОВОЕ: Меню пользователя */}
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all flex items-center space-x-2"
            >
              <User className="w-5 h-5 text-white" />
              {user?.firstName && (
                <span className="text-white text-sm font-medium hidden sm:block">
                  {user.firstName}
                </span>
              )}
            </button>

            {/* Выпадающее меню */}
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full mt-2 w-64 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-50"
              >
                <div className="p-4">
                  {/* Информация о пользователе */}
                  <div className="border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-gray-400 text-sm">ID: {user?.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="space-y-2">
                    <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
                      <Settings className="w-4 h-4" />
                      <span>Настройки профиля</span>
                    </button>
                    
                    <button 
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-red-500/20 transition-colors text-red-400 hover:text-red-300"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Выйти</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Закрытие меню при клике вне его */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Индикатор прогресса */}
      {/* Показываем индикатор прогресса только если не в личном кабинете */}
      {currentStep !== 'dashboard' && (
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            {/* Кнопка возврата в личный кабинет */}
            <button
              onClick={returnToDashboard}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-gray-300 hover:text-white"
            >
              <User className="w-4 h-4" />
              <span className="text-sm">Личный кабинет</span>
            </button>
            
            <div className="text-center">
              <h3 className="text-white font-medium">Создание письма</h3>
              <p className="text-gray-400 text-sm">Шаг {steps.findIndex(s => s.id === currentStep)} из {steps.length - 1}</p>
            </div>
            
            <div className="w-20"></div> {/* Spacer для центрирования */}
          </div>
          
          <div className="flex items-center justify-between">
            {steps.filter(step => step.id !== 'dashboard').map((step, index) => {
              const IconComponent = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = 
                (step.id === 'upload' && resumeUploaded) ||
                (step.id === 'analyze' && jobAnalyzed) ||
                (step.id === 'generate' && letterGenerated) ||
                (step.id === 'scoring' && scoringCompleted);
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      // Разрешаем переход только на завершенные этапы или текущий
                      const stepOrder: Step[] = ['upload', 'analyze', 'generate', 'scoring', 'final'];
                      const targetIndex = stepOrder.indexOf(step.id as Step);
                      const currentIndex = stepOrder.indexOf(currentStep);
                      
                      if (targetIndex <= currentIndex || isCompleted) {
                        setCurrentStep(step.id as Step);
                      }
                    }}
                    className={`p-3 rounded-2xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg' 
                        : isCompleted
                        ? 'bg-green-600 shadow-md cursor-pointer'
                        : 'bg-white/10 backdrop-blur-xl border border-white/20 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${
                      isActive || isCompleted ? 'text-white' : 'text-gray-400'
                    }`} />
                  </motion.button>
                  <span className={`text-xs mt-1 text-center max-w-[60px] leading-tight ${
                    isActive ? 'text-white font-medium' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Основной контент */}
      <div className="px-6 pb-8">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl"
        >
          {renderStepContent()}
          
          {/* Кнопка "Далее" - показываем на всех этапах кроме последнего */}
          {currentStep !== 'final' && currentStep !== 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 pt-6 border-t border-white/10"
            >
              <button
                onClick={goToNextStep}
                disabled={!canProceedToNext()}
                className={`w-full py-4 px-6 rounded-2xl font-semibold transition-all duration-300 ${
                  canProceedToNext()
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl hover:from-green-500 hover:to-emerald-500 transition-all transform hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                }`}
              >
                {canProceedToNext() ? 'Далее →' : 'Завершите текущий этап'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* НОВОЕ: Модальное окно с деталями генерации */}
      {selectedGeneration && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            {isLoadingDetails ? (
              <div className="text-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
                />
                <p className="text-gray-300">Загружаем детали...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Заголовок модального окна */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {selectedGeneration.title || selectedGeneration.job_title}
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-gray-300">
                      <span>{selectedGeneration.company_name}</span>
                      <span>{getFormattedCreatedDate(selectedGeneration)}</span>
                      {selectedGeneration.overall_score !== null && (
                        <span className={`px-2 py-1 rounded-lg font-medium ${getScoreColor(selectedGeneration.overall_score)} bg-current/10`}>
                          Скорринг: {selectedGeneration.overall_score}%
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedGeneration(null)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Сопроводительное письмо */}
                <div className="bg-white/5 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Сопроводительное письмо</span>
                  </h3>
                  <div className="bg-gray-900/50 rounded-xl p-4 max-h-60 overflow-y-auto">
                    <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedGeneration.cover_letter_text}
                    </pre>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedGeneration.cover_letter_text);
                      alert('Письмо скопировано в буфер обмена!');
                    }}
                    className="mt-3 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-xl transition-colors text-blue-300 text-sm"
                  >
                    Копировать письмо
                  </button>
                </div>

                {/* Результаты скорринга */}
                {selectedGeneration.scoring_results_json && (
                  <div className="bg-white/5 rounded-2xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5" />
                      <span>Результаты скорринга</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedGeneration.scoring_results_json.scoring_result?.breakdown && Object.entries(selectedGeneration.scoring_results_json.scoring_result.breakdown).map(([key, value]: [string, any]) => (
                        <div key={key} className="bg-gray-900/50 rounded-xl p-3">
                          <div className="text-sm text-gray-400 mb-1">
                            {key === 'hard_skills' ? '💻 Технические навыки' :
                             key === 'soft_skills' ? '🤝 Гибкие навыки' :
                             key === 'experience_match' ? '💼 Соответствие опыта' :
                             key === 'position_match' ? '🎯 Соответствие должности' : key}
                          </div>
                          <div className="text-lg font-bold text-white mb-2">{value.score}%</div>
                          <div className="text-xs text-gray-300">{value.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Действия */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => deleteGeneration(selectedGeneration.id)}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-xl transition-colors text-red-300"
                  >
                    Удалить
                  </button>
                  <button
                    onClick={() => setSelectedGeneration(null)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;