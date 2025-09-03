/*
  # Добавление тестовых данных генераций с правильным UUID

  1. Тестовые данные
    - Добавляем 2 тестовые записи в таблицу `generations`
    - Используем правильный UUID: 12345678-1234-1234-1234-123456789012
    - Записи содержат полные данные: письма, скорринг, резюме, вакансии

  2. Содержимое записей
    - Frontend Developer в TechCorp (85% соответствие)
    - React Developer в StartupXYZ (72% соответствие)
    - Реалистичные данные для тестирования функций личного кабинета

  3. Безопасность
    - Данные привязаны к конкретному тестовому пользователю
    - RLS политики обеспечивают доступ только владельцу
*/

-- Удаляем старые тестовые записи если они есть
DELETE FROM generations WHERE user_id = '12345678-1234-1234-1234-123456789012';

-- Добавляем тестовые записи с правильным UUID
INSERT INTO generations (
  user_id,
  job_title,
  company_name,
  overall_score,
  cover_letter_text,
  scoring_results_json,
  resume_data_json,
  job_data_json,
  title,
  status,
  created_at,
  updated_at
) VALUES 
(
  '12345678-1234-1234-1234-123456789012',
  'Frontend Developer',
  'TechCorp',
  85,
  'Уважаемые коллеги!

Меня зовут Тестовый Разработчик, и я хочу присоединиться к команде TechCorp в качестве Frontend Developer. 

Мой опыт включает:
• 3+ года разработки на React и TypeScript
• Создание современных веб-приложений с использованием Next.js
• Работа с REST API и GraphQL
• Опыт работы в Agile команде

Особенно меня привлекает возможность работать над инновационными проектами в TechCorp. Ваша компания известна своим техническим превосходством и культурой непрерывного обучения.

Я готов внести свой вклад в развитие ваших продуктов и буду рад обсудить, как мои навыки могут помочь достичь целей команды.

С уважением,
Тестовый Разработчик',
  '{
    "scoring_result": {
      "total_score": 85,
      "breakdown": {
        "hard_skills": {
          "score": 90,
          "summary": "Отличное соответствие технических навыков. React, TypeScript, Next.js полностью покрывают требования.",
          "description": "Технические навыки критически важны для Frontend разработки"
        },
        "soft_skills": {
          "score": 80,
          "summary": "Хорошие коммуникативные навыки и опыт работы в команде.",
          "description": "Гибкие навыки важны для эффективной работы в команде"
        },
        "experience_match": {
          "score": 85,
          "summary": "3+ года опыта Frontend разработки соответствуют требованиям позиции.",
          "description": "Релевантный опыт показывает готовность к выполнению задач"
        },
        "position_match": {
          "score": 85,
          "summary": "Профиль кандидата идеально подходит для позиции Frontend Developer.",
          "description": "Соответствие должности определяет общую пригодность"
        }
      },
      "recommendation": "excellent_match",
      "recruiter_recommendation": "Сильный кандидат с отличными техническими навыками и релевантным опытом. Рекомендуется пригласить на техническое интервью.",
      "candidate_recommendation": "Подчеркните опыт с современными технологиями и готовность к изучению новых инструментов."
    }
  }',
  '{
    "personal_info": {
      "first_name": "Тестовый",
      "last_name": "Разработчик",
      "email": "dev@example.com",
      "phone": "+7 (999) 123-45-67",
      "location": {
        "city": "Москва",
        "country": "Россия"
      }
    },
    "skills": {
      "hard_skills": ["React", "TypeScript", "JavaScript", "Next.js", "HTML/CSS", "Git", "REST API", "GraphQL"],
      "soft_skills": ["Командная работа", "Коммуникация", "Решение проблем", "Обучаемость"],
      "languages": ["Русский (родной)", "Английский (B2)"]
    },
    "education": [
      {
        "institution": "МГУ им. М.В. Ломоносова",
        "degree": "Бакалавр информатики",
        "graduation_year": "2020",
        "field_of_study": "Программная инженерия"
      }
    ],
    "experience": [
      {
        "position": "Frontend Developer",
        "company": "WebStudio",
        "bullet_list": [
          "Разработка SPA приложений на React",
          "Интеграция с REST API",
          "Оптимизация производительности"
        ],
        "start_date": "01/2021",
        "end_date": "настоящее время"
      }
    ],
    "summary": "Frontend разработчик с 3+ годами опыта создания современных веб-приложений",
    "desired_position": "Frontend Developer",
    "similar_positions": ["React Developer", "JavaScript Developer", "Web Developer", "UI Developer", "Frontend Engineer", "Full Stack Developer", "Software Engineer", "Web Engineer"]
  }',
  '{
    "job_title": "Frontend Developer",
    "company_name": "TechCorp",
    "location": {
      "city": "Москва",
      "country": "Россия"
    },
    "employment_type": "Полная занятость",
    "experience_level": "Middle (3-5 лет)",
    "industry": "IT/Технологии",
    "description": "Ищем опытного Frontend разработчика для работы над инновационными проектами",
    "skills": {
      "hard_skills": ["React", "TypeScript", "Next.js", "GraphQL"],
      "soft_skills": ["Командная работа", "Коммуникация"],
      "languages": ["Английский"]
    },
    "required_skills": ["React", "TypeScript", "Next.js", "GraphQL"]
  }',
  'Frontend Developer в TechCorp',
  'completed',
  NOW() - INTERVAL ''3 days'',
  NOW() - INTERVAL ''3 days''
),
(
  '12345678-1234-1234-1234-123456789012',
  'React Developer',
  'StartupXYZ',
  72,
  'Добрый день!

Я заинтересован в позиции React Developer в StartupXYZ. Ваша компания привлекает меня инновационным подходом к разработке продуктов.

Мой профессиональный опыт:
• Разработка на React более 3 лет
• Создание компонентных библиотек
• Опыт работы с Redux и Context API
• Знание принципов UX/UI дизайна

StartupXYZ известна своей динамичной средой и возможностями для профессионального роста. Я готов внести свой вклад в развитие ваших продуктов и изучать новые технологии.

Буду рад обсудить возможности сотрудничества и ответить на ваши вопросы.

С наилучшими пожеланиями,
Тестовый Разработчик',
  '{
    "scoring_result": {
      "total_score": 72,
      "breakdown": {
        "hard_skills": {
          "score": 75,
          "summary": "Хорошее соответствие по React и JavaScript, но не хватает опыта с некоторыми технологиями стартапа.",
          "description": "Технические навыки важны для быстрой разработки в стартапе"
        },
        "soft_skills": {
          "score": 70,
          "summary": "Подходящие навыки для работы в динамичной стартап среде.",
          "description": "Адаптивность и коммуникация критичны в стартапах"
        },
        "experience_match": {
          "score": 70,
          "summary": "Опыт React разработки подходит, но желателен опыт в стартапах.",
          "description": "Опыт в похожих условиях повышает эффективность"
        },
        "position_match": {
          "score": 75,
          "summary": "Профиль хорошо подходит для React Developer позиции в стартапе.",
          "description": "Соответствие роли определяет успех в должности"
        }
      },
      "recommendation": "good_match",
      "recruiter_recommendation": "Кандидат имеет необходимые технические навыки, но стоит оценить готовность к работе в быстро меняющейся стартап среде.",
      "candidate_recommendation": "Подчеркните адаптивность и готовность к изучению новых технологий. Покажите интерес к стартап культуре."
    }
  }',
  '{
    "personal_info": {
      "first_name": "Тестовый",
      "last_name": "Разработчик",
      "email": "dev@example.com",
      "phone": "+7 (999) 123-45-67",
      "location": {
        "city": "Москва",
        "country": "Россия"
      }
    },
    "skills": {
      "hard_skills": ["React", "JavaScript", "Redux", "HTML/CSS", "Git", "Webpack"],
      "soft_skills": ["Адаптивность", "Креативность", "Работа в команде"],
      "languages": ["Русский (родной)", "Английский (B1)"]
    },
    "education": [
      {
        "institution": "МГУ им. М.В. Ломоносова",
        "degree": "Бакалавр информатики",
        "graduation_year": "2020"
      }
    ],
    "experience": [
      {
        "position": "Frontend Developer",
        "company": "WebStudio",
        "bullet_list": [
          "Разработка React компонентов",
          "Создание адаптивных интерфейсов",
          "Работа с API"
        ],
        "start_date": "01/2021",
        "end_date": "настоящее время"
      }
    ],
    "summary": "React разработчик с опытом создания пользовательских интерфейсов",
    "desired_position": "React Developer",
    "similar_positions": ["Frontend Developer", "JavaScript Developer", "Web Developer", "UI Developer", "React Engineer", "Frontend Engineer", "Software Developer", "Web Engineer"]
  }',
  '{
    "job_title": "React Developer",
    "company_name": "StartupXYZ",
    "location": {
      "city": "Санкт-Петербург",
      "country": "Россия"
    },
    "employment_type": "Полная занятость",
    "experience_level": "Middle",
    "industry": "Стартап/Технологии",
    "description": "Ищем React разработчика для работы в динамичной стартап команде",
    "skills": {
      "hard_skills": ["React", "JavaScript", "Node.js", "MongoDB"],
      "soft_skills": ["Адаптивность", "Креативность"],
      "languages": ["Английский"]
    },
    "required_skills": ["React", "JavaScript", "Node.js", "MongoDB"]
  }',
  'React Developer в StartupXYZ',
  'completed',
  NOW() - INTERVAL ''7 days'',
  NOW() - INTERVAL ''7 days''
);