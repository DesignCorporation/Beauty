import { CatalystCard } from '../../../components/ui/CatalystCard'

export function TechStatusWidget(): JSX.Element {
  const rows = [
    { name: 'Платежи (Stripe/PayPal)', ok: true },
    { name: 'Email/SMS уведомления', ok: true },
    { name: 'WhatsApp интеграция', ok: false },
  ]

  return (
    <CatalystCard
      title="Статус сервисов"
      description="Интеграции и внешние системы"
      noPadding
    >
      <div className="divide-y divide-zinc-950/5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <span className="text-sm font-medium text-zinc-700">{r.name}</span>
            {r.ok ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Работает
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                Настройка
              </span>
            )}
          </div>
        ))}
      </div>
    </CatalystCard>
  )
}
