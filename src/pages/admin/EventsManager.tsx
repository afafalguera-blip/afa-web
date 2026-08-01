import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminCalendarService } from '../../services/admin/AdminCalendarService';
import type { CalendarEvent, EventFormData } from '../../services/admin/AdminCalendarService';
import { AdminPageHeader } from '../../components/admin/common/AdminPageHeader';
import { useToast } from '../../components/common/Toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useDirtyGuard } from '../../hooks/useDirtyGuard';
import { CalendarAdminGrid } from '../../components/admin/calendar/CalendarAdminGrid';
import { EventAdminList } from '../../components/admin/calendar/EventAdminList';
import { EventFormModal } from '../../components/admin/calendar/EventFormModal';

const createEmptyForm = (date?: string): EventFormData => ({
  title: '',
  description: '',
  event_date: date || new Date().toISOString().split('T')[0],
  start_time: '',
  end_time: '',
  location: '',
  all_day: false,
  event_type: 'general',
  color: '#3b82f6'
});

export default function EventsManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EventFormData>(createEmptyForm);
  const [formSnapshot, setFormSnapshot] = useState('');

  const isDirty = isModalOpen && JSON.stringify(formData) !== formSnapshot;
  const { confirmDiscard } = useDirtyGuard(isDirty);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminCalendarService.getEventsForMonth(currentMonth);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error(t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  }, [currentMonth, toast, t]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const openModal = (event: CalendarEvent | null, data: EventFormData) => {
    setEditingEvent(event);
    setFormData(data);
    setFormSnapshot(JSON.stringify(data));
    setIsModalOpen(true);
  };

  const handleCreate = (date?: string) => openModal(null, createEmptyForm(date));

  const handleEdit = (event: CalendarEvent) => {
    openModal(event, {
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location: event.location || '',
      all_day: event.all_day,
      event_type: event.event_type,
      color: event.color
    });
  };

  const handleCloseModal = async () => {
    if (!(await confirmDiscard())) return;
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    const event = events.find((item) => item.id === id);
    const accepted = await confirm({
      title: t('admin.calendar.delete_confirm'),
      itemName: event?.title,
      confirmLabel: t('common.delete'),
      destructive: true
    });
    if (!accepted) return;

    try {
      await AdminCalendarService.deleteEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      setIsModalOpen(false);
      toast.success(t('admin.calendar.deleted', 'Esdeveniment eliminat'));
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(t('common.error_delete'));
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.event_date) {
      toast.error(t('admin.calendar.required_fields'));
      return;
    }

    setSaving(true);
    try {
      await AdminCalendarService.saveEvent(formData, editingEvent?.id);
      setFormSnapshot(JSON.stringify(formData));
      setIsModalOpen(false);
      toast.success(t('admin.calendar.saved', 'Esdeveniment desat'));
      await fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const goToPrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <AdminPageHeader
        title={t('admin.calendar.title')}
        subtitle={t('admin.calendar.subtitle')}
        icon={CalendarDays}
        loading={loading}
        onRefresh={fetchEvents}
        onCreate={() => handleCreate()}
        createLabel={t('admin.calendar.new_event')}
        actions={
          /* Month navigation used to live in CalendarAdminHeader; kept here as a
             header action so no calendar-specific control is lost. */
          <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-1 py-0.5">
            <button
              type="button"
              onClick={goToPrevMonth}
              aria-label={t('admin.calendar.prev_month', 'Mes anterior')}
              className="p-1.5 rounded text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-[13px] font-medium text-neutral-900 capitalize min-w-[9rem] text-center">
              {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label={t('admin.calendar.next_month', 'Mes següent')}
              className="p-1.5 rounded text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <CalendarAdminGrid
            currentMonth={currentMonth}
            events={events}
            onDayClick={handleCreate}
            onEventClick={handleEdit}
          />
        </div>

        <div className="xl:col-span-1">
          <EventAdminList
            events={events}
            searchText={searchText}
            onSearchChange={setSearchText}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </div>
      </div>

      <EventFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        onDelete={handleDelete}
        formData={formData}
        setFormData={setFormData}
        editingEvent={editingEvent}
        saving={saving}
      />
    </div>
  );
}
