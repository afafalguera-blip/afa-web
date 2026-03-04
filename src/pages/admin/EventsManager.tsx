import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminCalendarService } from '../../services/admin/AdminCalendarService';
import type { CalendarEvent, EventFormData } from '../../services/admin/AdminCalendarService';
import { CalendarAdminHeader } from '../../components/admin/calendar/CalendarAdminHeader';
import { CalendarAdminGrid } from '../../components/admin/calendar/CalendarAdminGrid';
import { EventAdminList } from '../../components/admin/calendar/EventAdminList';
import { EventFormModal } from '../../components/admin/calendar/EventFormModal';

export default function EventsManager() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    all_day: false,
    event_type: 'general',
    color: '#3b82f6'
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminCalendarService.getEventsForMonth(currentMonth);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreate = (date?: string) => {
    setEditingEvent(null);
    setFormData({
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
    setIsModalOpen(true);
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
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
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.calendar.delete_confirm'))) return;

    try {
      await AdminCalendarService.deleteEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(t('common.error_delete'));
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.event_date) {
      alert(t('admin.calendar.required_fields'));
      return;
    }

    setSaving(true);
    try {
      await AdminCalendarService.saveEvent(formData, editingEvent?.id);
      setIsModalOpen(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert(t('common.error_save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <CalendarAdminHeader
        currentMonth={currentMonth}
        loading={loading}
        onPrevMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
        onNextMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
        onRefresh={fetchEvents}
        onCreate={() => handleCreate()}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
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
        onClose={() => setIsModalOpen(false)}
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
