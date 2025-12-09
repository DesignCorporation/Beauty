'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { ArrowRight, Check, MenuIcon, Play, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

type Lang = 'en' | 'ru'
type Copy = typeof copy.en

const copy = {
  en: {
    nav: [
      { href: '#product', label: 'Product' },
      { href: '#solutions', label: 'Solutions' },
      { href: '#modules', label: 'Modules' },
      { href: '#pricing', label: 'Pricing' },
      { href: '#resources', label: 'Resources' }
    ],
    hero: {
      badge: 'Beta · Multisalon OS',
      title: 'LEAD YOUR SALON WITHOUT STRESS',
      subtitle:
        'Beauty Design Corp runs bookings, multisalon control, and essentials analytics in a calm, premium interface. Join the open beta and shape the roadmap.',
      ctaPrimary: 'Start free for 7 days',
      ctaSecondary: 'Watch product tour',
      badges: ['Online bookings', 'Essential analytics', 'Multisalon', 'Open roadmap']
    },
    stats: [
      { label: 'Beta salons', value: '≈120', note: 'Cohort expanding' },
      { label: 'Response time', value: '< 2h', note: 'Concierge support' },
      { label: 'Regions', value: 'EU first', note: 'Expanding gradually' }
    ],
    product: {
      nowTitle: 'What works today',
      nowIntro: 'Core flows you can touch right now. Stable, but still polishing edges.',
      nowItems: [
        { title: 'Online reservations', text: 'Site + mobile booking, confirmations in one tap, automatic reminders.' },
        {
          title: 'Multisalon calendar',
          text: 'Manage schedules across locations, conflict highlighting, vacations, granular permissions.'
        },
        { title: 'Essential analytics', text: 'Revenue and occupancy by salon and team. Export to Sheets.' }
      ],
      nextTitle: 'Where we are growing',
      nextIntro: 'Planned steps; timing may shift based on beta feedback.',
      roadmap: [
        { quarter: 'Q4 2025', focus: 'AI care loops', detail: 'Reactivation and VIP playbooks with safe automation.' },
        { quarter: 'Q1 2026', focus: 'Financial depth', detail: 'P&L per salon, forecasts, accounting integrations.' },
        { quarter: 'Q2 2026', focus: 'Add-on marketplace', detail: 'Loyalty, marketing, POS, inventory partners.' }
      ]
    },
    dashboard: {
      title: 'A living dashboard that breathes with your business',
      intro:
        'Large, calm typography, live charts, tactile textures. Quick salon switching, real-time load, and AI hints inside your daily tools.',
      bullets: ['Live booking feed', 'One-click salon switch', 'AI suggestions in chat', 'Public roadmap', 'Concierge onboarding'],
      cards: ['Calendar · drag & drop', 'AI Insight · reschedule suggestion', 'Weekly revenue · trend view']
    },
    modules: {
      title: 'Modular by design',
      intro: 'Pick the blocks you need today; scale to chain-grade tooling later.',
      items: [
        { title: 'Scheduling', text: 'Smart slots, buffers, double bookings control.' },
        { title: 'Client base', text: 'Full history, notes, tags, retention signals.' },
        { title: 'Payments-ready', text: 'Ready for gateways, deposits, no-show fees.' },
        { title: 'Analytics light', text: 'Dashboards for owners and managers.' },
        { title: 'Team ops', text: 'Roles, approvals, multi-location shifts.' },
        { title: 'Apps & integrations', text: 'Calendar sync, chat, marketing tools.' }
      ]
    },
    integrations: {
      title: 'Integrations to fit your stack',
      intro: 'Calendar sync, payments, comms, marketing — safe defaults today, partners next.',
      logos: ['Google Calendar', 'Stripe-ready', 'Twilio/Email', 'Meta/Google Ads', 'Zapier', 'Sheets export']
    },
    pricing: {
      title: 'Pricing for the beta cohort',
      subtitle: 'One simple entry plan while we polish the platform. Lifetime discount for early adopters.',
      plans: [
        {
          name: 'Starter Beta',
          price: '€49/mo',
          note: 'per location during beta',
          features: ['Online bookings', 'Multisalon calendar', 'Essential analytics', 'Concierge onboarding']
        },
        {
          name: 'Growth Beta',
          price: '€79/mo',
          note: 'per location, limited seats',
          features: ['All Starter', 'Priority support < 2h', 'Early access to AI loops', 'Beta pricing locked in']
        }
      ]
    },
    testimonials: {
      title: 'Building with real salons',
      subtitle: 'Early owners help us shape the product. Numbers are placeholders until full rollout.',
      items: [
        {
          quote: 'The multisalon calendar finally feels calm. My managers see load by location without juggling tabs.',
          name: 'Eliza K., Owner',
          salon: 'Boutique studio, Warsaw'
        },
        {
          quote: 'We export weekly revenue to Sheets and send AI prompts in chat. The team adopted it in days.',
          name: 'Marek P., GM',
          salon: 'Urban salon, Kraków'
        }
      ]
    },
    stories: {
      title: 'Join the beta cohort',
      intro: 'We ship weekly with feedback from EU salon owners and managers.',
      cta: 'Request onboarding'
    },
    footer: {
      about: 'Beauty Design Corp — European SaaS for salons. Calm tech that respects reality of your day-to-day.',
      contact: 'support@beautydesign.corp',
      phone: '+48 22 123 45 67'
    }
  },
  ru: {
    nav: [
      { href: '#product', label: 'Продукт' },
      { href: '#solutions', label: 'Решения' },
      { href: '#modules', label: 'Модули' },
      { href: '#pricing', label: 'Тарифы' },
      { href: '#resources', label: 'Ресурсы' }
    ],
    hero: {
      badge: 'Бета · мультисалонная ОС',
      title: 'УПРАВЛЯЙТЕ САЛОНОМ БЕЗ СТРЕССА',
      subtitle:
        'Beauty Design Corp ведёт записи, мультисалонный контроль и базовую аналитику в спокойном, премиальном интерфейсе. Присоединяйтесь к открытой бете и влийте свой голос в roadmap.',
      ctaPrimary: 'Попробовать бесплатно 7 дней',
      ctaSecondary: 'Смотреть тур по продукту',
      badges: ['Онлайн-записи', 'Базовая аналитика', 'Мультисалон', 'Открытый roadmap']
    },
    stats: [
      { label: 'Салоны в бете', value: '≈120', note: 'Расширяем осторожно' },
      { label: 'Ответ поддержки', value: '< 2ч', note: 'Консьерж-команда' },
      { label: 'Регионы', value: 'EU сначала', note: 'Постепенно расширяем' }
    ],
    product: {
      nowTitle: 'Что уже работает',
      nowIntro: 'Базовые процессы, которые можно трогать прямо сейчас. Стабильно, но ещё шлифуем детали.',
      nowItems: [
        {
          title: 'Онлайн-резервации',
          text: 'Записи с сайта и мобилки, подтверждения в один тап, автоматические напоминания.'
        },
        {
          title: 'Мультисетевой календарь',
          text: 'Расписания по нескольким салонам, подсветка конфликтов, отпуска, гибкие права.'
        },
        { title: 'Мини-аналитика', text: 'Выручка и загрузка по салонам и мастерам. Экспорт в Sheets.' }
      ],
      nextTitle: 'Куда растём',
      nextIntro: 'Плановые этапы, сроки можем двигать по результатам беты.',
      roadmap: [
        { quarter: 'Q4 2025', focus: 'AI-кампании заботы', detail: 'Возвраты гостей и VIP playbooks с безопасной автоматикой.' },
        { quarter: 'Q1 2026', focus: 'Глубина финансов', detail: 'P&L по салонам, прогнозы, интеграции с бухучётом.' },
        { quarter: 'Q2 2026', focus: 'Маркетплейс аддонов', detail: 'Лояльность, маркетинг, POS, склад — через партнёров.' }
      ]
    },
    dashboard: {
      title: 'Живой дашборд, который дышит с вашим бизнесом',
      intro:
        'Крупная спокойная типографика, живые графики, тактильные текстуры. Быстрый переключатель салонов, загрузка в реальном времени и AI-подсказки там, где нужно.',
      bullets: ['Лента записей', 'Смена салона в один клик', 'AI-подсказки в чате', 'Публичный roadmap', 'Консьерж-внедрение'],
      cards: ['Календарь · drag & drop', 'AI Insight · предложить перенос', 'Выручка недели · тренд']
    },
    modules: {
      title: 'Модульная архитектура',
      intro: 'Берите блоки, которые нужны сегодня. Масштабируйтесь до уровня сети, когда будете готовы.',
      items: [
        { title: 'Запись и расписания', text: 'Умные слоты, буферы, контроль двойных записей.' },
        { title: 'Клиентская база', text: 'История, заметки, теги, сигналы удержания.' },
        { title: 'Платежи', text: 'Готовность к оплатам, депозитам и оплате no-show.' },
        { title: 'Лёгкая аналитика', text: 'Дашборды для владельца и управляющего.' },
        { title: 'Команда', text: 'Роли, approvals, мультисмены по точкам.' },
        { title: 'Интеграции', text: 'Синхронизация календарей, чат, маркетинговые инструменты.' }
      ]
    },
    integrations: {
      title: 'Интеграции под ваш стек',
      intro: 'Синхронизация календарей, платежи, коммуникации и маркетинг — базово сегодня, партнёры дальше.',
      logos: ['Google Calendar', 'Stripe-ready', 'Twilio/Email', 'Meta/Google Ads', 'Zapier', 'Sheets export']
    },
    pricing: {
      title: 'Тарифы для беты',
      subtitle: 'Один простой входной план, пока доводим платформу. Ранняя скидка фиксируется навсегда.',
      plans: [
        {
          name: 'Starter Beta',
          price: '€49/мес',
          note: 'за локацию на время беты',
          features: ['Онлайн-записи', 'Мультисалонный календарь', 'Мини-аналитика', 'Консьерж-внедрение']
        },
        {
          name: 'Growth Beta',
          price: '€79/мес',
          note: 'за локацию, ограниченно',
          features: ['Всё из Starter', 'Приоритет < 2ч', 'Ранний доступ к AI', 'Цена беты фиксируется']
        }
      ]
    },
    testimonials: {
      title: 'Делаем с реальными салонами',
      subtitle: 'Ранние владельцы помогают формировать продукт. Цифры placeholder до полного запуска.',
      items: [
        {
          quote: 'Мультисалонный календарь наконец спокойный. Менеджеры видят загрузку по точкам без сотни вкладок.',
          name: 'Элиза K., владелец',
          salon: 'Бутик-студия, Варшава'
        },
        {
          quote: 'Экспортируем выручку в Sheets и шлём AI-подсказки в чат. Команда привыкла за пару дней.',
          name: 'Марек P., управляющий',
          salon: 'Городской салон, Краков'
        }
      ]
    },
    stories: {
      title: 'Присоединяйтесь к бете',
      intro: 'Шипим еженедельно, опираясь на фидбек владельцев и управляющих из ЕС.',
      cta: 'Запросить внедрение'
    },
    footer: {
      about: 'Beauty Design Corp — европейская SaaS-платформа для салонов. Спокойные технологии, которые уважают реальность дня.',
      contact: 'support@beautydesign.corp',
      phone: '+48 22 123 45 67'
    }
  }
}

const modulesGridEn = copy.en.modules.items
const modulesGridRu = copy.ru.modules.items
const nowFeaturesEn = copy.en.product.nowItems
const nowFeaturesRu = copy.ru.product.nowItems
const roadmapEn = copy.en.product.roadmap
const roadmapRu = copy.ru.product.roadmap
const statsEn = copy.en.stats
const statsRu = copy.ru.stats

function Header({ t, lang, setLang }: { t: Copy; lang: Lang; setLang: (l: Lang) => void }) {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors ${isScrolled ? 'bg-black/90 backdrop-blur' : 'bg-black/75 backdrop-blur'}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-bold text-[#111827] shadow-lg">BD</div>
          <span className="text-base font-semibold tracking-wide">Beauty Design Corp</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {t.nav.map((item) => (
            <a key={item.href} href={item.href} className="text-white/80 transition hover:text-white">
              {item.label}
            </a>
          ))}
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-white/80 ring-1 ring-white/10">
            {(['ru', 'en'] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === code ? 'bg-white text-[#111827] shadow-sm' : 'text-white/80 hover:text-white'}`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <Button className="rounded-full bg-white px-5 text-sm font-semibold text-[#111827] shadow-lg transition hover:bg-white/90">
            <a href="#pricing">{t.hero.ctaPrimary}</a>
          </Button>
        </nav>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-white md:hidden"
          aria-label="Открыть меню"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>
      {isMobileMenuOpen && (
        <div className="border-t border-white/10 bg-black/90 px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4 text-sm text-white/85">
            {t.nav.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
            <div className="flex items-center gap-2">
              {(['ru', 'en'] as Lang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setLang(code)
                    setMobileMenuOpen(false)
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === code ? 'bg-white text-[#111827] shadow-sm' : 'text-white/80 hover:text-white'}`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <Button className="rounded-full bg-white text-sm font-semibold text-[#111827]" onClick={() => setMobileMenuOpen(false)}>
              <a href="#pricing">{t.hero.ctaPrimary}</a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}

function Hero({ t, stats }: { t: Copy; stats: typeof statsEn }) {
  return (
    <section id="hero" className="relative isolate overflow-hidden bg-[#f9fafb] text-[#111827]">
      <video className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline poster="/img/hero-photo.jpg">
        <source src="/video/hero-salon.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-br from-white/96 via-white/94 to-white/88 backdrop-blur-lg" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_42%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 pb-20 pt-28 md:pt-32">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="space-y-6 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-[0_25px_80px_rgba(17,24,39,0.08)] backdrop-blur">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.32em] text-[#8B5CF6] shadow-sm">
            {t.hero.badge}
          </span>
          <h1 className="text-4xl font-light leading-tight tracking-wide text-transparent md:text-6xl lg:text-[64px] hero-title">
            {t.hero.title.split(' САЛОНОМ ').length > 1 ? (
              <>
                {t.hero.title.split(' САЛОНОМ ')[0]} <br />
                САЛОНОМ <br />
                {t.hero.title.split(' САЛОНОМ ')[1]}
              </>
            ) : (
              t.hero.title
            )}
          </h1>
          <p className="max-w-2xl text-base text-[#4b5563] md:text-lg">{t.hero.subtitle}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button className="h-14 rounded-full bg-[#8B5CF6] px-8 text-base font-semibold text-white shadow-[0_20px_60px_rgba(139,92,246,0.35)] transition hover:-translate-y-0.5 hover:bg-[#7c3aed]">
              <a href="#pricing" className="flex items-center justify-center gap-2">
                {t.hero.ctaPrimary}
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
            <Button variant="outline" className="h-14 rounded-full border border-white/60 bg-white/80 px-8 text-base font-semibold text-[#111827] shadow-sm transition hover:bg-white">
              <a href="#resources" className="flex items-center justify-center gap-2">
                <Play className="h-5 w-5" />
                {t.hero.ctaSecondary}
              </a>
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-[#1f2937]">
            {t.hero.badges.map((badge) => (
              <span key={badge} className="rounded-full bg-white/80 px-4 py-2">
                {badge}
              </span>
            ))}
          </div>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-3xl border border-white/60 bg-white/85 px-6 py-5 shadow-[0_20px_60px_rgba(17,24,39,0.08)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.28em] text-[#8B5CF6]">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#111827]">{item.value}</p>
              <p className="text-sm text-[#6B7280]">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductSpectrum({ t, nowFeatures, roadmap }: { t: Copy; nowFeatures: typeof nowFeaturesEn; roadmap: typeof roadmapEn }) {
  return (
    <section id="product" className="bg-[#F9FAFB] py-20 text-[#111827]">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8B5CF6]">Now</p>
          <h2 className="text-3xl font-semibold tracking-tight">{t.product.nowTitle}</h2>
          <p className="text-sm text-[#6B7280]">{t.product.nowIntro}</p>
          <div className="space-y-4">
            {nowFeatures.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-[#E5E7EB] bg-white/90 px-5 py-4 shadow-sm">
                <p className="text-base font-semibold text-[#111827]">{feature.title}</p>
                <p className="text-sm text-[#6B7280]">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4" id="solutions">
          <p className="text-xs uppercase tracking-[0.32em] text-[#EC4899]">Next</p>
          <h2 className="text-3xl font-semibold tracking-tight">{t.product.nextTitle}</h2>
          <p className="text-sm text-[#6B7280]">{t.product.nextIntro}</p>
          <div className="space-y-4">
            {roadmap.map((item) => (
              <div key={item.quarter} className="rounded-3xl border border-[#F3E8FF] bg-gradient-to-r from-white via-white to-[#F5F3FF] px-5 py-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.26em] text-[#8B5CF6]">{item.quarter}</div>
                <p className="text-lg font-semibold text-[#111827]">{item.focus}</p>
                <p className="text-sm text-[#6B7280]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function LivingDashboard({ t }: { t: Copy }) {
  return (
    <section id="resources" className="bg-white py-20 text-[#111827]">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8B5CF6]">Living Dashboard</p>
          <h2 className="text-4xl font-light leading-tight tracking-wide">{t.dashboard.title}</h2>
          <p className="text-sm text-[#6B7280]">{t.dashboard.intro}</p>
          <div className="space-y-3">
            {t.dashboard.bullets.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="flex h-2 w-2 rounded-full bg-[#10B981]" />
                <span className="text-sm text-[#374151]">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-gradient-to-br from-[#F9FAFB] to-white p-8 shadow-[0_40px_120px_rgba(17,24,39,0.12)]"
        >
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Preview</span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
              Live
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {t.dashboard.cards.map((card) => (
              <div key={card} className="rounded-2xl bg-white/90 px-5 py-4 text-sm font-medium text-[#111827] shadow-sm">
                {card}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function ModulesGrid({ modules, t }: { modules: typeof modulesGridEn; t: Copy }) {
  return (
    <section id="modules" className="bg-[#F9FAFB] py-20 text-[#111827]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8B5CF6]">Architecture</p>
          <h2 className="text-4xl font-light leading-tight tracking-wide">{t.modules.title}</h2>
          <p className="text-sm text-[#6B7280]">{t.modules.intro}</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="flex h-full flex-col justify-between rounded-3xl border border-[#E5E7EB] bg-white px-5 py-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6]">
                    <Check className="h-4 w-4" />
                  </span>
                  <p className="text-lg font-semibold text-[#111827]">{item.title}</p>
                </div>
                <p className="mt-2 text-sm text-[#6B7280]">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function IntegrationsSection({ t }: { t: Copy }) {
  return (
    <section id="integrations" className="bg-white py-20 text-[#111827]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.32em] text-[#8B5CF6]">Integrations</p>
            <h2 className="text-4xl font-light leading-tight tracking-wide">{t.integrations.title}</h2>
            <p className="text-sm text-[#6B7280]">{t.integrations.intro}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#8B5CF6]/10 px-4 py-2 text-xs font-semibold text-[#8B5CF6]">
            <Sparkles className="h-4 w-4" />
            Beta-safe defaults
          </span>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {t.integrations.logos.map((logo) => (
            <motion.div
              key={logo}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex h-24 items-center justify-center rounded-3xl border border-[#E5E7EB] bg-[#F9FAFB] text-sm font-semibold text-[#374151] shadow-sm"
            >
              {logo}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection({ t }: { t: Copy }) {
  return (
    <section id="pricing" className="bg-[#F9FAFB] py-20 text-[#111827]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8B5CF6]">Pricing</p>
          <h2 className="text-4xl font-light leading-tight tracking-wide">{t.pricing.title}</h2>
          <p className="text-sm text-[#6B7280]">{t.pricing.subtitle}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {t.pricing.plans.map((plan) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="flex h-full flex-col justify-between rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-[0_24px_60px_rgba(17,24,39,0.08)]"
            >
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.28em] text-[#8B5CF6]">Beta</p>
                <h3 className="text-2xl font-semibold text-[#111827]">{plan.name}</h3>
                <p className="text-sm text-[#6B7280]">{plan.note}</p>
                <p className="text-3xl font-bold text-[#111827]">{plan.price}</p>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-[#374151]">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#10B981]" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button className="w-full rounded-full bg-[#8B5CF6] text-white hover:bg-[#7c3aed]">
                  {t.hero.ctaPrimary}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection({ t }: { t: Copy }) {
  return (
    <section className="bg-white py-20 text-[#111827]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8B5CF6]">Stories</p>
          <h2 className="text-4xl font-light leading-tight tracking-wide">{t.testimonials.title}</h2>
          <p className="text-sm text-[#6B7280]">{t.testimonials.subtitle}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {t.testimonials.items.map((item) => (
            <motion.div
              key={item.quote}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="rounded-3xl border border-[#E5E7EB] bg-[#F9FAFB] p-6 shadow-sm"
            >
              <p className="text-base text-[#111827]">“{item.quote}”</p>
              <div className="mt-4 text-sm text-[#6B7280]">
                <p className="font-semibold text-[#111827]">{item.name}</p>
                <p>{item.salon}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StoriesCTA({ t }: { t: Copy }) {
  return (
    <section id="community" className="bg-[#111827] py-20 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">Community</p>
            <h2 className="text-4xl font-light leading-tight tracking-wide">{t.stories.title}</h2>
            <p className="text-sm text-white/70">{t.stories.intro}</p>
            <Button className="rounded-full bg-white px-6 text-sm font-semibold text-[#111827] shadow-lg transition hover:bg-white/90">
              <a href="#hero" className="flex items-center gap-2">
                {t.stories.cta}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5CF6] text-sm font-semibold text-white">Beta</span>
                <div>
                  <p className="text-base font-semibold text-white">Concierge onboarding</p>
                  <p className="text-sm text-white/70">Данные переносим за вас, рядом в чате.</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  7 дней бесплатно, без карты
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  Единая цена на время беты
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  Пожизненная скидка ранним салонам
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer({ t }: { t: Copy }) {
  return (
    <footer className="bg-[#0f172a] py-16 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-bold text-[#111827]">BD</div>
              <p className="text-base font-semibold">Beauty Design Corp</p>
            </div>
            <p className="text-sm text-white/70">{t.footer.about}</p>
          </div>
          <div className="space-y-3 text-sm text-white/70">
            <p className="text-xs uppercase tracking-[0.32em] text-white/50">Навигация</p>
            {t.nav.map((item) => (
              <a key={item.href} href={item.href} className="block hover:text-white">
                {item.label}
              </a>
            ))}
          </div>
          <div className="space-y-3 text-sm text-white/70">
            <p className="text-xs uppercase tracking-[0.32em] text-white/50">Контакты</p>
            <p>{t.footer.contact}</p>
            <p>{t.footer.phone}</p>
          </div>
          <div className="space-y-3 text-sm text-white/70">
            <p className="text-xs uppercase tracking-[0.32em] text-white/50">Бета</p>
            <p>Открытая бета · roadmap публичен</p>
            <p>© {new Date().getFullYear()} Beauty Design Corp</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('ru')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }
  const t = copy[lang]
  const modulesGrid = lang === 'ru' ? modulesGridRu : modulesGridEn
  const nowFeatures = lang === 'ru' ? nowFeaturesRu : nowFeaturesEn
  const roadmap = lang === 'ru' ? roadmapRu : roadmapEn
  const stats = lang === 'ru' ? statsRu : statsEn

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      <Header t={t} lang={lang} setLang={setLang} />
      <main className="flex-1">
        <Hero t={t} stats={stats} />
        <ProductSpectrum t={t} nowFeatures={nowFeatures} roadmap={roadmap} />
        <LivingDashboard t={t} />
        <ModulesGrid modules={modulesGrid} t={t} />
        <IntegrationsSection t={t} />
        <PricingSection t={t} />
        <TestimonialsSection t={t} />
        <StoriesCTA t={t} />
      </main>
      <Footer t={t} />
    </div>
  )
}
