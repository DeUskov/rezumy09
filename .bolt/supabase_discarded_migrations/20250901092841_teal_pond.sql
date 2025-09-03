/*
  # Добавление тестовых данных генераций

  1. Новые данные
    - Добавляем 2 тестовые записи в таблицу `generations`
    - Записи привязаны к тестовому пользователю "dev-user-12345"
    - Включают полные данные: письма, скорринг, резюме, вакансии

  2. Содержимое тестовых данных
    - Генерация 1: Frontend Developer в TechCorp (балл: 85%)
    - Генерация 2: React Developer в StartupXYZ (балл: 72%)
    - Реалистичные сопроводительные письма
    - Детальные результаты скорринга с breakdown
    - Структурированные данные резюме и вакансий

  3. Безопасность
    - Данные добавляются только если записей еще нет
    - Используется условная вставка для предотвращения дублирования
*/

-- Добавляем тестовые данные только если их еще нет
DO $$
BEGIN
  -- Проверяем, есть ли уже тестовые данные для dev-user-12345
  IF NOT EXISTS (
    SELECT 1 FROM generations 
    WHERE user_id = 'dev-user-12345'
  ) THEN
    
    -- Вставляем первую тестовую генерацию: Frontend Developer в TechCorp
    INSERT INTO generations (
      id,
      user_id,
      created_at,
      updated_at,
      job_title,
      company_name,
      overall_score,
      cover_letter_text,
      scoring_results_json,
      resume_data_json,
      job_data_json,
      title,
      status
    ) VALUES (
      gen_random_uuid(),
      'dev-user-12345',
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '3 days',
      'Frontend Developer',
      'TechCorp',
      85,
      'Уважаемые коллеги!

Меня зовут Разработчик Тестовый, и я хочу присоединиться к команде TechCorp в качестве Frontend Developer. 

Мой опыт включает:
• 3+ года разработки на React и TypeScript
• Создание современных веб-приложений с использованием Next.js
• Работа с REST API и GraphQL
• Опыт работы в Agile команде

Особенно меня привлекает возможность работать над инновационными проектами в TechCorp. Ваша компания известна своим техническим превосходством и культурой непрерывного обучения.

Я готов внести свой вклад в развитие ваших продуктов и буду рад обсудить, как мои навыки могут помочь достичь целей команды.

С уважением,
Разработчик Тестовый',
      '{
        "scoring_result": {
          "total_score": 85,
          "breakdown": {
            "hard_skills": {
              "score": 90,
              "summary": "Отличное соответствие технических навыков. React, TypeScript, Next.js полностью покрывают требования.",
              "description": "Технические навыки критически важны для Frontend Developer позиции"
            },
            "soft_skills": {
              "score": 80,
              "summary": "Хорошие коммуникативные навыки и опыт работы в команде. Подходит для Agile среды.",
              "description": "Гибкие навыки важны для эффективной работы в команде разработки"
            },
            "experience_match": {
              "score": 85,
              "summary": "3+ года опыта Frontend разработки соответствуют требованиям Middle уровня.",
              "description": "Релевантный опыт работы показывает готовность к выполнению задач"
            },
            "position_match": {
              "score": 85,
              "summary": "Профиль кандидата полностью соответствует требованиям Frontend Developer позиции.",
              "description": "Общее соответствие должности определяет успешность трудоустройства"
            }
          },
          "recommendation": "excellent_match",
          "recruiter_recommendation": "Сильный кандидат с релевантным опытом. Рекомендуется пригласить на техническое интервью.",
          "candidate_recommendation": "Отличное соответствие! Подготовьтесь к техническим вопросам по React и TypeScript."
        }
      }',
      '{
        "personal_info": {
          "first_name": "Разработчик",
          "last_name": "Тестовый",
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
              "Оптимизация производительности",
              "Code review и менторинг"
            ],
            "start_date": "01/2021",
            "end_date": "настоящее время",
            "industry": "IT"
          }
        ],
        "summary": "Frontend разработчик с 3+ годами опыта создания современных веб-приложений",
        "desired_position": "Frontend Developer",
        "similar_positions": ["React Developer", "JavaScript Developer", "Web Developer", "UI Developer", "Frontend Engineer", "Full Stack Developer", "Software Engineer", "Web Application Developer"]
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
        "industry": "IT / Разработка ПО",
        "description": "Ищем опытного Frontend разработчика для работы над инновационными проектами",
        "skills": {
          "hard_skills": ["React", "TypeScript", "Next.js", "GraphQL", "Jest"],
          "soft_skills": ["Командная работа", "Agile", "Коммуникация"],
          "languages": ["Английский"]
        },
        "required_skills": ["React", "TypeScript", "Next.js", "GraphQL", "Jest"]
      }',
      'Frontend Developer в TechCorp',
      'completed'
    );

    -- Вставляем вторую тестовую генерацию: React Developer в StartupXYZ
    INSERT INTO generations (
      id,
      user_id,
      created_at,
      updated_at,
      job_title,
      company_name,
      overall_score,
      cover_letter_text,
      scoring_results_json,
      resume_data_json,
      job_data_json,
      title,
      status
    ) VALUES (
      gen_random_uuid(),
      'dev-user-12345',
      NOW() - INTERVAL '1 week',
      NOW() - INTERVAL '1 week',
      'React Developer',
      'StartupXYZ',
      72,
      'Добрый день!

Пишу вам по поводу вакансии React Developer в StartupXYZ. Ваша компания привлекает меня динамичной средой и возможностью работать с современными технологиями.

Мой профессиональный опыт:
• Разработка React приложений с использованием хуков и Context API
• Опыт работы с Redux и состоянием приложений
• Создание адаптивных интерфейсов с Tailwind CSS
• Интеграция с внешними API и обработка асинхронных операций

В StartupXYZ меня особенно привлекает возможность влиять на архитектурные решения и работать в небольшой команде, где каждый разработчик может внести значительный вклад в продукт.

Готов обсудить детали сотрудничества и продемонстрировать свои проекты.

Буду ждать вашего ответа!

С уважением,
Разработчик Тестовый',
      '{
        "scoring_result": {
          "total_score": 72,
          "breakdown": {
            "hard_skills": {
              "score": 75,
              "summary": "Хорошее соответствие по React и JavaScript. Отсутствует опыт с Redux, что снижает оценку.",
              "description": "Технические навыки определяют способность выполнять ежедневные задачи"
            },
            "soft_skills": {
              "score": 70,
              "summary": "Подходящие навыки для стартапа. Адаптивность и инициативность на среднем уровне.",
              "description": "В стартапе особенно важны гибкость и самостоятельность"
            },
            "experience_match": {
              "score": 70,
              "summary": "Опыт Frontend разработки релевантен, но недостаточно опыта в стартап среде.",
              "description": "Предыдущий опыт показывает готовность к решению похожих задач"
            },
            "position_match": {
              "score": 75,
              "summary": "Профиль подходит для React Developer, но нужно развитие в области состояния приложений.",
              "description": "Соответствие конкретной позиции влияет на успешность адаптации"
            }
          },
          "recommendation": "good_match",
          "recruiter_recommendation": "Перспективный кандидат для стартапа. Стоит оценить мотивацию и готовность к быстрому обучению.",
          "candidate_recommendation": "Хорошие шансы! Изучите Redux и подготовьте примеры работы с состоянием приложений."
        }
      }',
      '{
        "personal_info": {
          "first_name": "Разработчик",
          "last_name": "Тестовый",
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
              "Оптимизация производительности",
              "Code review и менторинг"
            ],
            "start_date": "01/2021",
            "end_date": "настоящее время",
            "industry": "IT"
          }
        ],
        "summary": "Frontend разработчик с 3+ годами опыта создания современных веб-приложений",
        "desired_position": "Frontend Developer",
        "similar_positions": ["React Developer", "JavaScript Developer", "Web Developer", "UI Developer", "Frontend Engineer", "Full Stack Developer", "Software Engineer", "Web Application Developer"]
      }',
      '{
        "job_title": "React Developer",
        "company_name": "StartupXYZ",
        "location": {
          "city": "Санкт-Петербург",
          "country": "Россия"
        },
        "employment_type": "Полная занятость",
        "experience_level": "Middle (2-4 года)",
        "industry": "IT / Стартап",
        "description": "Молодая команда ищет React разработчика для создания MVP продукта",
        "skills": {
          "hard_skills": ["React", "Redux", "JavaScript", "CSS", "API"],
          "soft_skills": ["Инициативность", "Адаптивность", "Стартап менталитет"],
          "languages": ["Английский"]
        },
        "required_skills": ["React", "Redux", "JavaScript", "CSS", "API"]
      }',
      'React Developer в StartupXYZ',
      'completed'
    );

    RAISE NOTICE 'Добавлены 2 тестовые генерации для пользователя dev-user-12345';
  ELSE
    RAISE NOTICE 'Тестовые данные уже существуют, пропускаем вставку';
  END IF;
END $$;