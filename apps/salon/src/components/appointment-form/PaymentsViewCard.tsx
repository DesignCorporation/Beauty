import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@beauty-platform/ui';

interface Payment {
  id: string;
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
  amount: number;
  currency: string;
  method: string;
  paidAt?: Date;
}

interface PaymentsViewCardProps {
  payments: Payment[];
  outstandingBalance: number;
  currency: string;
  formatCurrencyValue: (price: number, currency: string) => string;
  formatFullDate: (date: Date) => string;
}

export function PaymentsViewCard({
  payments,
  outstandingBalance,
  currency,
  formatCurrencyValue,
  formatFullDate
}: PaymentsViewCardProps) {
  const { t } = useTranslation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-success/10 text-success border-success/20';
      case 'PENDING':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'FAILED':
        return 'bg-error/10 text-error border-error/20';
      case 'REFUNDED':
        return 'bg-info/10 text-info border-info/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="border-0 border-t border-border/70 bg-transparent shadow-none rounded-none">
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <CreditCard className="w-5 h-5" />
          {t('appointmentForm.detailsPage.paymentsCard', 'Payments')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4 space-y-4">
        {payments.length ? (
          <>
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between border-0 border-b border-border/60 px-0 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{payment.method}</p>
                    <Badge className={`text-xs ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </Badge>
                  </div>
                  {payment.paidAt && (
                    <p className="text-xs text-muted-foreground">
                      {formatFullDate(payment.paidAt)}
                    </p>
                  )}
                </div>
                <div className="text-right font-semibold">
                  {formatCurrencyValue(payment.amount, payment.currency)}
                </div>
              </div>
            ))}
            {outstandingBalance > 0 && (
              <div className="flex items-center justify-between border border-warning/30 bg-warning/5 rounded-none px-4 py-3">
                <span className="font-medium text-warning">
                  {t('appointmentForm.detailsPage.outstandingBalance', 'Outstanding Balance')}
                </span>
                <span className="font-semibold text-warning">
                  {formatCurrencyValue(outstandingBalance, currency)}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('common.noResults')}</p>
        )}
      </CardContent>
    </Card>
  );
}
