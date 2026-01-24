
import { Event } from '../types';
import { MOCK_EVENTS } from '../constants';

const API_BASE_URL = 'http://localhost:3000';
const LOCAL_STORAGE_KEY = 'eventpulse_db_fallback';

// Internal helper for persistent local storage when backend is unavailable
const localDB = {
  getEvents: (): Event[] => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(MOCK_EVENTS));
      return MOCK_EVENTS;
    }
    return JSON.parse(data);
  },
  saveEvents: (events: Event[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
  }
};

export const apiService = {
  async fetchEvents(): Promise<Event[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        signal: AbortSignal.timeout(2000) // Short timeout to trigger fallback quickly
      });
      if (!response.ok) throw new Error('Backend responded with error');
      const data = await response.json();
      // Sync local storage with fresh data if possible
      if (data && data.length > 0) localDB.saveEvents(data);
      return data;
    } catch (e) {
      console.warn('Backend unreachable, falling back to persistent local storage.', e);
      return localDB.getEvents();
    }
  },

  async createEvent(event: Event): Promise<Event> {
    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to create event');
      return result.data;
    } catch (e) {
      // Fallback persistence
      const events = localDB.getEvents();
      const updated = [event, ...events];
      localDB.saveEvents(updated);
      return event;
    }
  },

  async updateEvent(id: string, event: Partial<Event>): Promise<Event> {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update event');
      return result.data;
    } catch (e) {
      // Fallback persistence
      const events = localDB.getEvents();
      const updated = events.map(ev => ev.id === id ? { ...ev, ...event } : ev);
      localDB.saveEvents(updated);
      return updated.find(ev => ev.id === id) as Event;
    }
  },

  async deleteEvent(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to delete event');
      }
    } catch (e) {
      // Fallback persistence
      const events = localDB.getEvents();
      const updated = events.filter(ev => ev.id !== id);
      localDB.saveEvents(updated);
    }
  }
};
