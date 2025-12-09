import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  Button,
  PageContainer,
  SubscriptionStatusCard,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SidebarTrigger
} from '@beauty-platform/ui';
import { Download, Filter, CreditCard, TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';

type AppWindow = Window & {
  __APP_CONFIG__?: {
    subscriptionsApiBaseUrl?: string;
  };
};

const resolveSubscriptionsApiBase = () => {
  if (typeof window !== 'undefined') {
    const appWindow = window as AppWindow;
    const fromConfig = appWindow.__APP_CONFIG__?.subscriptionsApiBaseUrl;
    if (fromConfig) return fromConfig as string;
  }
  return '/api/payments/subscriptions';
};

const SUBSCRIPTIONS_API_BASE = resolveSubscriptionsApiBase();

export default function PaymentsPage(): JSX.Element {
  const { t } = useTranslation();

  const demoPayments = [
    {
      id: '1',
      clientName: 'Анна Иванова',
      amount: 28,
      service: 'Маникюр классический',
      date: '2025-08-15',
      time: '10:30',
      method: 'card',
      status: 'completed',
    },
    {
      id: '2',
      clientName: 'Елена Петрова',
      amount: 33,
      service: 'Стрижка женская',
      date: '2025-08-15',
      time: '14:00',
      method: 'cash',
      status: 'completed',
    },
    {
      id: '3',
      clientName: 'Мария Сидорова',
      amount: 89,
      service: 'Окрашивание волос',
      date: '2025-08-14',
      time: '11:00',
      method: 'card',
      status: 'pending',
    },
  ];

  const totalToday = demoPayments
    .filter(p => p.date === '2025-08-15')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-10">
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('payments.subscriptionHeading', 'Подписка и платежи')}</span>
              </div>
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button className="bg-card shadow-none border border-border text-foreground hover:bg-muted">
                <Download className="w-4 h-4 mr-2" />
                {t('payments.exportReport')}
              </Button>
            </div>
          }
        />

        <p className="text-sm text-muted-foreground">
          {t('payments.subscriptionDescription', 'Следите за статусом подписки и историей транзакций вашего салона.')}
        </p>

        {/* Subscription Status Card */}
        <div className="max-w-3xl">
          <SubscriptionStatusCard apiBaseUrl={SUBSCRIPTIONS_API_BASE} />
        </div>

        {/* Быстрая статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                {t('payments.metrics.today')}
              </p>
              <div className="text-2xl font-medium text-foreground">
                €{totalToday.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {t('payments.metrics.thisWeek')}
              </p>
              <div className="text-2xl font-medium text-foreground">€539</div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {t('payments.metrics.thisMonth')}
              </p>
              <div className="text-2xl font-medium text-foreground">€2,081</div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t('payments.metrics.averageBill')}
              </p>
              <div className="text-2xl font-medium text-foreground">€47</div>
            </CardContent>
          </Card>
        </div>

        {/* Фильтры */}
        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Select defaultValue="all">
                  <SelectTrigger className="rounded-none border border-border bg-card shadow-none">
                    <SelectValue placeholder={t('payments.filters.allPeriods')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('payments.filters.allPeriods')}</SelectItem>
                    <SelectItem value="today">{t('payments.filters.today')}</SelectItem>
                    <SelectItem value="week">{t('payments.filters.week')}</SelectItem>
                    <SelectItem value="month">{t('payments.filters.month')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="rounded-none border border-border bg-card shadow-none">
                    <SelectValue placeholder={t('payments.filters.allMethods')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('payments.filters.allMethods')}</SelectItem>
                    <SelectItem value="card">{t('payments.filters.card')}</SelectItem>
                    <SelectItem value="cash">{t('payments.filters.cash')}</SelectItem>
                    <SelectItem value="transfer">{t('payments.filters.transfer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="bg-card shadow-none border-border text-foreground hover:bg-muted">
                <Filter className="w-4 h-4 mr-2" />
                {t('payments.filters.title')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Список платежей */}
        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-3 px-4">{t('payments.table.client')}</th>
                    <th className="py-3 px-4">{t('payments.table.service')}</th>
                    <th className="py-3 px-4">{t('payments.table.amount')}</th>
                    <th className="py-3 px-4">{t('payments.table.method')}</th>
                    <th className="py-3 px-4">{t('payments.table.date')}</th>
                    <th className="py-3 px-4">{t('payments.table.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {demoPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/70 text-sm hover:bg-muted/40">
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{payment.clientName}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{payment.service}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">
                          €{payment.amount}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs border border-border rounded-full bg-card text-foreground">
                          {t(`payments.methods.${payment.method}`)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {payment.date} {payment.time}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full border ${
                          payment.status === 'completed' 
                            ? 'border-success/50 text-success'
                            : 'border-warning/50 text-warning'
                        }`}>
                          {t(`payments.status.${payment.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
