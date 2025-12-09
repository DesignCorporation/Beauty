const todayFeatures = [
  {
    title: 'Онлайн-резервации',
    text: 'Записи с сайта и мобильного, подтверждения в один клик, напоминания клиентам.'
  },
  {
    title: 'Мультисетевой календарь',
    text: 'Управление графиками мастеров сразу в нескольких салонах. Подсветка конфликтов и отпусков.'
  },
  {
    title: 'Мини-аналитика',
    text: 'Выручка и загрузка по салонам и мастерам. Экспорт в Google Sheets.'
  }
]

const roadmap = [
  { quarter: 'Q1 2026', focus: 'AI-плейбуки маркетинга', detail: 'Автокампании для VIP и гостей, которые давно не приходили.' },
  { quarter: 'Q2 2026', focus: 'Полная финансовая аналитика', detail: 'P&L по салонам, прогнозы и интеграции с бухгалтерией.' },
  { quarter: 'Q3 2026', focus: 'Marketplace аддонов', detail: 'Рассылки, программы лояльности, интеграции с POS и инвентарём.' }
]

export default function ProductNowNextSection() {
  return (
    <section className="bg-[#f7f1ea] py-24 text-[#1d1b21]" id="product">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[#b1904d]">Сегодня в бете</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-wide">То, что уже можно трогать</h2>
          <p className="mt-3 text-sm text-[#5a555e]">
            Мы не обещаем невозможного. Сейчас Beauty Design Corp закрывает базовые процессы. Важно увидеть поток гостей и услышать обратную связь.
          </p>
          <div className="mt-6 space-y-4">
            {todayFeatures.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-[#eadbcc] bg-white/80 px-5 py-4 shadow-sm">
                <p className="text-base font-medium text-[#1f1c24]">{feature.title}</p>
                <p className="text-sm text-[#5a555e]">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[#b1904d]">Дальше</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-wide">Куда растём вместе</h2>
          <p className="mt-3 text-sm text-[#5a555e]">
            Каждое подключение беты добавляет очки в roadmap. Вот что уже в работе и ищет пилотов.
          </p>
          <div className="mt-6 space-y-5">
            {roadmap.map((item) => (
              <div key={item.quarter} className="rounded-3xl border border-[#eadbcc] bg-gradient-to-r from-white to-transparent px-5 py-4">
                <p className="text-xs uppercase tracking-[0.3em] text-[#a7843b]">{item.quarter}</p>
                <p className="text-lg font-semibold text-[#1f1c24]">{item.focus}</p>
                <p className="text-sm text-[#5a555e]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
