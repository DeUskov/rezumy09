/**
 * Типы и схема данных резюме
 * 
 * Основано на JSON Schema от API эндпоинта file-upload/resume
 * 
 * Обновлено: 25.12.2024
 * Версия схемы: 1.0
 */

// ============================================================================
// TYPESCRIPT ТИПЫ
// ============================================================================

/**
 * Персональная информация кандидата
 */
export interface PersonalInfo {
  /** Имя кандидата (обязательно) */
  first_name: string;
  /** Фамилия кандидата (обязательно) */
  last_name: string;
  /** Основной email (обязательно) */
  email: string;
  /** Контактный телефон (обязательно) */
  phone: string;
  /** Персональный сайт или портфолио */
  website?: string;
  /** Местоположение */
  location?: {
    city?: string;
    country?: string;
  };
  /** Идентификатор в Telegram */
  telegram_id?: string;
}

/**
 * Навыки кандидата
 */
export interface Skills {
  /** Технические/профессиональные навыки (обязательно) */
  hard_skills: string[];
  /** Гибкие навыки (обязательно) */
  soft_skills: string[];
  /** Владение языками (обязательно) */
  languages: string[];
}

/**
 * Образование и курсы
 */
export interface Education {
  /** Учебное заведение (обязательно) */
  institution: string;
  /** Полученная степень/квалификация */
  degree?: string;
  /** Год окончания */
  graduation_year?: string;
  /** Специализация */
  field_of_study?: string;
  /** Дополнительная информация */
  additional_info?: string;
}

/**
 * Опыт работы
 */
export interface WorkExperience {
  /** Занимаемая должность (обязательно) */
  position: string;
  /** Название компании (обязательно) */
  company: string;
  /** Список обязанностей и достижений (обязательно) */
  bullet_list: string[];
  /** Дата начала работы (ММ/ГГГГ) */
  start_date?: string;
  /** Дата окончания (ММ/ГГГГ или 'настоящее время') */
  end_date?: string;
  /** Отрасль компании */
  industry?: string;
}

/**
 * Полная структура данных резюме
 */
export interface ResumeData {
  /** Персональная информация кандидата */
  personal_info: PersonalInfo;
  /** Навыки кандидата */
  skills: Skills;
  /** Образование и курсы */
  education: Education[];
  /** Опыт работы */
  experience: WorkExperience[];
  /** Краткое описание кандидата и карьерных целей */
  summary: string;
  /** Желаемая должность, указанная кандидатом */
  desired_position: string;
  /** Список из 8 похожих должностей для поиска вакансий */
  similar_positions: string[];
}

// ============================================================================
// JSON SCHEMA ДЛЯ ВАЛИДАЦИИ
// ============================================================================

/**
 * JSON Schema для валидации данных резюме
 * Соответствует API эндпоинту file-upload/resume
 */
export const RESUME_DATA_SCHEMA = {
  type: "object",
  properties: {
    personal_info: {
      type: "object",
      required: ["first_name", "last_name", "email", "phone"],
      description: "Персональная информация кандидата",
      properties: {
        first_name: {
          type: "string",
          description: "Имя кандидата"
        },
        last_name: {
          type: "string", 
          description: "Фамилия кандидата"
        },
        email: {
          type: "string",
          format: "email",
          description: "Основной email"
        },
        phone: {
          type: "string",
          description: "Контактный телефон"
        },
        website: {
          type: "string",
          description: "Персональный сайт или портфолио"
        },
        location: {
          type: "object",
          description: "Местоположение",
          properties: {
            city: { type: "string" },
            country: { type: "string" }
          }
        },
        telegram_id: {
          type: "string",
          description: "Идентификатор в Telegram"
        }
      }
    },
    skills: {
      type: "object",
      required: ["hard_skills", "soft_skills", "languages"],
      description: "Навыки кандидата",
      properties: {
        hard_skills: {
          type: "array",
          items: { type: "string" },
          description: "Технические/профессиональные навыки"
        },
        soft_skills: {
          type: "array",
          items: { type: "string" },
          description: "Гибкие навыки"
        },
        languages: {
          type: "array",
          items: { type: "string" },
          description: "Владение языками"
        }
      }
    },
    education: {
      type: "array",
      description: "Образование и курсы",
      items: {
        type: "object",
        required: ["institution"],
        properties: {
          institution: {
            type: "string",
            description: "Учебное заведение"
          },
          degree: {
            type: "string",
            description: "Полученная степень/квалификация"
          },
          graduation_year: {
            type: "string",
            description: "Год окончания"
          },
          field_of_study: {
            type: "string",
            description: "Специализация"
          },
          additional_info: {
            type: "string",
            description: "Дополнительная информация"
          }
        }
      }
    },
    experience: {
      type: "array",
      description: "Опыт работы",
      items: {
        type: "object",
        required: ["position", "company", "bullet_list"],
        properties: {
          position: {
            type: "string",
            description: "Занимаемая должность"
          },
          company: {
            type: "string",
            description: "Название компании"
          },
          bullet_list: {
            type: "array",
            items: { type: "string" },
            description: "Список обязанностей и достижений"
          },
          start_date: {
            type: "string",
            description: "Дата начала работы (ММ/ГГГГ)"
          },
          end_date: {
            type: "string",
            description: "Дата окончания (ММ/ГГГГ или 'настоящее время')"
          },
          industry: {
            type: "string",
            description: "Отрасль компании"
          }
        }
      }
    },
    summary: {
      type: "string",
      description: "Краткое описание кандидата и карьерных целей"
    },
    desired_position: {
      type: "string",
      description: "Желаемая должность, указанная кандидатом"
    },
    similar_positions: {
      type: "array",
      items: { type: "string" },
      minItems: 8,
      maxItems: 8,
      description: "Список из 8 похожих должностей для поиска вакансий"
    }
  },
  required: [
    "personal_info", 
    "skills", 
    "education", 
    "experience", 
    "summary", 
    "desired_position", 
    "similar_positions"
  ],
  additionalProperties: false
} as const;

// ============================================================================
// УТИЛИТНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Типогард для проверки, что объект является ResumeData
 * 
 * @param data - объект для проверки
 * @returns true если объект соответствует интерфейсу ResumeData
 */
export function isResumeData(data: any): data is ResumeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    
    // Проверка personal_info
    typeof data.personal_info === 'object' &&
    typeof data.personal_info.first_name === 'string' &&
    typeof data.personal_info.last_name === 'string' &&
    typeof data.personal_info.email === 'string' &&
    typeof data.personal_info.phone === 'string' &&
    
    // Проверка skills
    typeof data.skills === 'object' &&
    Array.isArray(data.skills.hard_skills) &&
    Array.isArray(data.skills.soft_skills) &&
    Array.isArray(data.skills.languages) &&
    
    // Проверка массивов
    Array.isArray(data.education) &&
    Array.isArray(data.experience) &&
    Array.isArray(data.similar_positions) &&
    
    // Проверка строковых полей
    typeof data.summary === 'string' &&
    typeof data.desired_position === 'string' &&
    
    // Проверка длины similar_positions
    data.similar_positions.length === 8
  );
}

/**
 * Валидация данных резюме с подробной информацией об ошибках
 * 
 * @param data - данные для валидации
 * @returns объект с результатом валидации и списком ошибок
 */
export function validateResumeData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Проверка, что data является объектом
  if (typeof data !== 'object' || data === null) {
    errors.push('Данные резюме должны быть объектом');
    return { isValid: false, errors };
  }

  // Проверка обязательных полей верхнего уровня
  const requiredTopFields = [
    'personal_info', 'skills', 'education', 'experience', 
    'summary', 'desired_position', 'similar_positions'
  ];
  
  for (const field of requiredTopFields) {
    if (!data[field]) {
      errors.push(`Отсутствует обязательное поле: ${field}`);
    }
  }

  // Проверка personal_info
  if (data.personal_info) {
    const requiredPersonalFields = ['first_name', 'last_name', 'email', 'phone'];
    for (const field of requiredPersonalFields) {
      if (!data.personal_info[field] || typeof data.personal_info[field] !== 'string') {
        errors.push(`Отсутствует или некорректное поле в personal_info: ${field}`);
      }
    }
  }

  // Проверка skills
  if (data.skills) {
    const requiredSkillsFields = ['hard_skills', 'soft_skills', 'languages'];
    for (const field of requiredSkillsFields) {
      if (!data.skills[field] || !Array.isArray(data.skills[field])) {
        errors.push(`Отсутствует или некорректное поле в skills: ${field} (должен быть массивом)`);
      }
    }
  }

  // Проверка массивов
  if (data.education && !Array.isArray(data.education)) {
    errors.push('Поле education должно быть массивом');
  }
  
  if (data.experience && !Array.isArray(data.experience)) {
    errors.push('Поле experience должно быть массивом');
  }
  
  if (data.similar_positions) {
    if (!Array.isArray(data.similar_positions)) {
      errors.push('Поле similar_positions должно быть массивом');
    } else if (data.similar_positions.length !== 8) {
      errors.push(`Поле similar_positions должно содержать ровно 8 элементов, получено: ${data.similar_positions.length}`);
    }
  }

  // Проверка строковых полей
  if (data.summary && typeof data.summary !== 'string') {
    errors.push('Поле summary должно быть строкой');
  }
  
  if (data.desired_position && typeof data.desired_position !== 'string') {
    errors.push('Поле desired_position должно быть строкой');
  }

  // Детальная проверка experience
  if (Array.isArray(data.experience)) {
    data.experience.forEach((exp: any, index: number) => {
      if (typeof exp !== 'object' || exp === null) {
        errors.push(`Элемент опыта работы №${index + 1} должен быть объектом`);
        return;
      }
      
      const requiredExpFields = ['position', 'company', 'bullet_list'];
      for (const field of requiredExpFields) {
        if (!exp[field]) {
          errors.push(`Отсутствует обязательное поле "${field}" в опыте работы №${index + 1}`);
        }
      }
      
      if (exp.bullet_list && !Array.isArray(exp.bullet_list)) {
        errors.push(`Поле bullet_list в опыте работы №${index + 1} должно быть массивом`);
      }
    });
  }

  // Детальная проверка education
  if (Array.isArray(data.education)) {
    data.education.forEach((edu: any, index: number) => {
      if (typeof edu !== 'object' || edu === null) {
        errors.push(`Элемент образования №${index + 1} должен быть объектом`);
        return;
      }
      
      if (!edu.institution || typeof edu.institution !== 'string') {
        errors.push(`Отсутствует или некорректное поле "institution" в образовании №${index + 1}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Получение полного имени кандидата
 * 
 * @param resumeData - данные резюме
 * @returns полное имя в формате "Имя Фамилия"
 */
export function getFullName(resumeData: ResumeData): string {
  return `${resumeData.personal_info.first_name} ${resumeData.personal_info.last_name}`.trim();
}

/**
 * Подсчет общего количества навыков
 * 
 * @param resumeData - данные резюме
 * @returns общее количество навыков
 */
export function getTotalSkillsCount(resumeData: ResumeData): number {
  return (
    (resumeData.skills.hard_skills?.length || 0) +
    (resumeData.skills.soft_skills?.length || 0) +
    (resumeData.skills.languages?.length || 0)
  );
}

/**
 * Получение всех навыков в виде одного массива
 * 
 * @param resumeData - данные резюме
 * @returns массив всех навыков
 */
export function getAllSkills(resumeData: ResumeData): string[] {
  return [
    ...(resumeData.skills.hard_skills || []),
    ...(resumeData.skills.soft_skills || []),
    ...(resumeData.skills.languages || [])
  ];
}

/**
 * Получение общего опыта работы в годах (примерный расчет)
 * 
 * @param resumeData - данные резюме
 * @returns примерное количество лет опыта
 */
export function getTotalExperienceYears(resumeData: ResumeData): number {
  let totalMonths = 0;
  
  for (const exp of resumeData.experience) {
    if (exp.start_date && exp.end_date) {
      // Простой парсинг формата ММ/ГГГГ
      const startParts = exp.start_date.split('/');
      const endParts = exp.end_date === 'настоящее время' 
        ? [new Date().getMonth() + 1, new Date().getFullYear()]
        : exp.end_date.split('/');
      
      if (startParts.length === 2 && endParts.length === 2) {
        const startYear = parseInt(startParts[1]);
        const startMonth = parseInt(startParts[0]);
        const endYear = parseInt(endParts[1].toString());
        const endMonth = parseInt(endParts[0].toString());
        
        if (!isNaN(startYear) && !isNaN(startMonth) && !isNaN(endYear) && !isNaN(endMonth)) {
          totalMonths += (endYear - startYear) * 12 + (endMonth - startMonth);
        }
      }
    }
  }
  
  return Math.max(0, Math.round(totalMonths / 12 * 10) / 10); // Округляем до 1 знака после запятой
}