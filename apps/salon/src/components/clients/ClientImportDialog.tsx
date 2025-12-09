import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
  Card,
  CardContent,
  Switch
} from '@beauty-platform/ui';
import { UploadCloud, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CRMApiService, type ClientImportPreviewResponse, type ClientImportPreviewRow, type ClientImportCommitResponse } from '../../services/crmApiNew';
import { toast } from 'sonner';

interface ClientsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

const statusIconMap = {
  READY: CheckCircle2,
  WARNING: AlertCircle,
  ERROR: XCircle
} as const;

export function ClientsImportDialog({ open, onOpenChange, onImportComplete }: ClientsImportDialogProps) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setUploading] = useState(false);
  const [isImporting, setImporting] = useState(false);
  const [preview, setPreview] = useState<ClientImportPreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<ClientImportCommitResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [includeWarnings, setIncludeWarnings] = useState(true);

  const resetState = () => {
    setSelectedFile(null);
    setPreview(null);
    setErrorMessage(null);
    setUploading(false);
    setImporting(false);
    setImportResult(null);
  };

  const handleDialogChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      resetState();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setErrorMessage(null);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage(t('clients.import.fileRequired', 'Выберите файл для импорта'));
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    try {
      const result = await CRMApiService.previewClientImport(selectedFile);
      setPreview(result);
      setImportResult(null);
      toast.success(t('clients.import.previewReady', 'Проверка завершена'));
    } catch (error) {
      console.error('Failed to generate client import preview:', error);
      setErrorMessage(t('clients.import.previewFailed', 'Не удалось обработать файл. Проверьте формат и попробуйте снова.'));
    } finally {
      setUploading(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (!preview) return [];
    return [
      {
        label: t('clients.import.summary.total', 'Всего строк'),
        value: preview.summary.total
      },
      {
        label: t('clients.import.summary.ready', 'Готовы к импорту'),
        value: preview.summary.ready
      },
      {
        label: t('clients.import.summary.warnings', 'Требуют внимания'),
        value: preview.summary.warnings
      },
      {
        label: t('clients.import.summary.errors', 'Ошибки'),
        value: preview.summary.errors
      },
      {
        label: t('clients.import.summary.duplicates', 'Дубликаты в базе'),
        value: preview.summary.duplicateInTenant
      }
    ];
  }, [preview, t]);

  const renderIssueBadges = (row: ClientImportPreviewRow) => {
    if (!row.issues.length) {
      return <span className="text-sm text-muted-foreground">{t('clients.import.noIssues', 'Без замечаний')}</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {row.issues.map((issue) => (
          <Badge
            key={`${row.id}-${issue.code}`}
            variant={issue.level === 'error' ? 'destructive' : 'secondary'}
          >
            {issue.message}
          </Badge>
        ))}
      </div>
    );
  };

  const handleCommit = async () => {
    if (!preview) {
      return;
    }
    setImporting(true);
    setErrorMessage(null);

    try {
      const result = await CRMApiService.commitClientImport({
        previewId: preview.previewId,
        includeWarnings
      });
      setImportResult(result);
      toast.success(t('clients.import.commitSuccess', 'Импорт завершён'));
      onImportComplete?.();
    } catch (error) {
      console.error('Failed to commit client import:', error);
      setErrorMessage(t('clients.import.commitFailed', 'Не удалось завершить импорт.'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('clients.import.title', 'Импорт клиентов')}</DialogTitle>
          <DialogDescription>
            {t('clients.import.description', 'Загрузите CSV или XLSX файл. Мы проверим данные и покажем возможные ошибки перед импортом.')}
          </DialogDescription>
        </DialogHeader>

        {!preview && (
          <div className="space-y-4">
            <div className="border border-dashed border-border rounded-xl p-6 text-center">
              <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium text-foreground mb-2">
                {t('clients.import.uploadTitle', 'Выберите CSV или XLSX файл')}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {t('clients.import.uploadHint', 'Максимальный размер файла — 5 МБ.')}
              </p>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('clients.import.selectedFile', 'Выбран файл')}: <span className="font-medium">{selectedFile.name}</span>
                </p>
              )}
              {errorMessage && (
                <p className="text-sm text-destructive mt-2">{errorMessage}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetState} disabled={isUploading}>
                {t('clients.import.resetButton', 'Сбросить')}
              </Button>
              <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('clients.import.uploading', 'Загрузка...')}
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 mr-2" />
                    {t('clients.import.startCheck', 'Проверить файл')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>{t('clients.import.previewSubtitle', 'Предварительная проверка выполнена')}</AlertTitle>
              <AlertDescription>
                {t('clients.import.previewDescription', 'Изучите результаты. Импорт доступен после исправления критических ошибок.')}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3 border rounded-lg p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-foreground">{t('clients.import.readyRowsTitle', 'Строки для импорта')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('clients.import.readyRowsDescription', 'По умолчанию импортируются только строки без ошибок. Можно включить строки с предупреждениями.')}
                </p>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch checked={includeWarnings} onCheckedChange={(value) => setIncludeWarnings(Boolean(value))} />
                  {t('clients.import.includeWarnings', 'Импортировать строки с предупреждениями')}
                </label>
                <Button onClick={handleCommit} disabled={isImporting || (!preview.summary.ready && (!includeWarnings || preview.summary.warnings === 0))}>
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('clients.import.commitInProgress', 'Импорт...')}
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 mr-2" />
                      {t('clients.import.commitButton', 'Импортировать готовые строки')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {summaryCards.map((card) => (
                <Card key={card.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="text-xl font-semibold text-foreground">{card.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="border rounded-lg">
              <div className="px-4 py-2 border-b flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{t('clients.import.previewTableTitle', 'Первые строки файла')}</p>
                  <p className="text-sm text-muted-foreground">
                    {preview.hasMoreRows
                      ? t('clients.import.previewLimited', 'Показаны {{count}} из {{total}} строк', { count: preview.sampleSize, total: preview.totalRows })
                      : t('clients.import.previewFull', 'Показаны все {{count}} строк', { count: preview.totalRows })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={resetState}>
                  {t('clients.import.chooseAnother', 'Выбрать другой файл')}
                </Button>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 w-16">#</th>
                      <th className="text-left px-4 py-2">{t('clients.import.table.name', 'Имя')}</th>
                      <th className="text-left px-4 py-2">{t('clients.import.table.email', 'Email')}</th>
                      <th className="text-left px-4 py-2">{t('clients.import.table.phone', 'Телефон')}</th>
                      <th className="text-left px-4 py-2">{t('clients.import.table.status', 'Статус')}</th>
                      <th className="text-left px-4 py-2">{t('clients.import.table.issues', 'Замечания')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => {
                      const StatusIcon = statusIconMap[row.status];
                      const badgeVariant =
                        row.status === 'READY'
                          ? 'secondary'
                          : row.status === 'WARNING'
                          ? 'outline'
                          : 'destructive';
                      return (
                        <tr key={row.id} className="border-b last:border-b-0">
                          <td className="px-4 py-2 text-muted-foreground">{row.rowNumber}</td>
                          <td className="px-4 py-2">
                            <div className="font-medium text-foreground">{row.fullName}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.firstName || row.lastName ? `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() : ''}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{row.email || '—'}</td>
                          <td className="px-4 py-2 text-muted-foreground">{row.phone || '—'}</td>
                          <td className="px-4 py-2">
                            <Badge variant={badgeVariant}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {row.status === 'READY'
                                ? t('clients.import.status.ready', 'Готово')
                                : row.status === 'WARNING'
                                ? t('clients.import.status.warning', 'Проверить')
                                : t('clients.import.status.error', 'Ошибка')}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">{renderIssueBadges(row)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {importResult && (
              <Alert>
                <AlertTitle>{t('clients.import.commitSummaryTitle', 'Импорт завершён')}</AlertTitle>
                <AlertDescription>
                  {t('clients.import.commitSummary', {
                    imported: importResult.summary.imported,
                    skipped: importResult.summary.skipped
                  })}
                </AlertDescription>
              </Alert>
            )}

            {importResult && importResult.results.length > 0 && (
              <div className="border rounded-lg">
                <div className="px-4 py-2 border-b">
                  <p className="font-medium text-foreground">{t('clients.import.commitResultTitle', 'Результаты по строкам')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('clients.import.commitResultHint', {
                      count: Math.min(50, importResult.results.length)
                    })}
                  </p>
                </div>
                <div className="max-h-[220px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-2 w-24">ID</th>
                        <th className="text-left px-4 py-2">{t('clients.import.table.status', 'Статус')}</th>
                        <th className="text-left px-4 py-2">{t('clients.import.commitReasonTitle', 'Причина')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.results.slice(0, 50).map((result) => {
                        const badgeVariant =
                          result.status === 'IMPORTED'
                            ? 'secondary'
                            : 'destructive';
                        return (
                          <tr key={result.rowId} className="border-b last:border-b-0">
                            <td className="px-4 py-2 text-muted-foreground">{result.rowId.slice(0, 8)}</td>
                            <td className="px-4 py-2">
                              <Badge variant={badgeVariant}>
                                {result.status === 'IMPORTED'
                                  ? t('clients.import.status.ready', 'Готово')
                                  : t('clients.import.status.error', 'Ошибка')}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {result.reason
                                ? t(`clients.import.commitReasons.${result.reason}`, result.reason)
                                : t('clients.import.commitReasonImported', 'Создан новый клиент')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleDialogChange(false)}>
            {t('common.close', 'Закрыть')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
