# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**kinder-bell** is a personal WhatsApp reminder system for a kindergarten social worker. It automatically sends WhatsApp reminders the evening before scheduled meetings by:
1. Detecting Google Calendar events with 🔔 emoji in the title
2. Parsing recipient names from the event description (one per line)
3. Sending human-like reminders via WhatsApp Web automation (Playwright)
4. Tracking sent reminders to prevent duplicates

**Key Constraints:**
- Personal use only (not commercial)
- WhatsApp Web automation via Playwright (no paid API)
- Existing conversations only (never opens new chats)
- Must appear human-generated (random delays, natural timing)
- Low frequency usage (parents ~1/month, staff 1-3/week)

## Working Guidelines for Claude Code

### CRITICAL: Development Workflow Rules

1. **Use Agents and Sub-Agents Extensively**
   - **Explore agents** for codebase exploration and understanding existing patterns
   - **Plan agents** for designing implementation approaches
   - **General-purpose agents** for complex multi-step tasks
   - Launch agents **in parallel** when tasks are independent
   - Use agents proactively - don't do manual searches when agents can be more efficient
   - Example: Use Explore agent instead of manual Glob/Grep for understanding code structure

2. **Full Search Permissions**
   - You have complete permission to search files and web
   - Use Glob, Grep, Read tools freely without asking for permission
   - Search documentation online (Context7, web search) as needed
   - No restrictions on file access or web searches

3. **Mandatory Documentation Updates**
   - **REQUIRED:** Update relevant docs after EVERY task/step accomplished
   - **REQUIRED:** Document EVERY decision or pivot immediately
   - Update `docs/DEVELOPMENT_LOG.md` after each work session
   - Update `docs/DECISIONS.md` when making architectural choices
   - Update `docs/TESTING.md` after running any tests
   - Update progress checklist in DEVELOPMENT_LOG.md when completing tasks
   - Add inline code comments for significant decisions (use DECISION, REASONING, USER PREFERENCE tags)

   **When to Update:**
   - ✅ After completing any task/checkpoint
   - ✅ After making any architectural decision
   - ✅ After encountering and resolving any issue
   - ✅ After any testing (pass or fail)
   - ✅ After any user-requested change or preference
   - ✅ When deviating from the original plan
   - ✅ At end of each work session

   **Never Skip Documentation:**
   - Even small changes should be logged
   - "I'll document it later" = "It won't be documented"
   - Documentation is not optional - it's part of the task

4. **Test First, Then Commit**
   - **REQUIRED:** Always test before making commits
   - **Workflow:** Implement → Test → Fix Issues → Test Again → Commit
   - Never commit untested code
   - If tests fail, fix and retest before committing
   - Document test results in TESTING.md before commit
   - **USER PREFERENCE:** "first test, then commit"

## Project Structure

```
src/
├── index.ts        # Main orchestration logic
├── calendar.ts     # Google Calendar API integration (OAuth2)
├── contacts.ts     # Contact management (name → phone mapping)
├── whatsapp.ts     # Playwright-based WhatsApp Web automation
├── state.ts        # Sent reminders tracking (prevents duplicates)
├── logger.ts       # Console + file logging
├── config.ts       # Configuration (time windows, delays, messages)
└── types.ts        # TypeScript interfaces

data/
├── contacts.json   # Contact list (name, phone, type)
├── state.json      # Sent reminders history
└── logs/app.log    # Application logs

credentials/
├── credentials.json # Google OAuth client credentials (gitignored)
└── token.json       # Google OAuth token (gitignored)
```

## Common Commands

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install chromium

# Run the application
npm start

# Build TypeScript
npm run build

# Development mode
npm run dev
```

## Architecture Notes

### Calendar Event Detection
- Events must have 🔔 emoji in title to be processed
- Event description contains recipient names (one per line)
- Checks tomorrow's events only (configurable via `config.calendar.daysAhead`)

### WhatsApp Automation
- Uses Playwright with persistent browser context (maintains session)
- Session stored in `data/whatsapp-session/` directory
- First run requires QR code scan
- Only sends to existing conversations (safety measure)
- Random delays (2-8 seconds) between messages for human-like behavior
- Always sends summary to self after each event

### State Management
- `state.json` tracks all sent reminders by event ID
- Prevents duplicate sends if script runs multiple times
- Idempotent: safe to run repeatedly

### Time Window Enforcement
- Default: 18:40-19:20 (configurable in `config.ts`)
- Can be overridden by commenting out check in `index.ts` for manual testing

### Contact Matching
- Exact name match first, then case-insensitive fallback
- If contact not found, marks as `contact_not_found` in results
- If WhatsApp chat not found, marks as `chat_not_found` in results

## Configuration

All configuration is centralized in `src/config.ts`:
- Time window for sending
- Random delay ranges
- WhatsApp Web URL and timeouts
- File paths
- Message templates (Hebrew)

Message templates support:
- `config.messages.reminder(eventTitle, eventTime)` - Reminder message
- `config.messages.summary(eventTitle, results, time)` - Summary report

## Testing Strategy

### Manual Test (Recommended First)
1. Create calendar event for tomorrow:
   ```
   Title: 🔔 Test Reminder
   Description: [Your Name]
   ```
2. Add yourself to `data/contacts.json`
3. Run `npm start`
4. Verify message received and summary sent to self

### Test Scenarios
- Multiple recipients in one event
- Missing contact (not in contacts.json)
- Non-existent WhatsApp chat
- No events tomorrow
- Already-sent event (run twice)

## Google Calendar API Setup

Required before first run:
1. Create Google Cloud Project
2. Enable Google Calendar API
3. Create OAuth 2.0 Desktop App credentials
4. Download `credentials.json` → save to `credentials/credentials.json`
5. First run will prompt for authorization code
6. Token saved to `credentials/token.json` for future runs

## Windows Task Scheduler Deployment

Runs daily at 6:00 PM:
- Program: `C:\Program Files\nodejs\node.exe`
- Arguments: `C:\path\to\kinder-bell\dist\index.js`
- Start in: `C:\path\to\kinder-bell`
- Must run when user is logged in (needs visible browser)
- Enable "Wake computer to run"

## Data File Formats

### contacts.json
```json
{
  "contacts": [
    {
      "name": "Dana Levi",
      "phone": "972501234567",
      "type": "parent"
    }
  ]
}
```

### state.json
```json
{
  "sent_reminders": [
    {
      "event_id": "abc123",
      "event_title": "🔔 Meeting",
      "sent_at": "2025-01-31T18:45:00.000Z",
      "recipients": [
        {
          "person": "Dana Levi",
          "status": "success"
        }
      ]
    }
  ]
}
```

## Important Implementation Details

### WhatsApp Selectors (Playwright)
- Search box: `[data-testid="chat-list-search"]`
- Chat result: `[data-testid="cell-frame-title"]`
- Message input: `[data-testid="conversation-compose-box-input"]`
- QR code: `canvas[aria-label="Scan me!"]`
- Chat list: `[data-testid="chat-list"]`

These selectors may break if WhatsApp Web updates its UI.

### Error Handling Philosophy
- Log all errors but continue processing other recipients
- Send error notification to self via WhatsApp if fatal error
- Better to do nothing than to make mistakes (fail-safe)
- Always close browser in finally block

### Security Considerations
- Never commit `credentials.json` or `token.json` (gitignored)
- `contacts.json` contains phone numbers (consider gitignoring if shared repo)
- `state.json` contains event details (consider gitignoring if shared repo)
- WhatsApp session data contains authentication (never commit)

## Troubleshooting

**WhatsApp disconnects:** Check phone internet, rescan QR code, verify session folder permissions

**Calendar not fetching:** Delete `token.json` and re-authorize, verify Calendar API enabled

**Messages not sending:** Verify phone format (972...), ensure chat exists in WhatsApp, check selectors still valid

**State not saving:** Check file permissions, verify `data/` directory exists

## Documentation and Progress Tracking

### REQUIRED: Maintain Live Action Log

**CRITICAL:** Maintain a real-time action log in `docs/ACTION_LOG.md` that tracks EVERY action as it happens.

**Purpose:** Allows user to monitor autonomous work without interrupting the flow.

**Update Frequency:** Before and after EVERY significant action

**What to Log:**
- File operations (Read, Write, Edit) with file paths
- Bash commands being executed
- Agent launches and their purposes
- Current status and progress indicators
- Any errors or issues encountered
- Next planned action

**Format:**
```markdown
#### [Status Icon] Action Description
- **Action:** [Read/Write/Edit/Bash/Agent]
- **Path/Command:** [file path or command]
- **Details:** [what and why]
- **Status:** [Complete/In Progress/Failed]
```

**Example Entry:**
```markdown
#### ✅ Created types.ts
- **Action:** Write file
- **Path:** `src/types.ts`
- **Details:** Added all TypeScript interfaces (CalendarEvent, ReminderEvent, Contact, etc.)
- **Status:** Complete

#### 🔄 Installing dependencies
- **Action:** Bash command
- **Command:** `npm install`
- **Status:** In Progress
```

**Status Icons:**
- ✅ Complete
- 🔄 In Progress
- ❌ Failed
- ⏸️ Paused/Waiting
- 📝 Planning

### REQUIRED: Maintain Development Log

**CRITICAL:** Throughout development, maintain a comprehensive log in `docs/DEVELOPMENT_LOG.md` documenting:

1. **Progress Tracking**
   - Checkpoint completion status
   - Feature implementation progress
   - Testing results for each phase

2. **Decision Making**
   - Why specific approaches were chosen
   - Alternatives considered and rejected (with reasoning)
   - Trade-offs and their justifications
   - API/library version choices

3. **User Preferences**
   - User-specified requirements or changes
   - Custom configurations requested
   - Deviations from original plan (with approval)

4. **Issues and Resolutions**
   - Problems encountered during implementation
   - Solutions applied
   - Workarounds for bugs or limitations
   - Breaking changes in dependencies

5. **Testing Notes**
   - What was tested and when
   - Test results (success/failure)
   - Edge cases discovered
   - Performance observations

### Log Entry Format

Each log entry should follow this structure:

```markdown
## [YYYY-MM-DD HH:MM] - Entry Title

**Phase:** [Phase 1/2/3/4]
**Component:** [e.g., calendar.ts, whatsapp.ts]
**Status:** [In Progress / Completed / Blocked / Testing]

### What Changed
- Bullet points describing the work done

### Decisions Made
- **Decision:** [Description]
- **Reasoning:** [Why this approach]
- **Alternatives Considered:** [Other options]
- **User Preference:** [If applicable]

### Testing
- Test performed: [Description]
- Result: [Pass/Fail/Partial]
- Issues found: [If any]

### Next Steps
- What needs to be done next

---
```

### Documentation Commands

```bash
# View current progress
cat docs/DEVELOPMENT_LOG.md

# View decisions only
grep -A 10 "### Decisions Made" docs/DEVELOPMENT_LOG.md

# View testing history
grep -A 5 "### Testing" docs/DEVELOPMENT_LOG.md
```

### When to Log

**Always log when:**
- Starting a new phase
- Completing a checkpoint
- Making an architectural decision
- Encountering and resolving an error
- Deviating from the original plan
- User requests a specific approach
- Completing any test
- Changing configuration values
- Discovering a breaking change or limitation

### Additional Documentation Files

Create these files in `docs/` as needed:

- `DECISIONS.md` - Major architectural decisions (ADR style)
- `TESTING.md` - Comprehensive testing log and results
- `TROUBLESHOOTING.md` - Issues encountered and solutions
- `CONFIGURATION.md` - Configuration options and preferences
- `DEPLOYMENT_NOTES.md` - Deployment steps and gotchas

### Example First Log Entry

```markdown
## [2025-01-31 14:00] - Project Initialization

**Phase:** Setup
**Component:** Project structure
**Status:** In Progress

### What Changed
- Created project directory structure
- Initialized npm project
- Installed initial dependencies

### Decisions Made
- **Decision:** Use TypeScript with strict mode
- **Reasoning:** Better type safety for API interactions, prevents runtime errors
- **Alternatives Considered:** JavaScript (rejected for lack of type safety)
- **User Preference:** None specified

### Dependencies Installed
- typescript v5.3.3
- @types/node v20.10.0
- playwright v1.40.0
- googleapis v128.0.0
- winston v3.11.0

### Testing
- Verified Node.js installation: v20.10.0
- Verified npm installation: v10.2.3
- Test compilation: Pass

### Next Steps
- Set up TypeScript configuration
- Create basic project structure
- Implement Phase 1: Types and Config

---
```

### Progress Tracking Matrix

Maintain a progress checklist at the top of `DEVELOPMENT_LOG.md`:

```markdown
# Development Progress

## Phase 1: Core Infrastructure
- [ ] Task 1.1: Types & Configuration (types.ts, config.ts)
- [ ] Task 1.2: Logger (logger.ts)
- [ ] Task 1.3: State Management (state.ts)
- [ ] Task 1.4: Contact Management (contacts.ts)

## Phase 2: Google Calendar Integration
- [ ] Task 2.1: Calendar Module (calendar.ts)
- [ ] Task 2.2: OAuth Setup & Testing

## Phase 3: WhatsApp Integration
- [ ] Task 3.1: WhatsApp Module (whatsapp.ts)
- [ ] Task 3.2: Session Management Testing

## Phase 4: Main Orchestration
- [ ] Task 4.1: Main Entry Point (index.ts)
- [ ] Task 4.2: End-to-End Testing

## Deployment
- [ ] Windows Task Scheduler Setup
- [ ] Production Testing
- [ ] Documentation Complete
```

### Code Comment Standards

In code files, document decisions with inline comments:

```typescript
// DECISION [2025-01-31]: Using persistent browser context instead of regular context
// REASONING: Maintains WhatsApp Web session between runs, avoids QR code scan every time
// ALTERNATIVES: Regular context (rejected - would require QR scan every run)
this.browser = await chromium.launchPersistentContext(
  config.whatsapp.userDataDir,
  { headless: false }
);

// USER PREFERENCE [2025-01-31]: Time window set to 18:40-19:20
// User specified this window to avoid dinner time and ensure messages sent before evening activities
timeWindow: {
  start: { hour: 18, minute: 40 },
  end: { hour: 19, minute: 20 }
}
```

### Review and Retrospective

At project completion, add a retrospective section:

```markdown
## Project Retrospective

### What Went Well
- [Successes and smooth implementations]

### What Was Challenging
- [Difficulties and how they were overcome]

### Lessons Learned
- [Key takeaways for future projects]

### Future Improvements
- [Ideas for enhancement]
```
