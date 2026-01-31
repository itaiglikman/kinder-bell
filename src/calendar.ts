import { google } from 'googleapis';
import * as fs from 'fs';
import * as readline from 'readline';
import { CalendarEvent, ReminderEvent } from './types';
import { config } from './config';
import { logger } from './logger';

class CalendarService {
  // DECISION: Use OAuth2 for authorization instead of service account
  // REASONING: Personal use case, user owns the calendar, simpler setup
  // ALTERNATIVES: Service account (rejected - overkill for personal use)

  private async authorize() {
    const credentials = JSON.parse(
      fs.readFileSync(config.files.credentials, 'utf-8')
    );

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Check if we have a token saved
    try {
      const token = fs.readFileSync(config.files.token, 'utf-8');
      oAuth2Client.setCredentials(JSON.parse(token));
      return oAuth2Client;
    } catch (error) {
      // Need to get new token (first run or token expired)
      return await this.getNewToken(oAuth2Client);
    }
  }

  private async getNewToken(oAuth2Client: any): Promise<any> {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: config.calendar.scopes,
    });

    console.log('Authorize this app by visiting this url:', authUrl);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve, reject) => {
      rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err: any, token: any) => {
          if (err) {
            reject(err);
            return;
          }
          oAuth2Client.setCredentials(token);

          // Save token for future runs
          const dir = require('path').dirname(config.files.token);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(config.files.token, JSON.stringify(token));
          logger.success('Token saved successfully');
          resolve(oAuth2Client);
        });
      });
    });
  }

  async getTomorrowsEvents(): Promise<CalendarEvent[]> {
    try {
      const auth = await this.authorize();
      const calendar = google.calendar({ version: 'v3', auth });

      // Calculate tomorrow's date range
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + config.calendar.daysAhead);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: tomorrow.toISOString(),
        timeMax: dayAfter.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      logger.info(`Found ${events.length} events for tomorrow`);

      return events.map(event => ({
        id: event.id!,
        summary: event.summary || 'No title',
        description: event.description || '',
        start: {
          dateTime: event.start?.dateTime || event.start?.date || ''
        }
      }));

    } catch (error) {
      logger.error('Failed to fetch calendar events', error as Error);
      throw error;
    }
  }

  parseReminderEvents(events: CalendarEvent[]): ReminderEvent[] {
    const reminders: ReminderEvent[] = [];

    for (const event of events) {
      // Check for bell emoji in title
      // DECISION: Use 🔔 emoji as reminder marker
      // REASONING: Simple, visual, easy to add in Google Calendar
      // ALTERNATIVES: Keyword like "REMINDER" (rejected - less intuitive)
      if (!event.summary.includes('🔔')) {
        continue;
      }

      // Parse people from description (one name per line)
      const people = (event.description || '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (people.length === 0) {
        logger.warning(`Event "${event.summary}" has 🔔 but no people listed`);
        continue;
      }

      reminders.push({
        eventId: event.id,
        title: event.summary,
        date: event.start.dateTime,
        people
      });

      logger.info(`Parsed reminder: ${event.summary} (${people.length} people)`);
    }

    return reminders;
  }
}

// Export singleton instance
export const calendarService = new CalendarService();
