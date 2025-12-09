import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Note {
  id: string;
  content: string;
  createdBy?: {
    firstName?: string;
    lastName?: string;
  };
  createdAt: Date;
}

interface NotesViewCardProps {
  notes: Note[];
  formatFullDate: (date: Date) => string;
}

export function NotesViewCard({ notes, formatFullDate }: NotesViewCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="w-5 h-5" />
          {t('appointmentForm.detailsPage.notesCard')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notes.length ? (
          notes.map((note) => (
            <div key={note.id} className="rounded-lg border p-3">
              <p className="text-sm text-foreground">{note.content}</p>
              <div className="mt-2 text-xs text-muted-foreground">
                {note.createdBy?.firstName} {note.createdBy?.lastName} · {formatFullDate(note.createdAt)}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{t('appointmentForm.detailsPage.notesEmpty')}</p>
        )}
      </CardContent>
    </Card>
  );
}
