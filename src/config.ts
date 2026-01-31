import { SendResult } from './types';

export const config = {
  // Time window for sending reminders (18:40 - 19:20)
  // USER PREFERENCE: Evening window to avoid dinner time
  timeWindow: {
    start: { hour: 18, minute: 40 },
    end: { hour: 19, minute: 20 }
  },

  // Random delays between messages for human-like behavior
  // DECISION: 2-8 seconds to appear natural and avoid spam detection
  delays: {
    betweenMessages: { min: 2000, max: 8000 },
    afterError: 5000,
    findChat: { min: 1000, max: 3000 }
  },

  // WhatsApp Web configuration
  whatsapp: {
    url: 'https://web.whatsapp.com',
    userDataDir: './data/whatsapp-session',
    timeout: 60000  // 60 seconds for QR code scan
  },

  // File paths
  files: {
    contacts: './data/contacts.json',
    state: './data/state.json',
    log: './data/logs/app.log',
    credentials: './credentials/credentials.json',
    token: './credentials/token.json'
  },

  // Google Calendar configuration
  calendar: {
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    daysAhead: 1  // Check tomorrow's events
  },

  // Message templates (Hebrew)
  messages: {
    // Reminder message sent to recipients
    reminder: (eventTitle: string, eventTime: string) =>
      `היי! 👋\nתזכורת חברותית לפגישה מחר ב-${eventTime}.\nמחכה לראות אותך!`,

    // Summary message sent to self
    summary: (eventTitle: string, results: SendResult[], time: string) => {
      const success = results.filter(r => r.status === 'success');
      const failed = results.filter(r => r.status !== 'success');

      let msg = `📅 תזכורת: ${eventTitle}\n\n`;

      if (success.length > 0) {
        msg += `✅ נשלח בהצלחה:\n`;
        success.forEach(r => msg += `  • ${r.person}\n`);
        msg += '\n';
      }

      if (failed.length > 0) {
        msg += `⚠️ לא נשלח:\n`;
        failed.forEach(r => {
          const reason = r.status === 'contact_not_found'
            ? 'איש קשר לא נמצא'
            : r.status === 'chat_not_found'
            ? 'צ\'אט לא נמצא'
            : 'שגיאה';
          msg += `  • ${r.person} - ${reason}\n`;
        });
        msg += '\n';
      }

      msg += `🕐 ${time}`;
      return msg;
    }
  }
};
