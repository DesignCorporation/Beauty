import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Download, Settings, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type StepColor = 'pink' | 'purple' | 'emerald'

const colorClasses: Record<StepColor, { bg: string; text: string }> = {
  pink: { bg: 'bg-pink-400', text: 'text-pink-600' },
  purple: { bg: 'bg-purple-400', text: 'text-purple-600' },
  emerald: { bg: 'bg-emerald-400', text: 'text-emerald-600' }
}

type Step = {
  number: string
  title: string
  description: string
  icon: LucideIcon
  color: StepColor
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Быстрая регистрация',
    description: 'Создайте аккаунт за 2 минуты. Никаких долгих настроек - система готова к работе сразу.',
    icon: Download,
    color: 'pink'
  },
  {
    number: '02',
    title: 'Настройка под ваш салон',
    description: 'Добавьте услуги, мастеров и настройте расписание. Импортируйте существующую базу клиентов.',
    icon: Settings,
    color: 'purple'
  },
  {
    number: '03',
    title: 'Начинайте работать',
    description: 'Принимайте записи, управляйте клиентами и отслеживайте прибыль. Всё в одном месте.',
    icon: Sparkles,
    color: 'emerald'
  }
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-muted">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-2 mb-6 border border-border shadow-sm">
            <span className="text-pink-700 font-medium">Как это работает</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6">
            Запуск за <span className="text-pink-500">10 минут</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Простой процесс внедрения. Без технических сложностей и долгого обучения персонала.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-32 left-0 right-0 mx-auto w-2/3 h-0.5 bg-muted" />

          <div className="grid lg:grid-cols-3 gap-8 relative">
            {steps.map((step, index) => (
              <Card
                key={step.number}
                className="relative bg-white border border-border shadow-lg shadow-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group"
              >
                <CardContent className="p-8 text-center">
                  <div
                    className={`w-16 h-16 ${colorClasses[step.color].bg} rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <span className="text-2xl font-bold text-white">{step.number}</span>
                  </div>

                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-pink-100 transition-colors duration-300">
                    <step.icon className={`w-6 h-6 text-muted-foreground group-hover:${colorClasses[step.color].text}`} />
                  </div>

                  <h3 className="text-2xl font-serif font-bold text-foreground mb-4">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">{step.description}</p>

                  {index < steps.length - 1 && (
                    <div className="lg:hidden flex justify-center mt-8">
                      <ArrowRight className="w-6 h-6 text-pink-300" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center mt-16">
          <div className="bg-pink-500 rounded-3xl p-12 text-white shadow-2xl shadow-pink-500/20">
            <h3 className="text-3xl font-serif font-bold mb-4">Готовы начать?</h3>
            <p className="text-xl mb-8 opacity-90">Попробуйте SalonPro бесплатно 14 дней</p>
            <button className="bg-white text-pink-600 px-8 py-4 rounded-full font-semibold text-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              Создать аккаунт сейчас
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
