import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles, Upload, Target, Rocket } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

// Данные слайдов онбординга
const slides = [
  {
    id: 1,
    icon: Sparkles,
    title: 'Создавайте выигрышные сопроводительные письма за секунды',
    description: 'Наш ИИ анализирует вакансию и ваше резюме, создавая персонализированное письмо, которое привлечет внимание HR.',
    gradient: 'from-purple-600 to-blue-600'
  },
  {
    id: 2,
    icon: Upload,
    title: 'Просто загрузите резюме и вставьте ссылку на вакансию',
    description: 'Загрузите своё резюме один раз, а затем просто вставляйте ссылки на интересные вакансии. ИИ сделает всё остальное.',
    gradient: 'from-blue-600 to-cyan-600'
  },
  {
    id: 3,
    icon: Target,
    title: 'Проверьте соответствие перед подачей заявки',
    description: 'Получите оценку совместимости и рекомендации по улучшению. Перестаньте тратить время на неподходящие вакансии.',
    gradient: 'from-cyan-600 to-teal-600'
  },
  {
    id: 4,
    icon: Rocket,
    title: 'Вы готовы! Давайте начнём',
    description: 'Увеличьте свои шансы на получение работы мечты с JobMatch AI.',
    gradient: 'from-teal-600 to-green-600'
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Переход к следующему слайду
  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  // Анимации для слайдов
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const current = slides[currentSlide];
  const IconComponent = current.icon;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Индикатор прогресса */}
      <div className="pt-safe-top px-6 py-8">
        <div className="flex space-x-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                index <= currentSlide 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Контейнер слайдов */}
      <div className="flex-1 px-6 pb-8 flex flex-col">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={currentSlide}
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="flex-1 flex flex-col items-center justify-center text-center"
          >
            {/* Иконка с анимированным фоном */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: 0.2, 
                type: "spring", 
                stiffness: 260, 
                damping: 20 
              }}
              className={`mb-8 p-6 rounded-3xl bg-gradient-to-br ${current.gradient} shadow-2xl`}
            >
              <IconComponent className="w-16 h-16 text-white" />
            </motion.div>

            {/* Заголовок */}
            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-6 leading-tight"
            >
              {current.title}
            </motion.h1>

            {/* Описание */}
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-300 leading-relaxed max-w-sm"
            >
              {current.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Кнопка продолжения */}
        <motion.button
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={nextSlide}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl backdrop-blur-xl border border-white/10 flex items-center justify-center space-x-2 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-lg">
            {currentSlide === slides.length - 1 ? 'Начать работу' : 'Продолжить'}
          </span>
          <ChevronRight className="w-5 h-5" />
        </motion.button>

        {/* Кнопка пропуска (только не на последнем слайде) */}
        {currentSlide < slides.length - 1 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={onComplete}
            className="mt-4 text-gray-400 hover:text-white transition-colors text-center py-2"
          >
            Пропустить
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;