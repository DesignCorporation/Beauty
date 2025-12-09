import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageContainer, SidebarTrigger } from '@beauty-platform/ui';
import {
  HelpCircle,
  Book,
  MessageCircle,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';

interface FAQItem {
  question: string;
  answer: string;
  categoryKey: string;
  categoryLabel: string;
  key: string;
}

export default function HelpPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categoryMap = useMemo(
    () => t('help.categories', { returnObjects: true }) as Record<string, string>,
    [t]
  );

  const categories = useMemo(() => {
    const keys = Object.keys(categoryMap);
    return ['all', ...keys.filter(key => key !== 'all')];
  }, [categoryMap]);

  const faqData: FAQItem[] = useMemo(() => {
    const faqEntries = t('help.faq', { returnObjects: true }) as Record<string, { question: string; answer: string }>;
    return Object.entries(faqEntries).map(([key, value]) => {
      const categoryKey = key.split('_')[0] ?? key;
      const categoryLabel = categoryMap[categoryKey] ?? categoryKey;
      return {
        key,
        question: value.question,
        answer: value.answer,
        categoryKey,
        categoryLabel
      } satisfies FAQItem;
    });
  }, [categoryMap, t]);

  const filteredFAQ = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return faqData.filter(item => {
      const matchesSearch =
        query.length === 0 ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query);

      const matchesCategory = selectedCategory === 'all' || item.categoryKey === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [faqData, searchQuery, selectedCategory]);

  const resultsLabel = useMemo(() => {
    const count = filteredFAQ.length;
    let key = 'found_other';

    if (i18n.language.startsWith('ru') || i18n.language.startsWith('uk')) {
      if (count % 10 === 1 && count % 100 !== 11) key = 'found_one';
      else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) key = 'found_few';
      else key = 'found_many';
    } else if (i18n.language.startsWith('pl')) {
      if (count === 1) key = 'found_one';
      else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) key = 'found_few';
      else key = 'found_many';
    } else {
      key = count === 1 ? 'found_one' : 'found_other';
    }

    return t(`help.misc.${key}`, { count });
  }, [filteredFAQ.length, i18n.language, t]);

  const toggleItem = (key: string) => {
    setExpandedItems(prev => {
      const updated = new Set(prev);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      return updated;
    });
  };

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-8">
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <HelpCircle className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t('help.sections.faq')}</span>
              </div>
            </div>
          }
        />

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardContent className="p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder={t('help.actions.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-0 border-b border-border bg-transparent text-sm focus:border-primary/40 focus:outline-none focus:ring-0"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-6">
            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Book className="h-5 w-5" />
                  {t('help.sections.categories')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map((categoryKey) => (
                  <button
                    key={categoryKey}
                    onClick={() => void setSelectedCategory(categoryKey)}
                    className={`w-full text-left px-4 py-2 border border-border bg-card text-sm transition ${
                      selectedCategory === categoryKey
                        ? 'border-primary text-primary bg-primary/5'
                        : 'hover:border-primary/40 hover:text-primary'
                    }`}
                  >
                    {categoryMap[categoryKey] || categoryKey}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  {t('help.contact.title')}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">{t('help.sections.contact_description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-info mt-1" />
                  <div>
                    <p className="font-medium text-sm">{t('help.contact.emailLabel')}</p>
                    <a href="mailto:info@designcorp.eu" className="text-sm text-info hover:underline">info@designcorp.eu</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-success mt-1" />
                  <div>
                    <p className="font-medium text-sm">{t('help.contact.phoneLabel')}</p>
                    <a href="tel:+48515582273" className="text-sm text-info hover:underline">+48 515 582 273</a>
                    <p className="text-xs text-muted-foreground mt-1">{t('help.contact.hoursLabel')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MessageCircle className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium text-sm">{t('help.contact.chatLabel')}</p>
                    <p className="text-sm text-muted-foreground">{t('help.contact.chatDescription')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  {t('help.resources.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a href="#" className="flex items-center justify-between px-3 py-2 border border-border bg-card text-sm transition hover:border-primary/40 hover:text-primary">
                  <span className="font-medium">{t('help.resources.videoTutorials')}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
                <a href="#" className="flex items-center justify-between px-3 py-2 border border-border bg-card text-sm transition hover:border-primary/40 hover:text-primary">
                  <span className="font-medium">{t('help.resources.documentation')}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
                <a href="#" className="flex items-center justify-between px-3 py-2 border border-border bg-card text-sm transition hover:border-primary/40 hover:text-primary">
                  <span className="font-medium">{t('help.resources.apiDocs')}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  {t('help.sections.faq')}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {resultsLabel}
                  {selectedCategory !== 'all' && ` ${t('help.misc.inCategory', { category: categoryMap[selectedCategory] || selectedCategory })}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredFAQ.length === 0 ? (
                  <div className="text-center py-12">
                    <HelpCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-foreground">
                      {searchQuery
                        ? t('help.emptySearch.noResultsTitle', { query: searchQuery })
                        : t('help.emptySearch.noResultsTitle', { query: categoryMap[selectedCategory] || '' })}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{t('help.emptySearch.noResultsDescription')}</p>
                  </div>
                ) : (
                  filteredFAQ.map((item) => (
                    <div key={item.key} className="border border-border bg-card">
                      <button onClick={() => void toggleItem(item.key)} className="w-full flex items-center justify-between px-4 py-3 text-left transition hover:bg-muted/40">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="px-2 py-1 border border-border bg-muted text-xs font-medium">{item.categoryLabel}</span>
                          <span className="text-sm font-medium text-foreground">{item.question}</span>
                        </div>
                        {expandedItems.has(item.key) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                      {expandedItems.has(item.key) && (
                        <div className="px-4 py-3 border-t border-border bg-muted/30">
                          <p className="text-sm text-foreground/80 leading-relaxed">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
