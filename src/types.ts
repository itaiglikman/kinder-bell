// TypeScript type definitions for kinder-bell

// Calendar event from Google Calendar API
export interface CalendarEvent {
  id: string;
  summary: string;  // title
  description?: string;
  start: {
    dateTime: string;
  };
}

// Parsed reminder event (events with 🔔 emoji)
export interface ReminderEvent {
  eventId: string;
  title: string;
  date: string;
  people: string[];  // names from description
}

// Contact from contacts.json
export interface Contact {
  name: string;
  phone: string;  // format: 972501234567
  type: 'parent' | 'staff';
}

// Result of sending a reminder to one person
export interface SendResult {
  person: string;
  status: 'success' | 'contact_not_found' | 'chat_not_found' | 'error';
  error?: string;
}

// Record of a sent reminder (stored in state.json)
export interface SentReminder {
  event_id: string;
  event_title: string;
  sent_at: string;  // ISO timestamp
  recipients: SendResult[];
}

// State file structure
export interface State {
  sent_reminders: SentReminder[];
}

// Contacts file structure
export interface ContactsData {
  contacts: Contact[];
}
