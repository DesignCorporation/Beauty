import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Palette,
  Layers,
  Shield,
  Zap,
  Code,
  ClipboardList,
  Terminal,
  AlertTriangle,
  BookOpen
} from 'lucide-react';

interface AppSpec {
  name: string;
  port: string;
  stack: string[];
  notes: string[];
  color: string;
}

const apps: AppSpec[] = [
  {
    name: 'Landing Page',
    port: '6000',
    stack: ['Next.js 15.5.3 + React 19', 'TypeScript', 'Tailwind CSS', 'SEO + Custom server.js'],
    notes: ['SSR + статическая генерация.', 'Использует @beauty-platform/ui.', 'Под капотом — Inter + Radix цвета.'],
    color: 'bg-indigo-50 border-indigo-200 text-indigo-800'
  },
  {
    name: 'Salon CRM',
    port: '6001',
    stack: ['React 18 + Vite', 'TypeScript', 'React Router DOM', '@beauty-platform/ui'],
    notes: ['i18next для локализации.', 'React Query v3 для API состояния.', 'Календарь на FullCalendar (drag & drop).'],
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  {
    name: 'Admin Panel',
    port: '6002',
    stack: ['React 18 + Vite', 'React Query v3 + Axios', 'React Hook Form + Zod', '@beauty-platform/ui'],
    notes: ['26 секций документации (все в /documentation).', 'Services Monitoring + Auto-Restore управление.', 'Auth hook useAuth() + MFA routing.'],
    color: 'bg-purple-50 border-purple-200 text-purple-800'
  },
  {
    name: 'Client Booking',
    port: '6003',
    stack: ['React 18 + Vite', 'TypeScript', '@beauty-platform/ui', 'React Router DOM'],
    notes: ['Public-facing портал записи.', 'Responsive UI.', 'CSR-only (нет SSR).'],
    color: 'bg-emerald-50 border-emerald-200 text-emerald-800'
  }
];

const commonStack = [
  { title: 'React + TS', points: ['Strict mode → везде.', 'Functional components + hooks.', 'React Query v3 для данных.', 'ESLint + Prettier на уровне репозитория.'] },
  { title: 'UI Kit', points: ['@beauty-platform/ui (shadcn + Radix).', 'Sidebar: Radix Sheet (mobile) + collapsible (desktop).', 'Tailwind CSS (конфиг в packages/ui).', 'Темная/светлая тема, i18n.', 'Lucide icons — стандарт.'] },
  { title: 'Сборка', points: ['Vite (React) + SWC build.', 'Next.js 15 (landing).', 'pnpm --filter <app> dev для запуска.', 'Storybook (в бэклоге) для ui-kit.'] }
];

const authRules = [
  'httpOnly cookies — единственный storage токенов.',
  'Все сетевые вызовы → credentials: "include".',
  'Запрещён localStorage/sessionStorage для auth.',
  'Используем useAuth() для состояния пользователя.',
  'MFA в SPA: MFAVerificationPage + MfaVerifyForm.'
];

const stylingRules = [
  'Цвета: primary #6366f1, secondary #64748b, success #22c55e, danger #ef4444, warning #f59e0b.',
  'Spacing: 8px grid, gap/padding кратны 2.',
  'Layout: flex/grid + space/gap, без хаотичных margin.',
  'Карточки: <Card> + <CardHeader> + <CardContent>, padding p-6.',
  'Ядро макета: SidebarProvider + SidebarInset с Radix Sheet для mobile (shadcn sidebar-07).'
];

const integrationChecklist = [
  'pnpm install выполнен из корня (workspace).',
  'Запуск приложений: pnpm --filter <app> dev.',
  'UI добавляем только через @beauty-platform/ui.',
  'API запросы идут через gateway /api/* и tenant-aware.',
  'Обновления документируем в соответствующем разделе Admin Panel.'
];

const troubleshooting = [
  'После логина нет данных → проверь credentials include.',
  'Prisma enableTracing error → все Prisma пакеты = 5.22.0, npx prisma generate.',
  'UI out of sync → используй компоненты ui-пакета, а не кастомные.',
  'Повторы API запросов → следи за QueryKey и invalidateQueries.',
  'Tailwind конфликтует → не меняй core config, избегай !important.'
];

const imagesApiRules = [
  'Images API (6026) возвращает относительные пути вида /api/images/uploads/...',
  'НЕ используй .url() валидацию для полей с относительными путями (avatar, logo, photos).',
  'Upload endpoint: POST /api/images/upload?type={type}&entityId={id} с multipart/form-data.',
  'Поддерживаемые типы: user_avatar, salon_logo, service_photo, staff_photo.',
  'Автоматическая оптимизация изображений и создание thumbnails.',
  'Auto-cleanup: старые изображения удаляются при загрузке новых (для user_avatar).'
];

export const FrontendSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-6 h-6 text-indigo-600" />
          Frontend Development Overview
        </CardTitle>
        <p className="text-sm text-gray-600">
          Обновлено 10.10.2025. Все фронтенды используют единый UI-kit, httpOnly auth и tenant-aware API. Sidebar на базе shadcn sidebar-07 с Radix Sheet для mobile.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-700">
        {apps.map((app) => (
          <div key={app.name} className={`${app.color} rounded-lg border p-3 shadow-sm space-y-2`}>
            <div className="flex justify-between items-center text-xs uppercase tracking-wide">
              <span className="font-semibold">{app.name}</span>
              <span className="font-mono text-gray-500">:{app.port}</span>
            </div>
            <div className="text-xs space-y-1">
              <strong className="block text-gray-900">Стек:</strong>
              <ul className="list-disc pl-4 space-y-1">
                {app.stack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="text-xs space-y-1">
              <strong className="block text-gray-900">Особенности:</strong>
              <ul className="list-disc pl-4 space-y-1">
                {app.notes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="w-5 h-5 text-blue-600" />
          Общий стек
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
        {commonStack.map((block) => (
          <div key={block.title} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1">
            <h4 className="font-semibold text-gray-900">{block.title}</h4>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              {block.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-emerald-600" />
          Auth & безопасность
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h4 className="font-semibold text-emerald-900 mb-2">Критические правила</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs text-emerald-700">
            {authRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700">
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <h5 className="font-semibold text-red-900 mb-1">Запрещено</h5>
            <pre className="bg-white rounded p-2 text-red-700">{`// ❌ неправильное хранение токена
const [token, setToken] = useState<string | null>(null);
localStorage.setItem('token', token ?? '');`}</pre>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <h5 className="font-semibold text-green-900 mb-1">Правильно</h5>
            <pre className="bg-white rounded p-2 text-green-700">{`// ✅ правильная интеграция
const { user, isAuthenticated, login } = useAuth();
import { sdkClient } from '@/services/sdkClient';

const profile = await sdkClient.request('/auth/me');`}</pre>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Code className="w-5 h-5 text-purple-600" />
          @beauty-platform/ui snippets
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700">
        <Card className="bg-indigo-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="text-sm text-indigo-900">Импорты</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-white rounded p-2">{`import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  Form,
  Input,
  Sidebar,
  Sheet,
  Badge,
  useIsMobile
} from '@beauty-platform/ui'`}</pre>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">Layout</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-white rounded p-2">{`// Sidebar с Radix Sheet для mobile
<SidebarProvider defaultOpen={true}>
  <Sidebar collapsible="icon">
    <SidebarContent>…</SidebarContent>
  </Sidebar>
  <SidebarInset>
    <main className="px-4 py-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Заголовок</CardTitle>
        </CardHeader>
        <CardContent>// контент</CardContent>
      </Card>
    </main>
  </SidebarInset>
</SidebarProvider>

// Mobile: auto Sheet overlay (<768px)
// Desktop: collapsible icon mode (≥768px)`}</pre>
          </CardContent>
        </Card>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-amber-500" />
          Styling & layout
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-blue-900">Правила оформления</h4>
          <ul className="list-disc pl-4 space-y-1">
            {stylingRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        <div className="bg-muted border border-border rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-foreground">Layout snippet</h4>
          <pre className="bg-white rounded p-2">{`<div className="min-h-screen bg-gray-50">
  <SidebarProvider>
    <Sidebar>
      <SidebarContent>…</SidebarContent>
    </Sidebar>
    <SidebarInset>
      <main className="px-4 py-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Page title</CardTitle>
          </CardHeader>
          <CardContent>
            {/* контент */}
          </CardContent>
        </Card>
      </main>
    </SidebarInset>
  </SidebarProvider>
</div>`}</pre>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-sky-600" />
          Чек-лист интеграции
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <ul className="list-disc pl-6 space-y-1">
          {integrationChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" /> Поддерживай актуальность секций в Admin Panel после каждой фичи.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="w-5 h-5 text-orange-600" />
          Диагностика и performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <h4 className="font-semibold text-orange-900 mb-1">Где смотреть</h4>
          <ul className="list-disc pl-6 text-orange-800 text-xs space-y-1">
            <li><code>pnpm --filter admin-panel lint</code> — проверки линтера.</li>
            <li><code>pnpm --filter salon-crm test</code> — юнит тесты (при наличии).</li>
            <li><code>logs/auto-restore/</code> — если фрот отвалился, смотри сюда.</li>
            <li><code>Vite --host</code> — для локальных мобайльных проверок.</li>
          </ul>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          {troubleshooting.map((tip) => (
            <div key={tip} className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="w-5 h-5 text-cyan-600" />
          Images API & file uploads
        </CardTitle>
        <p className="text-xs text-gray-600 mt-1">
          Обновлено 10.10.2025. Критически важно: Images API возвращает относительные пути, не используй .url() валидацию!
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-700">
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <h4 className="font-semibold text-cyan-900 mb-2">Архитектурные правила</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs text-cyan-800">
            {imagesApiRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <h5 className="font-semibold text-red-900 mb-1">❌ Неправильно</h5>
            <pre className="bg-white rounded p-2 text-red-700 whitespace-pre-wrap">{`// ❌ НЕ используй .url() валидацию
const schema = z.object({
  avatar: z.string().url() // Ошибка!
});

// ❌ Относительный путь не пройдет
"/api/images/uploads/..." → Validation error`}</pre>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <h5 className="font-semibold text-green-900 mb-1">✅ Правильно</h5>
            <pre className="bg-white rounded p-2 text-green-700 whitespace-pre-wrap">{`// ✅ Используй min/max валидацию
const schema = z.object({
  avatar: z.string().min(1).max(500)
    .optional().nullable()
});

// ✅ Относительные пути работают
"/api/images/uploads/..." → ✓ Valid`}</pre>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-semibold text-blue-900 mb-2">Пример загрузки аватара</h4>
          <pre className="bg-white rounded p-2 text-xs text-blue-800 whitespace-pre-wrap">{`// 1. Загрузка файла на Images API через SDK
import { sdkClient } from '@/services/sdkClient';

const formData = new FormData();
formData.append('images', file);

const userId = '<user-id>';
const { images } = await sdkClient.request('/images/upload?type=user_avatar&entityId=' + userId, {
  method: 'POST',
  data: formData
});
const avatarUrl = images[0].url; // "/api/images/uploads/..."

// 2. Обновление профиля с относительным путем (CSRF в SDK)
await sdkClient.request('/auth/users/profile', {
  method: 'PUT',
  data: { avatar: avatarUrl }
});`}</pre>
        </div>
      </CardContent>
    </Card>
  </div>
);
