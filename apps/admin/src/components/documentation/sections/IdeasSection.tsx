import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { Lightbulb, CheckCircle, Clock, Zap, Code, Palette, Shield, Users } from 'lucide-react';

interface Idea {
  id: string;
  title: string;
  description: string;
  category: 'ux' | 'performance' | 'security' | 'architecture';
  priority: 'high' | 'medium' | 'low';
  status: 'idea' | 'planned' | 'in-progress' | 'completed';
  estimatedHours?: number;
  author: string;
  createdAt: string;
  details?: string[];
}

interface Stat {
  label: string;
  value: string;
  color: string;
}

export const IdeasSection: React.FC = () => {
  const [expandedIdeas, setExpandedIdeas] = useState<Set<string>>(new Set());

  const toggleIdea = (ideaId: string) => {
    const newExpanded = new Set(expandedIdeas);
    if (newExpanded.has(ideaId)) {
      newExpanded.delete(ideaId);
    } else {
      newExpanded.add(ideaId);
    }
    setExpandedIdeas(newExpanded);
  };

  const ideas: Idea[] = [
    {
      id: 'system-health-dashboard',
      title: 'System Health Dashboard',
      description: 'Живой мониторинг здоровья системы с автоматическими тестами connectivity между всеми компонентами.',
      category: 'architecture',
      priority: 'medium',
      status: 'idea',
      estimatedHours: 10,
      author: 'Claude',
      createdAt: '2025-09-29',
      details: [
        'Замена старой CRM Diagnostics на современный live dashboard',
        'Интеграция с Orchestrator API вместо hardcoded команд',
        'Real-time health checks всех сервисов (API Gateway, Auth, CRM, etc)',
        'Автоматические connectivity тесты: БД → API → nginx → Frontend',
        'Live metrics: response time, uptime, error rate',
        'Без hardcoded tenant ID, паролей, URL',
        'Автообновление каждые 30 секунд',
        'Визуализация потока данных с индикаторами состояния',
        'Интерактивные тесты endpoints с результатами'
      ]
    },
    {
      id: 'live-sync',
      title: 'Live синхронизация MCP с админкой',
      description: 'Мгновенное обновление MCP при изменении документации (WebSocket вместо 5-минутного кеша).',
      category: 'performance',
      priority: 'medium',
      status: 'idea',
      estimatedHours: 6,
      author: 'Claude',
      createdAt: '2025-09-29',
      details: [
        'ТЕКУЩЕЕ РЕШЕНИЕ: 5-минутный TTL кеш работает стабильно',
        'УЛУЧШЕНИЕ: WebSocket соединение между админкой и MCP Server',
        'При изменении TSX документации → мгновенный push в MCP',
        'File watcher на /apps/admin-panel/src/components/documentation/',
        'Аналогично Vite HMR принципу',
        'Приоритет MEDIUM - текущее решение достаточно хорошее'
      ]
    },
    {
      id: 'interactive-checklist',
      title: 'Интерактивный редактор чек-листа',
      description: 'Возможность ставить галочки, добавлять комментарии, менять статусы задач прямо в админке. AI видит изменения в реальном времени.',
      category: 'ux',
      priority: 'high',
      status: 'idea',
      estimatedHours: 12,
      author: 'User',
      createdAt: '2025-08-15',
      details: [
        'Редактирование статуса задач прямо в UI',
        'Добавление комментариев и заметок к задачам',
        'История изменений логики/требований',
        'AI видит что готово, что нужно доделать, что изменилось'
      ]
    },
    {
      id: 'role-logic-system',
      title: 'Система логики ролей и работы сайта',
      description: 'Полная документация логики работы всех ролей пользователей и бизнес-процессов платформы.',
      category: 'architecture',
      priority: 'high',
      status: 'planned',
      estimatedHours: 20,
      author: 'User',
      createdAt: '2025-08-15',
      details: [
        'Логика работы каждой роли: SUPER_ADMIN, SALON_OWNER, MANAGER, STAFF_MEMBER, RECEPTIONIST, ACCOUNTANT, CLIENT',
        'Бизнес-процессы: регистрация, запись клиентов, управление салоном',
        'Интеграция с существующей системой ролей',
        'Документирование всех workflow'
      ]
    }
  ];

  const stats: Stat[] = [
    { label: 'Всего идей', value: ideas.length.toString(), color: 'text-indigo-600' },
    { label: 'В работе / Запланировано', value: ideas.filter(i => i.status === 'planned' || i.status === 'in-progress').length.toString(), color: 'text-blue-600' },
    { label: 'Высокий приоритет', value: ideas.filter(i => i.priority === 'high').length.toString(), color: 'text-red-600' },
    { label: 'Оценка времени', value: `${ideas.reduce((sum, idea) => sum + (idea.estimatedHours || 0), 0)}h`, color: 'text-green-600' }
  ];

  const getCategoryIcon = (category: Idea['category']) => {
    switch (category) {
      case 'ux': return <Palette className="w-4 h-4" />;
      case 'performance': return <Zap className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      case 'architecture': return <Code className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: Idea['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in-progress': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'planned': return <Clock className="w-4 h-4 text-orange-600" />;
      default: return <Lightbulb className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryColor = (category: Idea['category']) => {
    switch (category) {
      case 'ux': return 'bg-purple-50 border-purple-200';
      case 'performance': return 'bg-yellow-50 border-yellow-200';
      case 'security': return 'bg-red-50 border-red-200';
      case 'architecture': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getPriorityBadge = (priority: Idea['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const groupedIdeas = ideas.reduce((acc, idea) => {
    if (!acc[idea.category]) {
      acc[idea.category] = [];
    }
    acc[idea.category]!.push(idea);
    return acc;
  }, {} as Record<string, Idea[]>);

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-indigo-600" />
            Ideas & Future Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Коллекция идей для улучшения Beauty Platform. Эти функции помогут сделать платформу еще более удобной и эффективной.
          </p>

          {/* Статистика */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Последнее обновление */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Последнее обновление:</strong> 29.09.2025 - Редизайн в стиле документации, удалены 4 устаревших FEATURE идеи, убраны эмодзи
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Идеи по категориям */}
      {Object.entries(groupedIdeas).map(([category, categoryIdeas]) => (
        <Card key={category} className={`${getCategoryColor(category as Idea['category'])} border-2`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-gray-900">
              {getCategoryIcon(category as Idea['category'])}
              {category.toUpperCase()} ({categoryIdeas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryIdeas.map((idea) => (
              <div key={idea.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Заголовок идеи */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleIdea(idea.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(idea.status)}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{idea.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{idea.description}</p>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-1 rounded border ${getPriorityBadge(idea.priority)}`}>
                            {idea.priority.toUpperCase()}
                          </span>
                          {idea.estimatedHours && (
                            <span className="text-xs px-2 py-1 rounded border bg-gray-100 text-gray-800 border-gray-200">
                              ~{idea.estimatedHours}h
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 rounded border bg-blue-50 text-blue-800 border-blue-200">
                            {idea.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            by {idea.author}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-400 ml-2">
                      {expandedIdeas.has(idea.id) ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {/* Детали идеи (раскрывающиеся) */}
                {expandedIdeas.has(idea.id) && idea.details && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    <div className="mt-3">
                      <h5 className="font-medium text-gray-900 mb-2 text-sm">Детали реализации:</h5>
                      <ul className="space-y-1">
                        {idea.details.map((detail, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                      <span>Создано: {idea.createdAt}</span>
                      <span>Категория: {idea.category}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Важный урок */}
      <Card className="bg-green-50 border-2 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Users className="w-6 h-6" />
            Важный урок от пользователя
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              'Сначала думать логически',
              'Потом действовать',
              'Работаем ТАМ где находимся',
              'Не усложнять простые вещи'
            ].map((lesson, index) => (
              <div key={index} className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>{lesson}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};