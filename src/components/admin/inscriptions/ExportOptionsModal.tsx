import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Modal } from '../../common/Modal';

export type ExportFormat = 'excel' | 'pdf';
export type ExportType = 'simple' | 'full';

interface ExportOptionsModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, type: ExportType) => void | Promise<void>;
  /** Records that will be exported (the whole filtered set, not just the page). */
  count: number;
  exporting?: boolean;
}

export function ExportOptionsModal({
  open,
  onClose,
  onExport,
  count,
  exporting = false
}: ExportOptionsModalProps) {
  const { t } = useTranslation();
  const [exportType, setExportType] = useState<ExportType>('full');

  const options: { value: ExportType; title: string; description: string }[] = [
    {
      value: 'full',
      title: t('admin.inscriptions.export_full_title', 'Totes les dades (complet)'),
      description: t(
        'admin.inscriptions.export_full_desc',
        'Inclou contacte, salut, autoritzacions, etc. Ideal per a fitxes.'
      )
    },
    {
      value: 'simple',
      title: t('admin.inscriptions.export_simple_title', 'Llistat simple'),
      description: t(
        'admin.inscriptions.export_simple_desc',
        "Nom, curs i activitat. Ideal per a llistes d'assistència."
      )
    }
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={t('admin.inscriptions.export_title', "Opcions d'exportació")}
    >
      <div className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="text-[12px] font-medium text-neutral-700 mb-1">
            {t('admin.inscriptions.export_content', 'Contingut')}
          </legend>
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                exportType === option.value
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <input
                type="radio"
                name="exportType"
                value={option.value}
                checked={exportType === option.value}
                onChange={() => setExportType(option.value)}
                className="mt-0.5 w-4 h-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900/20"
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-neutral-900">{option.title}</span>
                <span className="block text-[12px] text-neutral-500">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-600">
          {t('admin.inscriptions.export_note', "S'exportaran els {{count}} registres filtrats.", { count })}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={exporting}
            onClick={() => onExport('excel', exportType)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors disabled:opacity-60"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Excel
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => onExport('pdf', exportType)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 text-[13px] font-medium transition-colors disabled:opacity-60"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ExportOptionsModal;
