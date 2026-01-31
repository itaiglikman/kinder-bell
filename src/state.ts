import * as fs from 'fs';
import * as path from 'path';
import { State, SentReminder } from './types';
import { config } from './config';
import { logger } from './logger';

class StateManager {
  private state: State;
  private filePath: string;

  constructor() {
    this.filePath = config.files.state;
    this.state = this.load();
  }

  private load(): State {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.warning('Could not load state, starting fresh');
    }
    return { sent_reminders: [] };
  }

  private save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      logger.error('Failed to save state', error as Error);
    }
  }

  // Check if reminder was already sent for this event
  wasAlreadySent(eventId: string): boolean {
    return this.state.sent_reminders.some(r => r.event_id === eventId);
  }

  // Mark event as sent and save to file
  markAsSent(reminder: SentReminder) {
    this.state.sent_reminders.push(reminder);
    this.save();
    logger.info(`Marked event ${reminder.event_id} as sent`);
  }

  // Get all sent reminders
  getHistory(): SentReminder[] {
    return [...this.state.sent_reminders];
  }
}

// Export singleton instance
export const stateManager = new StateManager();
