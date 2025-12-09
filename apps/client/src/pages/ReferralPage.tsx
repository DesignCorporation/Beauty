import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageContainer
} from '@beauty-platform/ui'
import {
  Copy,
  Check,
  Gift,
  Info,
  Mail,
  MessageCircle,
  Share2,
  TrendingUp,
  Users,
  UserPlus
} from 'lucide-react'
import ClientLayout from '../components/ClientLayout'
import { useAuth } from '../hooks/useAuth'

const mapStatus = (value: string): 'active' | 'pending' =>
  value === 'active' || value === 'pending' ? value : 'active'

const useMockReferralData = (translate: ReturnType<typeof useTranslation>['0']) => ({
  referralCode: translate('pages.referral.mockData.referralCode'),
  totalReferred: 3,
  activeReferrals: 2,
  pendingReferrals: 1,
  earnedPoints: 300,
  referrals: [
    {
      id: '1',
      name: translate('pages.referral.mockData.friend1.name'),
      email: translate('pages.referral.mockData.friend1.email'),
      status: mapStatus(translate('pages.referral.mockData.friend1.status')),
      joinedAt: '2025-09-15',
      earnedPoints: 100
    },
    {
      id: '2',
      name: translate('pages.referral.mockData.friend2.name'),
      email: translate('pages.referral.mockData.friend2.email'),
      status: mapStatus(translate('pages.referral.mockData.friend2.status')),
      joinedAt: '2025-09-20',
      earnedPoints: 100
    },
    {
      id: '3',
      name: translate('pages.referral.mockData.friend3.name'),
      email: translate('pages.referral.mockData.friend3.email'),
      status: mapStatus(translate('pages.referral.mockData.friend3.status')),
      joinedAt: '2025-10-01',
      earnedPoints: 0
    }
  ]
})

export default function ReferralPage() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const locale = (i18n.language || 'en').split('-')[0]
  const mockData = useMemo(() => useMockReferralData(t), [t])
  const referralCode = useMemo(() => {
    if (!user?.email) return mockData.referralCode
    return `BEAUTY${user.email.substring(0, 4).toUpperCase()}${new Date().getFullYear()}`
  }, [mockData.referralCode, user?.email])
  const referralLink = `https://client.beauty.designcorp.eu/register?ref=${referralCode}`

  const handleCopy = (type: 'code' | 'link', value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleShare = (platform: 'email' | 'whatsapp' | 'telegram') => {
    const message = t('pages.referral.shareMessage', { code: referralCode, link: referralLink })
    const encodedMessage = encodeURIComponent(message)

    const urls = {
      email: `mailto:?subject=${encodeURIComponent(t('pages.referral.shareSubject'))}&body=${encodedMessage}`,
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodedMessage}`
    }

    window.open(urls[platform], '_blank')
  }

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))

  return (
    <ClientLayout>
      <PageContainer variant="standard" maxWidth="full" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-6">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {t('pages.referral.stats.invited')}
                </p>
                <p className="mt-1 text-3xl font-semibold text-primary">
                  {mockData.totalReferred}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary/40" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-6">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {t('pages.referral.stats.active')}
                </p>
                <p className="mt-1 text-3xl font-semibold text-success">
                  {mockData.activeReferrals}
                </p>
              </div>
              <UserPlus className="h-8 w-8 text-success/40" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-6">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {t('pages.referral.stats.pending')}
                </p>
                <p className="mt-1 text-3xl font-semibold text-warning">
                  {mockData.pendingReferrals}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-warning/40" />
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between gap-3 p-6">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {t('pages.referral.stats.earned')}
                </p>
                <p className="mt-1 text-3xl font-semibold text-primary">
                  {mockData.earnedPoints}
                </p>
              </div>
              <Gift className="h-8 w-8 text-primary/40" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Share2 className="h-5 w-5 text-primary" />
                  {t('pages.referral.code.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t('pages.referral.code.forFriends')}
                      </p>
                      <p className="text-2xl font-semibold tracking-wide text-primary">
                        {referralCode}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleCopy('code', referralCode)}
                    >
                      {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {t(copied === 'code' ? 'pages.referral.code.copied' : 'pages.referral.code.copy')}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-muted bg-background p-4">
                  <p className="text-xs text-muted-foreground">
                    {t('pages.referral.code.link')}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded border border-muted bg-muted/40 px-3 py-2 text-xs">
                      {referralLink}
                    </code>
                    <Button variant="ghost" size="icon" onClick={() => handleCopy('link', referralLink)}>
                      {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleShare('email')}
                  >
                    <Mail className="h-4 w-4" />
                    {t('pages.referral.share.email')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleShare('whatsapp')}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('pages.referral.share.whatsapp')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleShare('telegram')}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('pages.referral.share.telegram')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  {t('pages.referral.friends.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mockData.referrals.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Users className="h-12 w-12 text-primary/30" />
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">
                        {t('pages.referral.friends.empty.title')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('pages.referral.friends.empty.description')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mockData.referrals.map(friend => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between rounded-lg border border-muted bg-muted/40 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/80 text-sm font-semibold text-primary-foreground">
                            {friend.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{friend.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('pages.referral.friends.joined', { date: formatDate(friend.joinedAt) })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            className={
                              friend.status === 'active'
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-warning/10 text-warning border-warning/20'
                            }
                          >
                            {t(`pages.referral.friends.status.${friend.status === 'active' ? 'active' : 'pending'}`)}
                          </Badge>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t('pages.referral.friends.points', { count: friend.earnedPoints })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5 text-primary" />
                  {t('pages.referral.howItWorks.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {['step1', 'step2', 'step3'].map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {t(`pages.referral.howItWorks.${step}.title`)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t(`pages.referral.howItWorks.${step}.description`)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('pages.referral.rewards.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {['firstVisit', 'registration', 'activityBonus'].map(reward => (
                  <div key={reward} className="rounded-lg border border-primary/30 bg-background p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">
                        {t(`pages.referral.rewards.${reward}`)}
                      </p>
                      <Badge className="bg-success/10 text-success border-success/20">
                        {t('pages.referral.friends.points', { count: reward === 'registration' ? 50 : reward === 'firstVisit' ? 100 : 200 })}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(`pages.referral.rewards.descriptions.${reward}`)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('pages.referral.rules.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {['rule1', 'rule2', 'rule3', 'rule4'].map(rule => (
                  <p key={rule}>• {t(`pages.referral.rules.${rule}`)}</p>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>

        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex gap-3 py-6">
            <Info className="h-5 w-5 text-warning" />
            <div className="space-y-1 text-sm text-warning">
              <p className="font-semibold text-warning-foreground">
                {t('pages.referral.devBanner.title')}
              </p>
              <p className="text-warning-foreground/90">
                {t('pages.referral.devBanner.description')}
              </p>
              <p className="text-warning-foreground/80">
                {t('pages.referral.devBanner.features')}
              </p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </ClientLayout>
  )
}
