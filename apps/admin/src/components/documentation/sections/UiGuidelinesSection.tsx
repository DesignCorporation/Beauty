import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@beauty-platform/ui'
import { Layout, Columns, Smartphone, Palette, Workflow, Layers, ArrowRight } from 'lucide-react'

export const UiGuidelinesSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Palette className="h-5 w-5" />
            Unified UI Direction (CRM → Admin → Client Portal)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-amber-900">
          <p>
            Вся продуктовая линейка Beauty Platform переходит на единый визуальный язык. Базовый
            пример — блок <strong>Shadcn</strong> <code>sidebar-07</code> (двухуровневое меню: салонные разделы сверху, меню пользователя снизу).
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Шрифт, отступы, цветовая палитра, тёмный режим — едины во всех приложениях.</li>
            <li>Базовые layout-компоненты живут в <code>@beauty-platform/ui</code> (или отдельном пакете) и импортируются в CRM, Admin, Client Portal.</li>
            <li>Mobile-first подход: breakpoints ≥320/768/1024 px; sidebar сворачивается в компактный режим.</li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Layout className="h-5 w-5 text-indigo-600" />
              Целевой layout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal pl-6 space-y-2">
              <li><strong>Sidebar</strong> — на основе shadcn sidebar-07. Верх: разделы салона (CRM). Низ: профиль пользователя, настройки, выход.</li>
              <li><strong>Top bar (optional)</strong> — бейдж статуса салона, переключатель тёмной темы, breadcrumbs.</li>
              <li><strong>Content wrapper</strong> — контейнер 1200px, отступы 24px desktop / 16px tablet / 12px mobile.</li>
              <li><strong>PageHeader</strong> — заголовок, описание, actions (в @beauty-platform/ui как общая компонента).</li>
            </ol>
            <Badge variant="outline" className="border-indigo-300 text-indigo-600">
              Результат: CRM страницы выглядят одинаково и масштабируются на остальные приложения
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Workflow className="h-5 w-5 text-emerald-600" />
              Порядок миграции (без поломок)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal pl-6 space-y-2">
              <li><strong>Shared tokens</strong> — цвета, шрифты, spacing → вынести в <code>@beauty-platform/ui</code>.</li>
              <li><strong>LayoutShell</strong> — общий компонент, который возвращает shadcn sidebar + content. В CRM заменяет текущий <code>AppLayout</code>.</li>
              <li><strong>Feature-by-feature</strong> — Dashboard → Calendar → Clients → Services → Notifications → Settings.</li>
              <li><strong>Storybook</strong> — набор страниц и состояний (loading, empty, error) как reference.</li>
            </ol>
            <div className="flex items-center gap-2 text-xs text-emerald-700">
              <ArrowRight className="h-4 w-4" /> После каждого шага — визуальный регресс (Chromatic/Storybook) + smoke на мобильных.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
            <Columns className="h-5 w-5 text-blue-600" />
            Стандартные блоки страницы
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2 text-sm text-muted-foreground">
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">PageHeader</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Заголовок, описание, actions.</li>
              <li>Breadcrumb (если вложенность {'>'} 1).</li>
              <li>Sticky на scroll (опционально).
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Content</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Используем <code>Card</code> для секций.</li>
              <li>Таблицы — shadcn <code>Table</code> + тулбар с фильтрами.</li>
              <li>Empty/Error — единый компонент <code>EmptyState</code> с CTA.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Sidebar (Radix Sheet)</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Config: массив <code>{'{ label, icon, href, badge? }'}</code>.
              </li>
              <li>Active state — подсветка + бордер слева.</li>
              <li>Mobile вариант — <strong>Radix Sheet</strong> с overlay backdrop.</li>
              <li>Desktop: <code>collapsible="icon"</code> - сворачивается в узкую полоску.</li>
              <li>Hook: <code>useIsMobile()</code> для responsive переключения.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Utility footer</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Переключатель салона / tenant.</li>
              <li>Тоггл темы + язык.</li>
              <li>Профиль + logout.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Smartphone className="h-5 w-5 text-fuchsia-600" />
            Responsive правила
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <div className="flex flex-col gap-1">
            <strong>Mobile ≥320px:</strong>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sidebar скрыт (Sheet).</li>
              <li>PageHeader → одна колонка.</li>
              <li>Cards вместо широких таблиц.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-1">
            <strong>Tablet ≥768px:</strong>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sidebar иконками (ширина ~80px).</li>
              <li>Две колонки контента.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-1">
            <strong>Desktop ≥1024px:</strong>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sidebar полный (ширина ~280px).</li>
              <li>Контентная сетка 3 колонки, max-width 1200px.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Layers className="h-5 w-5 text-rose-600" />
            Plan of Record (CRM → Admin → Portal)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal pl-6 space-y-2">
            <li><strong>CRM shell</strong>: реализовать <code>LayoutShell</code> (sidebar + header) и заменить текущий layout.</li>
            <li><strong>CRM страницы</strong>: Dashboard → Calendar → Clients → Services → Notifications → Settings.</li>
            <li><strong>Documentation</strong>: добавить Storybook/mdx примеры + ссылку в MCP.</li>
            <li><strong>Admin Panel</strong>: перенести dashboard/doc pages на LayoutShell.</li>
            <li><strong>Client Portal</strong>: синхронизировать `/dashboard`, `/profile`, `/appointments` с новой сеткой.</li>
          </ol>
          <div className="text-xs text-muted-foreground">
            Каждый шаг фиксируем в GitHub Issue: чек-листы, скриншоты desktop + мобильная версия.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
