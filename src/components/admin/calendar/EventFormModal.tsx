import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { EVENT_TYPES } from '../../../services/admin/AdminCalendarService';
import type { EventFormData, CalendarEvent } from '../../../services/admin/AdminCalendarService';
import { getRegionalLanguageTag } from '../../../utils/locale';

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

const FIELD_CLASS =
    'w-full px-3 py-2 bg-white border border-neutral-200 rounded-md outline-none transition-colors focus:ring-2 focus:ring-neutral-300 text-neutral-900';
const LABEL_CLASS = 'block text-[13px] font-medium text-neutral-700 mb-1';

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
    const { t, i18n } = useTranslation();
    const nativeDateLocale = getRegionalLanguageTag(i18n.resolvedLanguage || i18n.language);

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            closeOnBackdrop={false}
            size="md"
            title={editingEvent ? t('admin.calendar.edit_event') : t('admin.calendar.new_event')}
            footer={
                <>
                    {editingEvent && onDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(editingEvent.id)}
                            className="mr-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('common.delete')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className="px-3.5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium transition-colors disabled:opacity-50"
                    >
                        {saving ? t('common.saving') : t('common.save')}
                    </button>
                </>
            }
        >
            <div className="space-y-5">
                <div>
                    <label htmlFor="event-title" className={LABEL_CLASS}>
                        {t('admin.calendar.field_title')} *
                    </label>
                    <input
                        id="event-title"
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className={FIELD_CLASS}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="event-date" className={LABEL_CLASS}>
                            {t('admin.calendar.field_date')} *
                        </label>
                        <input
                            id="event-date"
                            type="date"
                            lang={nativeDateLocale}
                            value={formData.event_date}
                            onChange={e => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                            className={FIELD_CLASS}
                        />
                    </div>
                    <div>
                        <label htmlFor="event-type" className={LABEL_CLASS}>
                            {t('admin.calendar.field_type')}
                        </label>
                        <select
                            id="event-type"
                            value={formData.event_type}
                            onChange={e => {
                                const type = EVENT_TYPES.find(item => item.value === e.target.value);
                                setFormData(prev => ({
                                    ...prev,
                                    event_type: e.target.value as CalendarEvent['event_type'],
                                    color: type?.color || prev.color
                                }));
                            }}
                            className={FIELD_CLASS}
                        >
                            {EVENT_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                    <input
                        type="checkbox"
                        id="allDay"
                        checked={formData.all_day}
                        onChange={e => setFormData(prev => ({ ...prev, all_day: e.target.checked }))}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
                    />
                    <label htmlFor="allDay" className="text-[13px] font-medium text-neutral-700 cursor-pointer">
                        {t('admin.calendar.all_day')}
                    </label>
                </div>

                {!formData.all_day && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="event-start" className={LABEL_CLASS}>
                                {t('admin.calendar.field_start_time')}
                            </label>
                            <input
                                id="event-start"
                                type="time"
                                value={formData.start_time || ''}
                                onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                                className={FIELD_CLASS}
                            />
                        </div>
                        <div>
                            <label htmlFor="event-end" className={LABEL_CLASS}>
                                {t('admin.calendar.field_end_time')}
                            </label>
                            <input
                                id="event-end"
                                type="time"
                                value={formData.end_time || ''}
                                onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                                className={FIELD_CLASS}
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label htmlFor="event-location" className={LABEL_CLASS}>
                        {t('admin.calendar.field_location')}
                    </label>
                    <input
                        id="event-location"
                        type="text"
                        value={formData.location || ''}
                        onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        className={FIELD_CLASS}
                    />
                </div>

                <div>
                    <label htmlFor="event-description" className={LABEL_CLASS}>
                        {t('admin.calendar.field_description')}
                    </label>
                    <textarea
                        id="event-description"
                        value={formData.description || ''}
                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className={`${FIELD_CLASS} resize-none`}
                    />
                </div>

                <fieldset>
                    <legend className={LABEL_CLASS}>{t('admin.calendar.field_color')}</legend>
                    <div className="flex flex-wrap gap-2">
                        {['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#22c55e', '#f59e0b', '#0ea5e9', '#6366f1'].map(color => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, color }))}
                                aria-label={color}
                                aria-pressed={formData.color === color}
                                className={`w-8 h-8 rounded-full transition-transform ${
                                    formData.color === color
                                        ? 'ring-2 ring-offset-2 ring-neutral-900 scale-105'
                                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </fieldset>
            </div>
        </Modal>
    );
}
