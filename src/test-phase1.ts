/**
 * Phase 1 Test Suite
 * Tests all core infrastructure modules
 */

import { logger } from './logger';
import { config } from './config';
import { stateManager } from './state';
import { contactManager } from './contacts';

console.log('\n=== Phase 1 Core Infrastructure Tests ===\n');

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
// Test 1: Logger Module
// ===========================
console.log('\n--- Test 1: Logger ---');

test('Logger: info() logs message', () => {
  logger.info('Test info message');
  return true;
});

test('Logger: success() logs message', () => {
  logger.success('Test success message');
  return true;
});

test('Logger: warning() logs message', () => {
  logger.warning('Test warning message');
  return true;
});

test('Logger: error() logs message', () => {
  logger.error('Test error message');
  return true;
});

test('Logger: error() with Error object', () => {
  const err = new Error('Test error object');
  logger.error('Error with object', err);
  return true;
});

// ===========================
// Test 2: Config Module
// ===========================
console.log('\n--- Test 2: Config ---');

test('Config: timeWindow is defined', () => {
  return config.timeWindow.start.hour === 18 &&
         config.timeWindow.start.minute === 40;
});

test('Config: delays are defined', () => {
  return config.delays.betweenMessages.min === 2000 &&
         config.delays.betweenMessages.max === 8000;
});

test('Config: file paths are defined', () => {
  return config.files.contacts === './data/contacts.json' &&
         config.files.state === './data/state.json';
});

test('Config: calendar settings are defined', () => {
  return config.calendar.daysAhead === 1;
});

test('Config: reminder message template works', () => {
  const msg = config.messages.reminder('Test Event', '15:00');
  return msg.includes('15:00') && msg.length > 0;
});

test('Config: summary message template works', () => {
  const results = [
    { person: 'Test', status: 'success' as const },
    { person: 'Test2', status: 'contact_not_found' as const }
  ];
  const msg = config.messages.summary('Event', results, '18:00');
  return msg.includes('Test') && msg.includes('18:00');
});

// ===========================
// Test 3: State Management
// ===========================
console.log('\n--- Test 3: State Management ---');

test('State: wasAlreadySent() returns false for new event', () => {
  return stateManager.wasAlreadySent('test-event-123') === false;
});

test('State: markAsSent() adds reminder to state', () => {
  stateManager.markAsSent({
    event_id: 'test-event-123',
    event_title: 'Test Event',
    sent_at: new Date().toISOString(),
    recipients: [{ person: 'Test Person', status: 'success' }]
  });
  return true;
});

test('State: wasAlreadySent() returns true after marking', () => {
  return stateManager.wasAlreadySent('test-event-123') === true;
});

test('State: getHistory() returns sent reminders', () => {
  const history = stateManager.getHistory();
  return history.length > 0 && history[0].event_id === 'test-event-123';
});

test('State: markAsSent() with multiple recipients', () => {
  stateManager.markAsSent({
    event_id: 'test-event-456',
    event_title: 'Multi-Person Event',
    sent_at: new Date().toISOString(),
    recipients: [
      { person: 'Person 1', status: 'success' },
      { person: 'Person 2', status: 'contact_not_found' },
      { person: 'Person 3', status: 'chat_not_found' }
    ]
  });
  return stateManager.wasAlreadySent('test-event-456');
});

// ===========================
// Test 4: Contact Management
// ===========================
console.log('\n--- Test 4: Contact Management ---');

test('Contacts: loads contacts from file', () => {
  const all = contactManager.getAll();
  return all.length === 3;
});

test('Contacts: findByName() exact match', () => {
  const contact = contactManager.findByName('Dana Levi');
  return contact !== null && contact.phone === '972509876543';
});

test('Contacts: findByName() case-insensitive match', () => {
  const contact = contactManager.findByName('dana levi');
  return contact !== null && contact.name === 'Dana Levi';
});

test('Contacts: findByName() returns null for missing contact', () => {
  const contact = contactManager.findByName('Nonexistent Person');
  return contact === null;
});

test('Contacts: getAll() returns all contacts', () => {
  const all = contactManager.getAll();
  const names = all.map(c => c.name);
  return names.includes('Test Person') &&
         names.includes('Dana Levi') &&
         names.includes('Staff Member');
});

test('Contacts: contact has correct structure', () => {
  const contact = contactManager.findByName('Test Person');
  return contact !== null &&
         contact.name === 'Test Person' &&
         contact.phone === '972501234567' &&
         contact.type === 'parent';
});

// ===========================
// Test 5: TypeScript Compilation
// ===========================
console.log('\n--- Test 5: TypeScript Types ---');

test('Types: can import all type definitions', () => {
  // If this file compiles, types are valid
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
  console.log('\n🎉 All Phase 1 tests passed!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Review errors above.\n');
  process.exit(1);
}
