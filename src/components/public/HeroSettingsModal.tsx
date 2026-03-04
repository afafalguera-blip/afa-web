import { useState } from 'react';
import { X, Upload, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ConfigService, type HeroConfig } from '../../services/ConfigService';

interface HeroSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: HeroConfig | null;
    onUpdate: (newConfig: HeroConfig) => void;
}

export function HeroSettingsModal({ isOpen, onClose, currentConfig, onUpdate }: HeroSettingsModalProps) {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(currentConfig?.image_url || null);
    const [title, setTitle] = useState(currentConfig?.title || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            let imageUrl = currentConfig?.image_url || '';

            if (imageFile) {
                imageUrl = await ConfigService.uploadHeroImage(imageFile);
            }

            const newConfig: HeroConfig = {
                image_url: imageUrl,
                title: title
            };

            await ConfigService.updateHeroConfig(newConfig);
            onUpdate(newConfig);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 2000);
        } catch (err) {
            const error = err as Error;
            console.error(error);
            setError(error.message || "Error al guardar la configuració");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Configuració del Hero
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Preview i Canvi de Foto</label>
                        <div className="relative group rounded-2xl overflow-hidden aspect-[21/9] bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700">
                            {imagePreview ? (
                                <img src={imagePreview} className="w-full h-full object-cover" alt="Hero preview" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <Upload size={32} className="mb-2" />
                                    <span className="text-xs">Sense imatge</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label className="bg-white text-slate-900 px-4 py-2 rounded-xl font-bold text-sm cursor-pointer shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                                    <Upload size={16} />
                                    Canviar Imatge
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 italic text-center">Recomanat: 1920x600px o similar format panoràmic.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 text-left">Títol de Benvinguda</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all font-medium"
                            placeholder="Ex: Benvinguts a l'AFA Falguera"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-sm animate-shake">
                            <AlertCircle size={16} />
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-1">
                            <CheckCircle2 size={16} />
                            <p>Configuració guardada!</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel·lar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-[2] bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Guardar Canvis
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
