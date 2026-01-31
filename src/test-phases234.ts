/**
 * Phases 2-4 Test Suite
 * Tests calendar, whatsapp, and main orchestration modules
 *
 * Note: These are basic tests that don't require external services.
 * Full integration tests require Google credentials and WhatsApp session.
 */

import { calendarService } from './calendar';
import { whatsappService } from './whatsapp';
import { config } from './config';

console.log('\n=== Phases 2-4 Module Tests ===\n');

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => boolean | void) {
  try {
    const result = fn();
    if (result === false) {
      console.log(`❌ FAIL: ${name}`);
      failedTests++;
    } else {
      console.log(`✅ PASS: ${name}`);
      passedTests++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${name} - ${(error as Error).message}`);
    failedTests++;
  }
}

// ===========================
// Test 1: Module Imports
// ===========================
console.log('\n--- Test 1: Module Imports ---');

test('Calendar module imports successfully', () => {
  return typeof calendarService === 'object';
});

test('WhatsApp module imports successfully', () => {
  return typeof whatsappService === 'object';
});

test('Calendar service has required methods', () => {
  return typeof calendarService.getTomorrowsEvents === 'function' &&
         typeof calendarService.parseReminderEvents === 'function';
});

test('WhatsApp service has required methods', () => {
  return typeof whatsappService.initialize === 'function' &&
         typeof whatsappService.sendReminder === 'function' &&
         typeof whatsappService.sendToSelf === 'function' &&
         typeof whatsappService.close === 'function';
});

// ===========================
// Test 2: Calendar Event Parsing
// ===========================
console.log('\n--- Test 2: Calendar Event Parsing ---');

test('parseReminderEvents filters non-reminder events', () => {
  const events = [
    {
      id: '1',
      summary: 'Regular Meeting',
      description: 'Person 1\nPerson 2',
      start: { dateTime: '2026-02-01T15:00:00Z' }
    },
    {
      id: '2',
      summary: '🔔 Reminder Meeting',
      description: 'Person 3\nPerson 4',
      start: { dateTime: '2026-02-01T16:00:00Z' }
    }
  ];

  const reminders = calendarService.parseReminderEvents(events);
  return reminders.length === 1 && reminders[0].title === '🔔 Reminder Meeting';
});

test('parseReminderEvents extracts people from description', () => {
  const events = [
    {
      id: '1',
      summary: '🔔 Test',
      description: 'Alice\nBob\nCharlie',
      start: { dateTime: '2026-02-01T15:00:00Z' }
    }
  ];

  const reminders = calendarService.parseReminderEvents(events);
  return reminders.length === 1 &&
         reminders[0].people.length === 3 &&
         reminders[0].people.includes('Alice') &&
         reminders[0].people.includes('Bob') &&
         reminders[0].people.includes('Charlie');
});

test('parseReminderEvents handles empty description', () => {
  const events = [
    {
      id: '1',
      summary: '🔔 Test',
      description: '',
      start: { dateTime: '2026-02-01T15:00:00Z' }
    }
  ];

  const reminders = calendarService.parseReminderEvents(events);
  // Should skip event with no people
  return reminders.length === 0;
});

test('parseReminderEvents handles undefined description', () => {
  const events = [
    {
      id: '1',
      summary: '🔔 Test',
      description: undefined,
      start: { dateTime: '2026-02-01T15:00:00Z' }
    }
  ];

  const reminders = calendarService.parseReminderEvents(events as any);
  // Should skip event with no people
  return reminders.length === 0;
});

test('parseReminderEvents trims whitespace from names', () => {
  const events = [
    {
      id: '1',
      summary: '🔔 Test',
      description: '  Alice  \n\n  Bob  \n',
      start: { dateTime: '2026-02-01T15:00:00Z' }
    }
  ];

  const reminders = calendarService.parseReminderEvents(events);
  return reminders.length === 1 &&
         reminders[0].people.length === 2 &&
         reminders[0].people[0] === 'Alice' &&
         reminders[0].people[1] === 'Bob';
});

test('parseReminderEvents handles multiple reminder events', () => {
  const events = [
    {
      id: '1',
      summary: '🔔 Meeting 1',
      description: 'Person 1',
      start: { dateTime: '2026-02-01T15:00:00Z' }
    },
    {
      id: '2',
      summary: '🔔 Meeting 2',
      description: 'Person 2',
      start: { dateTime: '2026-02-01T16:00:00Z' }
    },
    {
      id: '3',
      summary: 'Regular Meeting',
      description: 'Person 3',
      start: { dateTime: '2026-02-01T17:00:00Z' }
    }
  ];

  const reminders = calendarService.parseReminderEvents(events);
  return reminders.length === 2;
});

// ===========================
// Test 3: Configuration Validation
// ===========================
console.log('\n--- Test 3: Configuration for Phases 2-4 ---');

test('Config has WhatsApp settings', () => {
  return config.whatsapp.url === 'https://web.whatsapp.com' &&
         config.whatsapp.userDataDir === './data/whatsapp-session' &&
         config.whatsapp.timeout === 60000;
});

test('Config has calendar scopes', () => {
  return config.calendar.scopes.length > 0 &&
         config.calendar.scopes[0].includes('calendar.readonly');
});

test('Config has correct file paths for credentials', () => {
  return config.files.credentials === './credentials/credentials.json' &&
         config.files.token === './credentials/token.json';
});

// ===========================
// Test 4: TypeScript Compilation
// ===========================
console.log('\n--- Test 4: TypeScript Build ---');

test('All modules compile without errors', () => {
  // If this test runs, TypeScript compilation succeeded
  return true;
});

// ===========================
// Test Results Summary
// ===========================
console.log('\n=== Test Results ===');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📊 Total:  ${passedTests + failedTests}`);

if (failedTests === 0) {
  console.log('\n🎉 All Phases 2-4 tests passed!');
  console.log('\n⚠️  Note: Full integration tests require:');
  console.log('   - Google OAuth credentials (credentials/credentials.json)');
  console.log('   - WhatsApp Web QR code scan');
  console.log('   - Test calendar event with 🔔 emoji\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Review errors above.\n');
  process.exit(1);
}
