import { Button } from '@/components/ui/button'
import { ArrowRight, Play } from 'lucide-react'

const stats = [
  { label: 'Активных салонов', value: '1 200+' },
  { label: 'Записей в месяц', value: '32K' },
  { label: 'Стран присутствия', value: '18' }
]

export default function HeroSection() {
  return (
    <section id="hero" className="relative isolate overflow-hidden -mt-24 md:-mt-28 min-h-screen bg-[#fdf9f4] text-[#141316]">
      <video className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline poster="/img/hero-photo.jpg">
        <source src="/video/hero-salon.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(253,249,244,0.95)_10%,rgba(244,233,219,0.85)_55%,rgba(243,220,189,0.55)_95%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,221,170,0.45),transparent_60%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-96px)] max-w-7xl flex-col justify-between px-6 py-24">
        <div className="space-y-6">
          <p className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-4 py-1 text-xs uppercase tracking-[0.4em] text-[#a7843b]">
            beta · мультисалонная платформа
          </p>
          <h1 className="hero-title text-5xl font-light leading-[1] tracking-[0.14em] md:text-[5.5rem]">
            УПРАВЛЯЙТЕ <br />
            САЛОНОМ <br />
            БЕЗ СТРЕССА
          </h1>
          <p className="max-w-2xl text-base text-[#3d3d3f] md:text-lg">
            Мы запускаем ядро для сетей салонов: онлайн-резервации, мультисалонный контроль и базовая аналитика. Сейчас это
            открытая бета — можно протестировать поток клиентов и влиять на roadmap.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button className="h-14 rounded-full bg-[#f5b259] px-10 text-lg font-semibold text-[#201c17] shadow-[0_25px_50px_rgba(245,178,89,0.35)] transition hover:-translate-y-0.5 hover:bg-[#f8c06f]">
              Попробовать бесплатно 7 дней
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" className="h-14 rounded-full border border-black/10 bg-white/80 px-8 text-lg text-[#1f1f29] transition hover:bg-white">
              <Play className="mr-2 h-5 w-5" />
              Смотреть демо
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-[#3d3d3f]">
            {['Онлайн-резервации', 'Мини-аналитика', 'Мультисалон', 'Roadmap 2025'].map((badge) => (
              <span key={badge} className="rounded-full bg-white/90 px-4 py-2">
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-16 space-y-10">
          <div className="grid gap-4 text-sm text-[#3d3d3f] sm:grid-cols-3">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-black/10 bg-white/80 px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition hover:-translate-y-1"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-[#a7843b]">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-[#1f1f29]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
