# kinder-bell 🔔

Personal WhatsApp reminder system for kindergarten meeting coordination.

## Overview

**kinder-bell** automatically sends WhatsApp reminder messages the evening before scheduled meetings to parents and staff, helping reduce missed appointments.

### How It Works

1. **Calendar Detection**: Scans Google Calendar for events with 🔔 emoji in the title
2. **People Extraction**: Reads recipient names from event description (one per line)
3. **Smart Timing**: Sends reminders in the evening (18:40-19:20 window)
4. **Human-like**: Random delays and natural messages to avoid detection
5. **Tracking**: Prevents duplicate sends with state management

## Quick Start

### Prerequisites

- Node.js v18+ ([download](https://nodejs.org/))
- Google Calendar account
- WhatsApp account with Web access

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Setup

1. **Google Calendar API**
   - Follow instructions in `credentials/README.md`
   - Place `credentials.json` in `credentials/` directory

2. **Contacts**
   - Copy `data/contacts.json.template` to `data/contacts.json`
   - Add your contacts with names and phone numbers

3. **First Run**
   - Run `npm start`
   - Authorize Google Calendar (one-time)
   - Scan WhatsApp Web QR code (one-time)

### Usage

```bash
# Run manually
npm start

# Build TypeScript
npm run build

# Development mode
npm run dev
```

### Creating Reminder Events

In Google Calendar, create an event:
- **Title**: `🔔 Meeting with Dana's parent`
- **Date/Time**: Tomorrow, 3:00 PM
- **Description**:
  ```
  Dana Levi
  Yael Cohen
  Ronit Shamir
  ```

Each person on a separate line will receive a reminder.

## Project Structure

```
kinder-bell/
├── src/              # TypeScript source files
├── data/             # JSON data files (contacts, state)
├── credentials/      # Google OAuth credentials (gitignored)
├── docs/             # Documentation and logs
├── package.json      # Dependencies
├── tsconfig.json     # TypeScript config
└── README.md         # This file
```

## Configuration

All settings are in `src/config.ts`:
- Time window (default: 18:40-19:20)
- Random delays between messages
- Message templates
- File paths

## Documentation

- `docs/DEVELOPMENT_LOG.md` - Development progress and decisions
- `docs/DECISIONS.md` - Architectural decision records
- `docs/TESTING.md` - Testing logs and results
- `CLAUDE.md` - Guidance for Claude Code

## Safety Features

- **Existing chats only**: Never opens new conversations
- **Duplicate prevention**: Tracks sent reminders in `state.json`
- **Time window**: Only sends within configured hours
- **Random delays**: 2-8 seconds between messages
- **Low frequency**: Designed for minimal usage
- **Error handling**: Continues on failures, logs everything

## Windows Task Scheduler

To run automatically every evening:

1. Open Task Scheduler
2. Create new task
3. Trigger: Daily at 6:00 PM
4. Action: Start program
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `C:\path\to\kinder-bell\dist\index.js`
   - Start in: `C:\path\to\kinder-bell`

## Troubleshooting

**WhatsApp disconnects:**
- Check phone has internet connection
- Rescan QR code
- Delete `data/whatsapp-session/` and restart

**Calendar not fetching:**
- Delete `credentials/token.json` and re-authorize
- Verify Calendar API is enabled in Google Cloud Console

**Messages not sending:**
- Verify phone number format: `972501234567`
- Ensure WhatsApp chat exists (send manual message first)
- Check WhatsApp Web selectors haven't changed

## License

Personal use only. Not for commercial distribution.

## Development Status

See `docs/DEVELOPMENT_LOG.md` for current progress and implementation status.
