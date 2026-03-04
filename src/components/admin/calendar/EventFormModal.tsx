import { useTranslation } from 'react-i18next';
import { Trash2, X } from 'lucide-react';
import { EVENT_TYPES } from '../../../services/admin/AdminCalendarService';
import type { EventFormData, CalendarEvent } from '../../../services/admin/AdminCalendarService';

interface EventFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onDelete?: (id: string) => void;
    formData: EventFormData;
    setFormData: React.Dispatch<React.SetStateAction<EventFormData>>;
    editingEvent: CalendarEvent | null;
    saving: boolean;
}

export function EventFormModal({
    isOpen,
    onClose,
    onSave,
    onDelete,
    formData,
    setFormData,
    editingEvent,
    saving
}: EventFormModalProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {editingEvent ? t('admin.calendar.edit_event') : t('admin.calendar.new_event')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                            {t('admin.calendar.field_title')} *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-primary dark:focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium shadow-inner"
                            placeholder="Ej. Fiesta de Fin de Curso"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                                {t('admin.calendar.field_date')} *
                            </label>
                            <input
                                type="date"
                                value={formData.event_date}
                                onChange={e => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-primary dark:focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                                {t('admin.calendar.field_type')}
                            </label>
                            <select
                                value={formData.event_type}
                                onChange={e => {
                                    const type = EVENT_TYPES.find(t => t.value === e.target.value);
                                    setFormData(prev => ({
                                        ...prev,
                                        event_type: e.target.value as CalendarEvent['event_type'],
                                        color: type?.color || prev.color
                                    }));
                                }}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-primary dark:focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium shadow-inner appearance-none cursor-pointer"
                            >
                                {EVENT_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="allDay"
                                checked={formData.all_day}
                                onChange={e => setFormData(prev => ({ ...prev, all_day: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
                        </div>
                        <label htmlFor="allDay" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            {t('admin.calendar.all_day')}
                        </label>
                    </div>

                    {!formData.all_day && (
                        <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                                    {t('admin.calendar.field_start_time')}
                                </label>
                                <input
                                    type="time"
                                    value={formData.start_time || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-primary dark:focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                                    {t('admin.calendar.field_end_time')}
                                </label>
                                <input
                                    type="time"
                                    value={formData.end_time || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-primary dark:focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium shadow-inner"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                            {t('admin.calendar.field_location')}
                        </label>
                        <input
                            type="text"
                            value={formData.location || ''}
                            onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-primary dark:focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium shadow-inner"
                            placeholder="Ej. Patio de la escuela"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                            {t('admin.calendar.field_description')}
                        </label>
                        <textarea
                            value={formData.description || ''}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-primary dark:focus:border-primary rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-medium shadow-inner resize-none"
                            placeholder="Añade más detalles sobre el evento..."
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                            {t('admin.calendar.field_color')}
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#22c55e', '#f59e0b', '#0ea5e9', '#6366f1'].map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                                    className={`w-10 h-10 rounded-full transition-all duration-300 ${formData.color === color
                                        ? 'ring-4 ring-offset-4 ring-primary scale-110 shadow-lg'
                                        : 'hover:scale-110 opacity-80 hover:opacity-100'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                    {editingEvent && onDelete && (
                        <button
                            onClick={() => onDelete(editingEvent.id)}
                            className="px-6 py-4 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition-all flex items-center gap-2"
                        >
                            <Trash2 className="w-5 h-5" />
                            <span className="hidden sm:inline">{t('common.delete')}</span>
                        </button>
                    )}
                    <div className="flex gap-4 ml-auto w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="flex-1 sm:flex-none px-8 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl shadow-primary/20 active:scale-95"
                        >
                            {saving ? t('common.saving') : t('common.save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
