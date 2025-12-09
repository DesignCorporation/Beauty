import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { useTranslation } from 'react-i18next';

interface NotesCardProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function NotesCard({ notes, onNotesChange }: NotesCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-0 border-t border-border/70 bg-transparent shadow-none rounded-none">
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle className="text-base font-medium">{t('appointmentForm.sections.notes')}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t('appointmentForm.placeholders.notes')}
          rows={3}
          className="w-full border-0 border-b border-border/80 bg-transparent px-0 py-2 text-base focus-visible:outline-none focus-visible:ring-0 rounded-none"
        />
      </CardContent>
    </Card>
  );
}
