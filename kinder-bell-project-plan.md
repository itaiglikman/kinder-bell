# kinder-bell - Project Plan & Implementation Guide

## 📋 Project Overview

**kinder-bell** is a personal WhatsApp reminder system for a kindergarten social worker who coordinates meetings with parents and staff.

### Goal
Send gentle WhatsApp reminder messages the evening before scheduled meetings to reduce missed appointments.

### Key Principles
- **Personal use only** - not a commercial product
- **Low risk** - minimize chance of WhatsApp number blocking
- **Simple** - prefer simplicity over complexity
- **Safe** - better to do nothing than make mistakes

---

## 🎯 Core Requirements

### How It Works
1. **Calendar Detection**: Events with 🔔 emoji in title are reminders
2. **People List**: Names listed in event description (one per line)
3. **Timing**: Send evening before (18:40-19:20 window)
4. **Natural Feel**: Random delays, human-like messages
5. **Feedback**: Summary sent to self after each event

### Example Calendar Event
```
Title: 🔔 Meeting with Dana's parent
Date: February 1, 2025, 3:00 PM
Description:
Dana Levi
Yael Cohen
Ronit Shamir
```

### Constraints
- No paid services (no WhatsApp Business API)
- WhatsApp Web automation (Playwright)
- Personal WhatsApp number
- Existing conversations only (never open new chats)
- Low frequency (parents: ~1/month, staff: 1-3/week)
- Messages must appear human, not system-generated

---

## 🛠️ Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Automation**: Playwright (visible browser)
- **Calendar**: Google Calendar API
- **Platform**: Windows (initially), cloud-ready
- **Scheduling**: Task Scheduler + manual option

---

## 📁 Project Structure

```
kinder-bell/
├── src/
│   ├── index.ts              # Main entry point
│   ├── calendar.ts           # Google Calendar integration
│   ├── contacts.ts           # Contact management
│   ├── whatsapp.ts           # WhatsApp sender via Playwright
│   ├── state.ts              # State management (tracks sent reminders)
│   ├── logger.ts             # Console + file logging
│   ├── config.ts             # Configuration settings
│   └── types.ts              # TypeScript type definitions
├── data/
│   ├── contacts.json         # Contact list (name → phone mapping)
│   ├── state.json            # Sent reminders tracking
│   └── logs/
│       └── app.log           # Activity log
├── credentials/
│   ├── credentials.json      # Google API credentials (gitignored)
│   └── token.json            # Google OAuth token (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 Setup Instructions

### Step 1: Install Node.js
1. Download from: https://nodejs.org/
2. Choose LTS version (Long Term Support)
3. Run installer with default settings
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### Step 2: Google Calendar API Setup

#### A. Create Google Cloud Project
1. Go to: https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Name: `kinder-bell`
4. Click "Create"

#### B. Enable Google Calendar API
1. In the project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

#### C. Create Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External
   - App name: kinder-bell
   - User support email: your email
   - Developer contact: your email
   - Save and Continue through all steps
4. Back to "Create OAuth client ID":
   - Application type: Desktop app
   - Name: kinder-bell-desktop
   - Click "Create"
5. Download the JSON file
6. Rename it to `credentials.json`
7. Save it in the project under `credentials/credentials.json`

### Step 3: Initialize Project
```bash
# Create project directory
mkdir kinder-bell
cd kinder-bell

# Initialize npm
npm init -y

# Install dependencies
npm install typescript @types/node ts-node
npm install playwright
npm install googleapis
npm install winston

# Install dev dependencies
npm install --save-dev @types/winston

# Initialize TypeScript
npx tsc --init

# Install Playwright browsers
npx playwright install chromium
```

### Step 4: Create Data Files

#### `data/contacts.json`
```json
{
  "contacts": [
    {
      "name": "Dana Levi",
      "phone": "972501234567",
      "type": "parent"
    },
    {
      "name": "Yael Cohen",
      "phone": "972509876543",
      "type": "staff"
    }
  ]
}
```

#### `data/state.json`
```json
{
  "sent_reminders": []
}
```

### Step 5: Update package.json Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "start": "ts-node src/index.ts",
    "dev": "ts-node src/index.ts"
  }
}
```

### Step 6: Update tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Step 7: Create .gitignore
```
node_modules/
dist/
*.log
credentials/credentials.json
credentials/token.json
data/state.json
data/logs/
.env
```

---

## 📝 Implementation Tasks

### Phase 1: Core Infrastructure

#### Task 1.1: Types & Configuration
**File**: `src/types.ts`

Define all TypeScript interfaces:
```typescript
// Calendar event from Google
export interface CalendarEvent {
  id: string;
  summary: string;  // title
  description?: string;
  start: {
    dateTime: string;
  };
}

// Parsed reminder event
export interface ReminderEvent {
  eventId: string;
  title: string;
  date: string;
  people: string[];
}

// Contact
export interface Contact {
  name: string;
  phone: string;
  type: 'parent' | 'staff';
}

// Send result
export interface SendResult {
  person: string;
  status: 'success' | 'contact_not_found' | 'chat_not_found' | 'error';
  error?: string;
}

// Sent reminder record
export interface SentReminder {
  event_id: string;
  event_title: string;
  sent_at: string;
  recipients: SendResult[];
}

// State
export interface State {
  sent_reminders: SentReminder[];
}

// Contacts file
export interface ContactsData {
  contacts: Contact[];
}
```

**File**: `src/config.ts`

```typescript
export const config = {
  // Time window for sending (18:40 - 19:20)
  timeWindow: {
    start: { hour: 18, minute: 40 },
    end: { hour: 19, minute: 20 }
  },
  
  // Random delays between messages (2-8 seconds)
  delays: {
    betweenMessages: { min: 2000, max: 8000 },
    afterError: 5000,
    findChat: { min: 1000, max: 3000 }
  },
  
  // WhatsApp
  whatsapp: {
    url: 'https://web.whatsapp.com',
    userDataDir: './data/whatsapp-session',
    timeout: 60000
  },
  
  // Files
  files: {
    contacts: './data/contacts.json',
    state: './data/state.json',
    log: './data/logs/app.log',
    credentials: './credentials/credentials.json',
    token: './credentials/token.json'
  },
  
  // Calendar
  calendar: {
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    daysAhead: 1  // Check tomorrow's events
  },
  
  // Messages
  messages: {
    reminder: (eventTitle: string, eventTime: string) => 
      `היי! 👋\nתזכורת חברותית לפגישה מחר ב-${eventTime}.\nמחכה לראות אותך!`,
    
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
```

**Checkpoint**: Types and config are ready ✓

---

#### Task 1.2: Logger
**File**: `src/logger.ts`

Create simple logger that writes to console and file:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { config } from './config';

type LogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

class Logger {
  private logFile: string;
  
  constructor() {
    this.logFile = config.files.log;
    this.ensureLogDirectory();
  }
  
  private ensureLogDirectory() {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${level}: ${message}`;
  }
  
  private log(level: LogLevel, message: string) {
    const formatted = this.formatMessage(level, message);
    
    // Console with colors
    const colors = {
      INFO: '\x1b[36m',      // Cyan
      SUCCESS: '\x1b[32m',   // Green
      WARNING: '\x1b[33m',   // Yellow
      ERROR: '\x1b[31m'      // Red
    };
    const reset = '\x1b[0m';
    console.log(`${colors[level]}${formatted}${reset}`);
    
    // File
    fs.appendFileSync(this.logFile, formatted + '\n');
  }
  
  info(message: string) {
    this.log('INFO', message);
  }
  
  success(message: string) {
    this.log('SUCCESS', message);
  }
  
  warning(message: string) {
    this.log('WARNING', message);
  }
  
  error(message: string, error?: Error) {
    const msg = error ? `${message}: ${error.message}` : message;
    this.log('ERROR', msg);
  }
}

export const logger = new Logger();
```

**Test**:
```typescript
// In index.ts temporarily
import { logger } from './logger';
logger.info('Test message');
logger.success('Success!');
logger.warning('Warning!');
logger.error('Error!');
```

**Checkpoint**: Logger works, logs appear in console and file ✓

---

#### Task 1.3: State Management
**File**: `src/state.ts`

Manage sent reminders state:

```typescript
import * as fs from 'fs';
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
      const dir = require('path').dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      logger.error('Failed to save state', error as Error);
    }
  }
  
  wasAlreadySent(eventId: string): boolean {
    return this.state.sent_reminders.some(r => r.event_id === eventId);
  }
  
  markAsSent(reminder: SentReminder) {
    this.state.sent_reminders.push(reminder);
    this.save();
    logger.info(`Marked event ${reminder.event_id} as sent`);
  }
  
  getHistory(): SentReminder[] {
    return [...this.state.sent_reminders];
  }
}

export const stateManager = new StateManager();
```

**Test**:
```typescript
// In index.ts temporarily
import { stateManager } from './state';
console.log('Already sent?', stateManager.wasAlreadySent('test-123'));
stateManager.markAsSent({
  event_id: 'test-123',
  event_title: 'Test Event',
  sent_at: new Date().toISOString(),
  recipients: []
});
console.log('Already sent now?', stateManager.wasAlreadySent('test-123'));
```

**Checkpoint**: State loads, saves, and tracks sent reminders ✓

---

#### Task 1.4: Contact Management
**File**: `src/contacts.ts`

Load and search contacts:

```typescript
import * as fs from 'fs';
import { Contact, ContactsData } from './types';
import { config } from './config';
import { logger } from './logger';

class ContactManager {
  private contacts: Contact[];
  
  constructor() {
    this.contacts = this.load();
  }
  
  private load(): Contact[] {
    try {
      const data = fs.readFileSync(config.files.contacts, 'utf-8');
      const parsed: ContactsData = JSON.parse(data);
      logger.info(`Loaded ${parsed.contacts.length} contacts`);
      return parsed.contacts;
    } catch (error) {
      logger.error('Failed to load contacts', error as Error);
      return [];
    }
  }
  
  findByName(name: string): Contact | null {
    // Exact match first
    const exact = this.contacts.find(c => c.name === name);
    if (exact) return exact;
    
    // Case-insensitive match
    const normalized = name.trim().toLowerCase();
    const match = this.contacts.find(c => 
      c.name.trim().toLowerCase() === normalized
    );
    
    return match || null;
  }
  
  getAll(): Contact[] {
    return [...this.contacts];
  }
}

export const contactManager = new ContactManager();
```

**Test**:
```typescript
// In index.ts temporarily
import { contactManager } from './contacts';
const contact = contactManager.findByName('Dana Levi');
console.log('Found:', contact);
```

**Checkpoint**: Contacts load and can be searched ✓

---

### Phase 2: Google Calendar Integration

#### Task 2.1: Calendar Module
**File**: `src/calendar.ts`

```typescript
import { google } from 'googleapis';
import * as fs from 'fs';
import * as readline from 'readline';
import { CalendarEvent, ReminderEvent } from './types';
import { config } from './config';
import { logger } from './logger';

class CalendarService {
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
    
    // Check if we have a token
    try {
      const token = fs.readFileSync(config.files.token, 'utf-8');
      oAuth2Client.setCredentials(JSON.parse(token));
      return oAuth2Client;
    } catch (error) {
      // Need to get new token
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
          
          // Save token
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
      if (!event.summary.includes('🔔')) {
        continue;
      }
      
      // Parse people from description (one name per line)
      const people = event.description
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

export const calendarService = new CalendarService();
```

**Test**:
```typescript
// In index.ts
import { calendarService } from './calendar';

async function testCalendar() {
  const events = await calendarService.getTomorrowsEvents();
  console.log('Events:', events);
  
  const reminders = calendarService.parseReminderEvents(events);
  console.log('Reminders:', reminders);
}

testCalendar();
```

**Checkpoint**: 
- First run will ask for Google authorization
- Token saved for future runs
- Can fetch tomorrow's events
- Correctly parses events with 🔔 emoji ✓

---

### Phase 3: WhatsApp Integration

#### Task 3.1: WhatsApp Module
**File**: `src/whatsapp.ts`

```typescript
import { chromium, Browser, Page } from 'playwright';
import { config } from './config';
import { logger } from './logger';
import { SendResult } from './types';

class WhatsAppService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  
  async initialize() {
    try {
      logger.info('Launching WhatsApp Web...');
      
      this.browser = await chromium.launchPersistentContext(
        config.whatsapp.userDataDir,
        {
          headless: false,
          viewport: { width: 1280, height: 720 }
        }
      );
      
      this.page = this.browser.pages()[0] || await this.browser.newPage();
      
      await this.page.goto(config.whatsapp.url);
      logger.info('Navigated to WhatsApp Web');
      
      // Wait for WhatsApp to load
      await this.waitForWhatsAppReady();
      
      logger.success('WhatsApp Web is ready');
    } catch (error) {
      logger.error('Failed to initialize WhatsApp', error as Error);
      throw error;
    }
  }
  
  private async waitForWhatsAppReady() {
    if (!this.page) throw new Error('Page not initialized');
    
    try {
      // Wait for either QR code or chat list (means already logged in)
      await Promise.race([
        this.page.waitForSelector('canvas[aria-label="Scan me!"]', { timeout: 10000 }),
        this.page.waitForSelector('[data-testid="chat-list"]', { timeout: 10000 })
      ]);
      
      // If QR code is present, wait for it to disappear (user scanned)
      const qrCode = await this.page.$('canvas[aria-label="Scan me!"]');
      if (qrCode) {
        logger.info('QR code detected - please scan with your phone');
        await this.page.waitForSelector('[data-testid="chat-list"]', { 
          timeout: config.whatsapp.timeout 
        });
        logger.success('QR code scanned successfully');
      }
      
      // Extra wait to ensure everything is loaded
      await this.page.waitForTimeout(3000);
      
    } catch (error) {
      logger.error('WhatsApp did not load properly', error as Error);
      throw error;
    }
  }
  
  private async findChat(phone: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    
    try {
      // Click on search box
      const searchBox = await this.page.waitForSelector('[data-testid="chat-list-search"]', {
        timeout: 5000
      });
      await searchBox?.click();
      
      // Type phone number
      await this.page.keyboard.type(phone);
      await this.page.waitForTimeout(2000);
      
      // Look for chat result
      const chatResult = await this.page.$(`[data-testid="cell-frame-title"]`);
      
      if (chatResult) {
        await chatResult.click();
        await this.page.waitForTimeout(1000);
        logger.info(`Found chat for ${phone}`);
        return true;
      }
      
      logger.warning(`Chat not found for ${phone}`);
      return false;
      
    } catch (error) {
      logger.error(`Error finding chat for ${phone}`, error as Error);
      return false;
    } finally {
      // Clear search
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
    }
  }
  
  private async sendMessage(text: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    
    try {
      // Find message input box
      const messageBox = await this.page.waitForSelector('[data-testid="conversation-compose-box-input"]', {
        timeout: 5000
      });
      
      if (!messageBox) {
        logger.error('Message box not found');
        return false;
      }
      
      // Type message
      await messageBox.click();
      await this.page.keyboard.type(text);
      await this.page.waitForTimeout(500);
      
      // Send (Enter key)
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(1000);
      
      logger.success('Message sent');
      return true;
      
    } catch (error) {
      logger.error('Failed to send message', error as Error);
      return false;
    }
  }
  
  private randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    logger.info(`Waiting ${delay}ms...`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  async sendReminder(phone: string, name: string, message: string): Promise<SendResult> {
    try {
      const found = await this.findChat(phone);
      
      if (!found) {
        return {
          person: name,
          status: 'chat_not_found'
        };
      }
      
      const sent = await this.sendMessage(message);
      
      if (!sent) {
        return {
          person: name,
          status: 'error',
          error: 'Failed to send message'
        };
      }
      
      // Random delay before next message
      await this.randomDelay(
        config.delays.betweenMessages.min,
        config.delays.betweenMessages.max
      );
      
      return {
        person: name,
        status: 'success'
      };
      
    } catch (error) {
      logger.error(`Error sending to ${name}`, error as Error);
      return {
        person: name,
        status: 'error',
        error: (error as Error).message
      };
    }
  }
  
  async sendToSelf(message: string) {
    try {
      // Navigate to "Me" chat (your own number)
      // This is a special chat in WhatsApp
      const searchBox = await this.page?.waitForSelector('[data-testid="chat-list-search"]');
      await searchBox?.click();
      await this.page?.keyboard.type('Me');
      await this.page?.waitForTimeout(2000);
      
      // Click on first result (should be "Me")
      const firstResult = await this.page?.$('[data-testid="cell-frame-title"]');
      if (firstResult) {
        await firstResult.click();
        await this.page?.waitForTimeout(1000);
        await this.sendMessage(message);
        logger.success('Summary sent to self');
      }
      
      // Clear search
      await this.page?.keyboard.press('Escape');
      
    } catch (error) {
      logger.error('Failed to send summary to self', error as Error);
    }
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info('WhatsApp browser closed');
    }
  }
}

export const whatsappService = new WhatsAppService();
```

**Test** (careful - will actually send!):
```typescript
// In index.ts
import { whatsappService } from './whatsapp';

async function testWhatsApp() {
  await whatsappService.initialize();
  // Test with a known contact
  // await whatsappService.sendToSelf('Test message from kinder-bell');
  await whatsappService.close();
}

testWhatsApp();
```

**Checkpoint**: 
- WhatsApp Web opens
- Can scan QR code (first time)
- Session persists (no QR on subsequent runs)
- Can send messages ✓

---

### Phase 4: Main Orchestration

#### Task 4.1: Main Entry Point
**File**: `src/index.ts`

```typescript
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
```

**Checkpoint**: Full system works end-to-end ✓

---

## 🧪 Testing Plan

### Test 1: Manual Test Event
1. Create test event in Google Calendar:
   ```
   Title: 🔔 Test Reminder
   Date: Tomorrow, 3:00 PM
   Description:
   [Your Name]
   ```

2. Make sure you have your contact in `contacts.json`

3. Run:
   ```bash
   npm start
   ```

4. Verify:
   - ✓ Calendar event is fetched
   - ✓ Event is parsed correctly
   - ✓ WhatsApp opens
   - ✓ Message is sent to you
   - ✓ Summary is sent to self
   - ✓ State is updated
   - ✓ Second run doesn't send again

### Test 2: Multiple People
Create event with multiple people in description and verify all get messages.

### Test 3: Missing Contact
Add person to event who is not in contacts.json and verify graceful handling.

### Test 4: No Events
Run when there are no events tomorrow and verify clean exit.

---

## 📅 Windows Task Scheduler Setup

### Create Scheduled Task

1. Open Task Scheduler (`taskschd.msc`)

2. Create New Task:
   - **General Tab**:
     - Name: kinder-bell
     - Description: WhatsApp reminder system
     - Run whether user is logged on or not: NO (needs visible browser)
     - Run with highest privileges: YES
   
   - **Triggers Tab**:
     - New Trigger
     - Begin: On a schedule
     - Daily, at 6:00 PM
     - Enabled: YES
   
   - **Actions Tab**:
     - Action: Start a program
     - Program: `C:\Program Files\nodejs\node.exe`
     - Arguments: `C:\path\to\kinder-bell\dist\index.js`
     - Start in: `C:\path\to\kinder-bell`
   
   - **Conditions Tab**:
     - Uncheck "Start only if computer is on AC power"
     - Check "Wake computer to run"
   
   - **Settings Tab**:
     - Allow task to run on demand: YES
     - If task fails, restart every: 5 minutes (up to 3 times)

3. Test by right-clicking → Run

---

## 🚀 Deployment Checklist

- [ ] Node.js installed
- [ ] Project cloned/created
- [ ] Dependencies installed (`npm install`)
- [ ] Google Calendar credentials obtained
- [ ] First authorization completed (token.json created)
- [ ] Contacts added to contacts.json
- [ ] WhatsApp Web authorized (QR scanned, session saved)
- [ ] Test event created and tested
- [ ] Task Scheduler configured
- [ ] Manual run successful
- [ ] Scheduled run successful

---

## 🔮 Future Enhancements

### Version 1.1
- [ ] Message templates (customizable per person/type)
- [ ] Support multiple calendars
- [ ] Simple web UI for managing contacts
- [ ] Email backup notifications
- [ ] Statistics dashboard

### Version 2.0
- [ ] Cloud deployment (VPS)
- [ ] Headless mode
- [ ] Multi-user support
- [ ] Mobile app for management

---

## 📞 Troubleshooting

### WhatsApp disconnects
- Check if phone has internet
- Try rescanning QR code
- Check session folder permissions

### Calendar not fetching
- Verify credentials.json is correct
- Delete token.json and re-authorize
- Check Calendar API is enabled

### Messages not sending
- Verify contact phone format (972...)
- Check if chat exists in WhatsApp
- Ensure not in airplane mode

### State not saving
- Check file permissions
- Verify data/ directory exists
- Check disk space

---

## 🎓 Key Learnings for Claude Code

### Architecture Decisions
1. **Separation of concerns** - each module has one job
2. **Fail-safe defaults** - better to skip than to spam
3. **Idempotent operations** - safe to run multiple times
4. **Observable behavior** - logs everything important
5. **Simple data structures** - JSON files, no database

### Risk Mitigation
1. Random delays between messages
2. Time window restrictions
3. Existing chats only
4. Duplicate prevention via state
5. Manual override option

### Development Tips
1. Test with yourself first
2. Use visible browser during development
3. Keep logs detailed
4. Make reverting easy (state.json)
5. Plan for failures

---

## ✅ Ready to Build!

You now have everything needed to build kinder-bell with Claude Code:

1. Complete architecture
2. File-by-file implementation guide
3. Testing strategy
4. Deployment instructions
5. Troubleshooting guide

**Next Steps**:
1. Set up the project structure
2. Implement phase by phase
3. Test each phase before moving on
4. Deploy and monitor

Good luck! 🔔
