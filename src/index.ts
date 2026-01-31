import { logger } from './logger';
import { calendarService } from './calendar';
import { contactManager } from './contacts';
import { whatsappService } from './whatsapp';
import { stateManager } from './state';
import { config } from './config';
import { ReminderEvent, SendResult } from './types';

async function isWithinTimeWindow(): Promise<boolean> {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const startMinutes = config.timeWindow.start.hour * 60 + config.timeWindow.start.minute;
  const endMinutes = config.timeWindow.end.hour * 60 + config.timeWindow.end.minute;
  const currentMinutes = hour * 60 + minute;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
}

async function processReminder(reminder: ReminderEvent): Promise<void> {
  logger.info(`Processing reminder: ${reminder.title}`);

  const results: SendResult[] = [];
  const eventTime = formatTime(reminder.date);

  for (const personName of reminder.people) {
    logger.info(`Processing person: ${personName}`);

    // Find contact
    const contact = contactManager.findByName(personName);
    if (!contact) {
      logger.warning(`Contact not found: ${personName}`);
      results.push({
        person: personName,
        status: 'contact_not_found'
      });
      continue;
    }

    // Send reminder
    const message = config.messages.reminder(reminder.title, eventTime);
    const result = await whatsappService.sendReminder(
      contact.phone,
      personName,
      message
    );

    results.push(result);

    if (result.status === 'success') {
      logger.success(`Sent reminder to ${personName}`);
    } else {
      logger.warning(`Failed to send to ${personName}: ${result.status}`);
    }
  }

  // Send summary to self
  const summary = config.messages.summary(
    reminder.title,
    results,
    getCurrentTime()
  );
  await whatsappService.sendToSelf(summary);

  // Mark as sent
  stateManager.markAsSent({
    event_id: reminder.eventId,
    event_title: reminder.title,
    sent_at: new Date().toISOString(),
    recipients: results
  });

  logger.success(`Completed processing: ${reminder.title}`);
}

async function main() {
  try {
    logger.info('=== kinder-bell starting ===');

    // Check time window
    // USER PREFERENCE: Send reminders in evening window (18:40-19:20)
    // DECISION: Can be overridden by commenting out return statement for testing
    if (!await isWithinTimeWindow()) {
      const now = new Date();
      logger.warning(
        `Not within time window. Current time: ${now.getHours()}:${now.getMinutes()}. ` +
        `Window: ${config.timeWindow.start.hour}:${config.timeWindow.start.minute} - ` +
        `${config.timeWindow.end.hour}:${config.timeWindow.end.minute}`
      );
      // Comment this out if you want to run manually outside the window
      // return;
    }

    // Fetch calendar events
    logger.info('Fetching calendar events...');
    const events = await calendarService.getTomorrowsEvents();

    if (events.length === 0) {
      logger.info('No events found for tomorrow');
      return;
    }

    // Parse reminder events
    const reminders = calendarService.parseReminderEvents(events);

    if (reminders.length === 0) {
      logger.info('No reminder events found (no 🔔 emoji in titles)');
      return;
    }

    logger.info(`Found ${reminders.length} reminder(s) to process`);

    // Filter out already sent
    const toSend = reminders.filter(r => {
      if (stateManager.wasAlreadySent(r.eventId)) {
        logger.info(`Already sent: ${r.title}`);
        return false;
      }
      return true;
    });

    if (toSend.length === 0) {
      logger.info('All reminders already sent');
      return;
    }

    logger.info(`${toSend.length} reminder(s) to send`);

    // Initialize WhatsApp
    await whatsappService.initialize();

    // Process each reminder
    for (const reminder of toSend) {
      await processReminder(reminder);
    }

    logger.success('=== kinder-bell completed successfully ===');

  } catch (error) {
    logger.error('Fatal error in main', error as Error);

    // Try to notify via WhatsApp if possible
    try {
      if (whatsappService) {
        await whatsappService.sendToSelf(
          `⚠️ kinder-bell error:\n${(error as Error).message}`
        );
      }
    } catch (notifyError) {
      logger.error('Could not send error notification', notifyError as Error);
    }

    throw error;

  } finally {
    // Always close WhatsApp
    await whatsappService.close();
  }
}

// Run
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
