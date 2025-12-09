const milestones = [
  {
    title: 'Сервис как у люксовых сетей',
    text: 'Консьерж-команда переносит данные, обучает персонал, настраивает мультисалоны. Любой баг фиксится через прямой чат.'
  },
  {
    title: 'Дизайн-система будущего',
    text: 'Работаем над UI, где дисплейная типографика, 3D-фоны и живые диаграммы. Делимся макетами в Figma со всеми бета-клиентами.'
  },
  {
    title: 'Клуб беты',
    text: 'Private Slack с владельцами, идеи попадают в roadmap, а ранние клиенты получают пожизненную скидку.'
  }
]

export default function RoadmapVisionSection() {
  return (
    <section className="bg-[#0e0e12] py-24 text-white" id="vision">
      <div className="mx-auto max-w-7xl px-6">
        <div className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Vision Lab</p>
          <h2 className="text-4xl font-light tracking-[0.08em]">Мы строим платформу, которую хочется открыть утром</h2>
          <p className="text-sm text-white/60">
            Делимся тем, над чем работаем ночью. Каждый скрин — из живой Figma и ближайших апдейтов.
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {milestones.map((milestone) => (
            <div key={milestone.title} className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur">
              <p className="text-lg font-semibold text-white">{milestone.title}</p>
              <p className="mt-2 text-sm text-white/70">{milestone.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
