
import { useState } from 'react';
import { X, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'excel' | 'pdf', type: 'simple' | 'full') => void;
  count: number;
}

export function ExportOptionsModal({ isOpen, onClose, onExport, count }: ExportOptionsModalProps) {
  const [exportType, setExportType] = useState<'full' | 'simple'>('full');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Opcions d'Exportació</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700">Contingut:</label>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="radio" 
                  name="exportType" 
                  checked={exportType === 'full'} 
                  onChange={() => setExportType('full')}
                  className="mt-1"
                />
                <div>
                  <span className="block font-medium text-slate-900">Totes les dades (Complet)</span>
                  <span className="text-xs text-slate-500">Inclou dades de contacte, salut, autoritzacions, etc. ideal per a fitxes.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input 
                  type="radio" 
                  name="exportType" 
                  checked={exportType === 'simple'} 
                  onChange={() => setExportType('simple')}
                  className="mt-1"
                />
                <div>
                  <span className="block font-medium text-slate-900">Llistat Simple</span>
                  <span className="text-xs text-slate-500">Nom, curs i activitat. Ideal per a llistes d'assistència.</span>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              Nota: S'exportaran els <strong>{count}</strong> registres actualment filtrats a la taula.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onExport('excel', exportType)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-5 h-5" /> Excel
            </button>
            <button
              onClick={() => onExport('pdf', exportType)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              <FileText className="w-5 h-5" /> PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
