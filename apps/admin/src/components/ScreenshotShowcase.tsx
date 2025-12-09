import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@beauty-platform/ui'
import {
  Camera,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  Image as ImageIcon,
  Maximize2,
  Share2
} from 'lucide-react'

interface Screenshot {
  id: string
  title: string
  description: string
  category: 'auth' | 'crm' | 'admin' | 'mobile' | 'process' | 'error'
  imagePath: string
  process?: string
  step?: number
  totalSteps?: number
  deviceType: 'desktop' | 'mobile' | 'tablet'
  timestamp?: string
  tags: string[]
  annotations?: Array<{
    x: number
    y: number
    width: number
    height: number
    text: string
    type: 'info' | 'warning' | 'error' | 'success'
  }>
}

export const ScreenshotShowcase: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [zoom, setZoom] = useState(100)

  // 🎯 Демонстрационные скриншоты процессов
  const screenshots: Screenshot[] = [
    {
      id: 'auth-login-flow',
      title: 'Процесс входа в админку',
      description: 'Полный flow аутентификации с MFA кодом и redirect на dashboard',
      category: 'auth',
      imagePath: '/api/images/process-screenshots/auth-login-sequence.png',
      process: 'Authentication Flow',
      step: 1,
      totalSteps: 4,
      deviceType: 'desktop',
      timestamp: '2025-08-22 18:45',
      tags: ['auth', 'mfa', 'login', 'security'],
      annotations: [
        { x: 320, y: 180, width: 280, height: 40, text: 'Форма логина с валидацией', type: 'info' },
        { x: 450, y: 320, width: 200, height: 30, text: 'MFA код (6 цифр)', type: 'warning' },
        { x: 600, y: 450, width: 150, height: 25, text: 'Redirect после успеха', type: 'success' }
      ]
    },
    {
      id: 'crm-calendar',
      title: 'CRM Календарь в действии',
      description: 'Интерактивный календарь с записями, мастерами и drag&drop',
      category: 'crm',
      imagePath: '/api/images/process-screenshots/crm-calendar-interaction.png',
      process: 'CRM Calendar Usage',
      step: 2,
      totalSteps: 5,
      deviceType: 'desktop',
      timestamp: '2025-08-22 17:30',
      tags: ['crm', 'calendar', 'appointments', 'drag-drop'],
      annotations: [
        { x: 100, y: 100, width: 200, height: 300, text: 'Sidebar с мастерами', type: 'info' },
        { x: 350, y: 150, width: 400, height: 250, text: 'Календарная сетка', type: 'success' },
        { x: 500, y: 420, width: 180, height: 80, text: 'Popup записи', type: 'warning' }
      ]
    },
    {
      id: 'admin-monitoring',
      title: 'Мониторинг сервисов',
      description: 'Живой мониторинг всех сервисов с алертами и историей статусов',
      category: 'admin',
      imagePath: '/api/images/process-screenshots/admin-monitoring-dashboard.png',
      process: 'System Monitoring',
      step: 1,
      totalSteps: 3,
      deviceType: 'desktop',
      timestamp: '2025-08-22 18:00',
      tags: ['monitoring', 'alerts', 'services', 'health'],
      annotations: [
        { x: 50, y: 120, width: 300, height: 60, text: 'Статусы сервисов в реальном времени', type: 'success' },
        { x: 400, y: 200, width: 250, height: 100, text: 'История событий', type: 'info' },
        { x: 680, y: 150, width: 200, height: 50, text: 'Алерты и уведомления', type: 'error' }
      ]
    },
    {
      id: 'mobile-client-booking',
      title: 'Мобильная запись клиента',
      description: 'Процесс записи клиента через мобильное приложение',
      category: 'mobile',
      imagePath: '/api/images/process-screenshots/mobile-booking-flow.png',
      process: 'Mobile Booking',
      step: 3,
      totalSteps: 6,
      deviceType: 'mobile',
      timestamp: '2025-08-22 16:45',
      tags: ['mobile', 'booking', 'client', 'responsive'],
      annotations: [
        { x: 50, y: 150, width: 250, height: 100, text: 'Выбор салона', type: 'info' },
        { x: 60, y: 300, width: 230, height: 80, text: 'Календарь свободного времени', type: 'success' },
        { x: 70, y: 450, width: 210, height: 60, text: 'Подтверждение записи', type: 'warning' }
      ]
    },
    {
      id: 'error-handling',
      title: 'Обработка ошибок 404/500',
      description: 'Красивые страницы ошибок с навигацией и полезными ссылками',
      category: 'error',
      imagePath: '/api/images/process-screenshots/error-pages-showcase.png',
      process: 'Error Handling',
      step: 1,
      totalSteps: 2,
      deviceType: 'desktop',
      timestamp: '2025-08-22 15:20',
      tags: ['error', 'ux', 'navigation', '404', '500'],
      annotations: [
        { x: 300, y: 200, width: 400, height: 150, text: 'Дружелюбное сообщение об ошибке', type: 'info' },
        { x: 450, y: 380, width: 200, height: 40, text: 'Кнопки быстрого перехода', type: 'success' }
      ]
    },
    {
      id: 'registration-wizard',
      title: 'Многошаговая регистрация',
      description: 'Wizard регистрации салона с автоопределением страны и валюты',
      category: 'process',
      imagePath: '/api/images/process-screenshots/registration-wizard-complete.png',
      process: 'Registration Wizard',
      step: 4,
      totalSteps: 5,
      deviceType: 'desktop',
      timestamp: '2025-08-22 14:10',
      tags: ['registration', 'wizard', 'country-detection', 'multi-step'],
      annotations: [
        { x: 200, y: 100, width: 500, height: 80, text: 'Прогресс-бар с шагами', type: 'info' },
        { x: 150, y: 250, width: 300, height: 200, text: 'Форма с автозаполнением', type: 'success' },
        { x: 500, y: 300, width: 250, height: 150, text: 'Предпросмотр тарифа', type: 'warning' }
      ]
    }
  ]

  const categories = [
    { id: 'all', name: 'Все процессы', icon: Camera, count: screenshots.length },
    { id: 'auth', name: 'Аутентификация', icon: Eye, count: screenshots.filter(s => s.category === 'auth').length },
    { id: 'crm', name: 'CRM Процессы', icon: Monitor, count: screenshots.filter(s => s.category === 'crm').length },
    { id: 'admin', name: 'Админка', icon: Monitor, count: screenshots.filter(s => s.category === 'admin').length },
    { id: 'mobile', name: 'Мобильные', icon: Smartphone, count: screenshots.filter(s => s.category === 'mobile').length },
    { id: 'process', name: 'Бизнес-процессы', icon: Play, count: screenshots.filter(s => s.category === 'process').length },
    { id: 'error', name: 'Ошибки', icon: ExternalLink, count: screenshots.filter(s => s.category === 'error').length }
  ]

  const filteredScreenshots = selectedCategory === 'all' 
    ? screenshots 
    : screenshots.filter(s => s.category === selectedCategory)

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      auth: <Eye className="w-4 h-4 text-blue-600" />,
      crm: <Monitor className="w-4 h-4 text-green-600" />,
      admin: <Monitor className="w-4 h-4 text-purple-600" />,
      mobile: <Smartphone className="w-4 h-4 text-orange-600" />,
      process: <Play className="w-4 h-4 text-indigo-600" />,
      error: <ExternalLink className="w-4 h-4 text-red-600" />
    }
    return iconMap[category as keyof typeof iconMap] || <ImageIcon className="w-4 h-4" />
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4 text-orange-600" />
      case 'tablet': return <Tablet className="w-4 h-4 text-blue-600" />
      default: return <Monitor className="w-4 h-4 text-gray-600" />
    }
  }

  const nextSlide = () => {
    if (filteredScreenshots.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % filteredScreenshots.length)
    }
  }

  const prevSlide = () => {
    if (filteredScreenshots.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + filteredScreenshots.length) % filteredScreenshots.length)
    }
  }

  // Автопроигрывание слайдшоу
  React.useEffect(() => {
    if (isPlaying && filteredScreenshots.length > 1) {
      const interval = setInterval(nextSlide, 4000)
      return () => clearInterval(interval)
    }
    return
  }, [isPlaying, filteredScreenshots.length])

  const currentScreenshotForSlide = filteredScreenshots[currentSlide]

  return (
    <Card className="border-2 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-green-600" />
          📸 Визуальные процессы системы
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Категории */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id)
                    setCurrentSlide(0)
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                  <Badge variant="outline" className="ml-1 text-xs">
                    {category.count}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredScreenshots.length > 0 ? (
          <>
            {/* Слайдшоу контролы */}
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                    isPlaying ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Пауза' : 'Автопоказ'}
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevSlide}
                    className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium px-3">
                    {currentSlide + 1} / {filteredScreenshots.length}
                  </span>
                  <button
                    onClick={nextSlide}
                    className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium px-2">{zoom}%</span>
                <button
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Основной скриншот */}
            {currentScreenshotForSlide && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        {getCategoryIcon(currentScreenshotForSlide.category)}
                        <h3 className="text-xl font-semibold">{currentScreenshotForSlide.title}</h3>
                        {getDeviceIcon(currentScreenshotForSlide.deviceType)}
                      </div>
                      <p className="text-gray-600 mb-3">{currentScreenshotForSlide.description}</p>
                      
                      {/* Процесс и шаги */}
                      {currentScreenshotForSlide.process && (
                        <div className="flex items-center gap-4 mb-3">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {currentScreenshotForSlide.process}
                          </Badge>
                          {currentScreenshotForSlide.step && currentScreenshotForSlide.totalSteps && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Шаг</span>
                              <div className="flex gap-1">
                                {Array.from({ length: currentScreenshotForSlide.totalSteps }, (_, i) => (
                                  <div
                                    key={i}
                                    className={`w-3 h-3 rounded-full ${
                                      i < currentScreenshotForSlide.step! ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-600">
                                {currentScreenshotForSlide.step}/{currentScreenshotForSlide.totalSteps}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Теги */}
                      <div className="flex flex-wrap gap-1">
                        {currentScreenshotForSlide.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-gray-100">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                        title="Полноэкранный режим"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                        title="Скачать скриншот"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                        title="Поделиться"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Превью изображения */}
                  <div 
                    className="relative bg-gray-100 rounded-lg overflow-hidden"
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                  >
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">Демо скриншот процесса</p>
                        <p className="text-sm text-gray-500 mt-2">{currentScreenshotForSlide.imagePath}</p>
                      </div>
                    </div>

                    {/* Аннотации */}
                    {currentScreenshotForSlide.annotations?.map((annotation, index) => (
                      <div
                        key={index}
                        className={`absolute border-2 ${
                          annotation.type === 'error' ? 'border-red-500 bg-red-100' :
                          annotation.type === 'warning' ? 'border-yellow-500 bg-yellow-100' :
                          annotation.type === 'success' ? 'border-green-500 bg-green-100' :
                          'border-blue-500 bg-blue-100'
                        } bg-opacity-20 rounded`}
                        style={{
                          left: `${annotation.x}px`,
                          top: `${annotation.y}px`,
                          width: `${annotation.width}px`,
                          height: `${annotation.height}px`
                        }}
                        title={annotation.text}
                      >
                        <div className={`absolute -top-6 left-0 px-2 py-1 text-xs rounded ${
                          annotation.type === 'error' ? 'bg-red-500 text-white' :
                          annotation.type === 'warning' ? 'bg-yellow-500 text-white' :
                          annotation.type === 'success' ? 'bg-green-500 text-white' :
                          'bg-blue-500 text-white'
                        }`}>
                          {annotation.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Временная метка */}
                  {currentScreenshotForSlide.timestamp && (
                    <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                      <Camera className="w-4 h-4" />
                      Снято: {currentScreenshotForSlide.timestamp}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Сетка всех скриншотов */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScreenshots.map((screenshot, index) => (
                <Card 
                  key={screenshot.id} 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    currentSlide === index ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => setCurrentSlide(index)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(screenshot.category)}
                      <h4 className="font-medium text-sm">{screenshot.title}</h4>
                      {getDeviceIcon(screenshot.deviceType)}
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{screenshot.description}</p>
                    
                    {screenshot.process && (
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {screenshot.process}
                        </Badge>
                        {screenshot.step && screenshot.totalSteps && (
                          <span className="text-xs text-gray-500">
                            {screenshot.step}/{screenshot.totalSteps}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Скриншоты для категории "{selectedCategory}" пока не добавлены
            </p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Показать все скриншоты
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ScreenshotShowcase