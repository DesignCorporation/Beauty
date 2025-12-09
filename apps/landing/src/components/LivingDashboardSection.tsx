const highlights = [
  'Live scroll preview',
  'Переключение салонов в один клик',
  'AI-подсказки в Telegram',
  'Публичный roadmap',
  'Консьерж-внедрение'
]

export default function LivingDashboardSection() {
  return (
    <section className="bg-[#fdf9f4] py-24 text-[#1f1d21]" id="dashboard">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[#a7843b]">Living Dashboard</p>
            <h2 className="mt-4 text-4xl font-light tracking-[0.08em]">Живой экран, который меняется вместе с вашим салоном</h2>
            <p className="mt-4 text-sm text-[#5a555e]">
              Мы делаем интерфейс, который не похож на стандартные CRM: крупная типографика, 3D тканевые текстуры, живые диаграммы и интеграция с устройствами.
            </p>
            <div className="mt-8 space-y-3">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#a7843b]" />
                  <span className="text-sm text-[#3d3842]">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[32px] border border-[#eadbcc] bg-white/80 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.08)]">
            <div className="aspect-video rounded-3xl bg-gradient-to-br from-[#f7e3c9] to-[#f5d4b5] p-6 text-[#231f28]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#966b2b]">Preview</p>
              <div className="mt-4 grid gap-4">
                <div className="rounded-2xl bg-white/80 p-4">Календарь салонов · Drag & Drop</div>
                <div className="rounded-2xl bg-white/80 p-4">AI Insight · «Перенесите Дарью к Марии»</div>
                <div className="rounded-2xl bg-white/80 p-4">Выручка за неделю · +18%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
