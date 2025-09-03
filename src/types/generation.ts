/**
 * Типы для работы с генерациями писем и скорринга
 * 
 * Соответствует схеме таблицы generations в Supabase
 * 
 * Обновлено: 25.12.2024
 * Версия: 1.0
 */

import { ResumeData } from './resumeData';

// ============================================================================
// ОСНОВНЫЕ ТИПЫ
// ============================================================================

/**
 * Статус генерации
 */
export type GenerationStatus = 'completed' | 'draft' | 'archived';

/**
 * Полная структура генерации из базы данных
 */
export interface Generation {
  /** Уникальный идентификатор генерации */
  id: string;
  /** ID пользователя из auth.users */
  user_id: string;
  /** Дата и время создания */
  created_at: string;
  /** Дата и время последнего обновления */
  updated_at: string;
  
  // Основная информация для отображения в списке
  /** Название должности из вакансии */
  job_title: string;
  /** Название компании из вакансии */
  company_name: string;
  /** Общий балл скорринга (0-100) */
  overall_score: number | null;
  
  // Основной контент
  /** Полный текст сгенерированного письма */
  cover_letter_text: string;
  
  // JSON данные для полного восстановления контекста
  /** Полные результаты скорринга */
  scoring_results_json: ScoringResults;
  /** Структурированные данные резюме */
  resume_data_json: ResumeData;
  /** Структурированные данные вакансии */
  job_data_json: JobData;
  
  // Дополнительные поля
  /** Пользовательское название генерации */
  title: string | null;
  /** Статус генерации */
  status: GenerationStatus;
}

/**
 * Данные для создания новой генерации
 */
export interface CreateGenerationData {
  job_title: string;
  company_name: string;
  overall_score?: number;
  cover_letter_text: string;
  scoring_results_json: ScoringResults;
  resume_data_json: ResumeData;
  job_data_json: JobData;
  title?: string;
  status?: GenerationStatus;
}

/**
 * Данные для обновления существующей генерации
 */
export interface UpdateGenerationData {
  job_title?: string;
  company_name?: string;
  overall_score?: number;
  cover_letter_text?: string;
  scoring_results_json?: ScoringResults;
  resume_data_json?: ResumeData;
  job_data_json?: JobData;
  title?: string;
  status?: GenerationStatus;
}

/**
 * Краткая информация о генерации для списков
 */
export interface GenerationSummary {
  id: string;
  created_at: string;
  job_title: string;
  company_name: string;
  overall_score: number | null;
  title: string | null;
  status: GenerationStatus;
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ТИПЫ
// ============================================================================

/**
 * Структура результатов скорринга
 * Соответствует NewScoringResponse из MatchingResults.tsx
 */
export interface ScoringResults {
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

/**
 * Структура данных вакансии
 */
export interface JobData {
  job_title: string;
  company_name: string;
  location?: {
    city?: string;
    country?: string;
  };
  employment_type?: string;
  experience_level?: string;
  industry?: string;
  description?: string;
  skills?: {
    hard_skills: string[];
    soft_skills: string[];
    languages: string[];
  };
  required_skills?: string[]; // Для обратной совместимости
}

// ============================================================================
// УТИЛИТНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Типогард для проверки, что объект является Generation
 */
export function isGeneration(data: any): data is Generation {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.user_id === 'string' &&
    typeof data.job_title === 'string' &&
    typeof data.company_name === 'string' &&
    typeof data.cover_letter_text === 'string' &&
    typeof data.scoring_results_json === 'object' &&
    typeof data.resume_data_json === 'object' &&
    typeof data.job_data_json === 'object'
  );
}

/**
 * Получение отформатированной даты создания
 */
export function getFormattedCreatedDate(generation: Generation): string {
  return new Date(generation.created_at).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Получение цвета для отображения балла скорринга
 */
export function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Получение текстового описания статуса
 */
export function getStatusText(status: GenerationStatus): string {
  switch (status) {
    case 'completed':
      return 'Завершено';
    case 'draft':
      return 'Черновик';
    case 'archived':
      return 'Архив';
    default:
      return 'Неизвестно';
  }
}

/**
 * Получение цвета для отображения статуса
 */
export function getStatusColor(status: GenerationStatus): string {
  switch (status) {
    case 'completed':
      return 'text-green-400';
    case 'draft':
      return 'text-yellow-400';
    case 'archived':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Создание краткого описания генерации для превью
 */
export function getGenerationPreview(generation: Generation): string {
  const letterPreview = generation.cover_letter_text.substring(0, 150);
  return letterPreview.length < generation.cover_letter_text.length 
    ? `${letterPreview}...` 
    : letterPreview;
}

/**
 * Подсчет общего количества слов в письме
 */
export function getLetterWordCount(generation: Generation): number {
  return generation.cover_letter_text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Валидация данных для создания генерации
 */
export function validateCreateGenerationData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.job_title || typeof data.job_title !== 'string' || data.job_title.trim().length === 0) {
    errors.push('Название должности обязательно');
  }

  if (!data.company_name || typeof data.company_name !== 'string' || data.company_name.trim().length === 0) {
    errors.push('Название компании обязательно');
  }

  if (!data.cover_letter_text || typeof data.cover_letter_text !== 'string' || data.cover_letter_text.trim().length === 0) {
    errors.push('Текст письма обязателен');
  }

  if (!data.scoring_results_json || typeof data.scoring_results_json !== 'object') {
    errors.push('Результаты скорринга обязательны');
  }

  if (!data.resume_data_json || typeof data.resume_data_json !== 'object') {
    errors.push('Данные резюме обязательны');
  }

  if (!data.job_data_json || typeof data.job_data_json !== 'object') {
    errors.push('Данные вакансии обязательны');
  }

  if (data.overall_score !== undefined && (typeof data.overall_score !== 'number' || data.overall_score < 0 || data.overall_score > 100)) {
    errors.push('Общий балл должен быть числом от 0 до 100');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}