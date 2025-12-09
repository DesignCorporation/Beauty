import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Users, TrendingUp, Clock, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type FeatureColor = 'pink' | 'purple' | 'amber' | 'emerald'

const colorClasses: Record<FeatureColor, { bg: string; text: string; hoverBg: string }> = {
  pink: { bg: 'bg-pink-400', text: 'text-pink-600', hoverBg: 'hover:bg-pink-100/60' },
  purple: { bg: 'bg-purple-400', text: 'text-purple-600', hoverBg: 'hover:bg-purple-100/60' },
  amber: { bg: 'bg-amber-400', text: 'text-amber-600', hoverBg: 'hover:bg-amber-100/60' },
  emerald: { bg: 'bg-emerald-400', text: 'text-emerald-600', hoverBg: 'hover:bg-emerald-100/60' }
}

type Feature = {
  icon: LucideIcon
  title: string
  description: string
  color: FeatureColor
}

const features: Feature[] = [
  {
    icon: Calendar,
    title: 'Онлайн-запись',
    description:
      'Клиенты могут записываться 24/7 через красивый виджет на вашем сайте. Автоматические уведомления и напоминания.',
    color: 'pink'
  },
  {
    icon: Users,
    title: 'Управление клиентами',
    description:
      'Полная карточка клиента с историей посещений, предпочтениями и персональными заметками мастера.',
    color: 'purple'
  },
  {
    icon: TrendingUp,
    title: 'Аналитика финансов',
    description:
      'Отслеживайте доходы, расходы и прибыль в реальном времени. Красивые отчеты и прогнозы роста.',
    color: 'amber'
  },
  {
    icon: Clock,
    title: 'Расписание мастеров',
    description:
      'Удобное планирование смен, отпусков и загрузки мастеров. Оптимизация расписания для максимальной прибыли.',
    color: 'emerald'
  }
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-pink-100 rounded-full px-6 py-2 mb-6 border border-pink-200/50">
            <Sparkles className="w-4 h-4 text-pink-600" />
            <span className="text-pink-700 font-medium">Ключевые возможности</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6">
            Всё что нужно для <span className="text-pink-500">успеха</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Современные инструменты для управления салоном красоты.
            Автоматизируйте рутинные задачи и сфокусируйтесь на клиентах.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className={`group relative overflow-hidden border border-border shadow-lg shadow-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-white ${colorClasses[feature.color].hoverBg}`}
            >
              <CardContent className="p-8 relative">
                <div className="flex items-start gap-6">
                  <div
                    className={`w-16 h-16 ${colorClasses[feature.color].bg} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`text-2xl font-serif font-bold text-foreground mb-3 group-hover:${colorClasses[feature.color].text} transition-colors duration-300`}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-lg">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-20 bg-muted rounded-3xl p-12 border border-border">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-serif font-bold text-foreground mb-4">И многое другое в одной системе</h3>
            <p className="text-muted-foreground text-lg">Полный набор инструментов для современного салона</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              'SMS и Email уведомления',
              'Программа лояльности',
              'Управление складом',
              'Интеграция с соцсетями',
              'Мобильное приложение',
              'Техподдержка 24/7'
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-white/80 rounded-xl p-4 shadow-sm">
                <div className="w-2 h-2 bg-pink-400 rounded-full" />
                <span className="font-medium text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
