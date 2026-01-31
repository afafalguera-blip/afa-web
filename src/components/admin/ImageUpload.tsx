import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { StorageService } from '../../services/StorageService';

interface ImageUploadProps {
  value: string | null;
  onUpload: (url: string | null) => void;
  bucket?: string;
  folder?: string;
  className?: string;
}

export function ImageUpload({ 
  value, 
  onUpload, 
  bucket = 'activity-images', 
  folder = 'news',
  className = '' 
}: ImageUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert(t('admin.editor.error_invalid_file'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert(t('admin.editor.image_too_large'));
      return;
    }

    setUploading(true);
    try {
      const url = await StorageService.uploadImage(bucket, file, folder);
      onUpload(url);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(t('common.error_save'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    
    // We don't necessarily delete the image from storage to avoid issues if it's used elsewhere,
    // but we clear the reference in the form.
    onUpload(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {value ? (
        <div className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img 
            src={value} 
            alt="Preview" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
              title={t('admin.editor.change_image')}
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50 transition-colors"
              title={t('common.delete')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-video border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-slate-500 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-sm font-medium">{t('common.saving')}</span>
            </>
          ) : (
            <>
              <div className="p-3 bg-slate-100 rounded-full">
                <ImageIcon className="w-6 h-6 text-slate-400" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-blue-600">
                  {t('admin.editor.upload_image')}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  {t('admin.editor.image_hint')}
                </p>
              </div>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
