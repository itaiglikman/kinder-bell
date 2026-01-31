# Architectural Decision Records (ADR)

This document tracks major architectural and technical decisions made during the development of kinder-bell.

---

## ADR-001: Use WhatsApp Web Automation Instead of API

**Date:** 2025-01-31 (Pre-project planning)
**Status:** Accepted
**Deciders:** Project plan

### Context
Need to send WhatsApp messages automatically for reminders. Two main approaches:
1. WhatsApp Business API (official)
2. WhatsApp Web automation (unofficial)

### Decision
Use WhatsApp Web automation via Playwright.

### Reasoning
- **Cost:** WhatsApp Business API requires paid service/subscription
- **Personal Use:** Project is for personal use only, not commercial
- **Risk Tolerance:** Low frequency usage (1-3 messages/week) means low ban risk
- **Simplicity:** No business verification process required

### Consequences
**Positive:**
- Zero cost solution
- Quick to implement
- Full control over message formatting
- Works with personal WhatsApp account

**Negative:**
- Potential for WhatsApp number blocking (mitigated by low frequency, random delays)
- Requires visible browser (not headless for reliability)
- May break if WhatsApp Web UI changes
- Requires user to be logged in (can't run as system service)

**Mitigations:**
- Random delays between messages (2-8 seconds)
- Time window restrictions (18:40-19:20)
- Only send to existing conversations
- Human-like message templates
- Low frequency usage pattern

---

## ADR-002: Use TypeScript with Strict Mode

**Date:** 2025-01-31 (Pre-project planning)
**Status:** Accepted

### Context
Need to choose between JavaScript and TypeScript for implementation.

### Decision
Use TypeScript with strict mode enabled.

### Reasoning
- **Type Safety:** Calendar API, Playwright, and file I/O benefit from type checking
- **Error Prevention:** Catch type errors at compile time, not runtime
- **IDE Support:** Better autocomplete and refactoring
- **Maintainability:** Self-documenting code with interfaces

### Consequences
**Positive:**
- Fewer runtime errors
- Better developer experience
- Easier to maintain and modify
- Clear contracts between modules

**Negative:**
- Slight learning curve
- Build step required (not direct execution)
- More verbose than JavaScript

---

## ADR-003: JSON Files for Data Storage (Not Database)

**Date:** 2025-01-31 (Pre-project planning)
**Status:** Accepted

### Context
Need to store contacts and sent reminder state. Options:
1. JSON files
2. SQLite database
3. Cloud database

### Decision
Use simple JSON files for contacts.json and state.json.

### Reasoning
- **Simplicity:** No database setup required
- **Scale:** Low data volume (dozens of contacts, hundreds of reminders/year)
- **Portability:** Easy to backup, edit, and migrate
- **Transparency:** Human-readable and editable
- **No Dependencies:** No additional libraries needed

### Consequences
**Positive:**
- Zero setup time
- Easy manual editing
- Version control friendly
- No database maintenance

**Negative:**
- Not suitable for concurrent access (not needed)
- No query capabilities (not needed)
- Limited to small datasets (acceptable for use case)

---

## ADR-004: Persistent Browser Context for Session Management

**Date:** 2025-01-31 (Pre-project planning)
**Status:** Accepted

### Context
WhatsApp Web requires authentication. Options:
1. Regular browser context (scan QR every run)
2. Persistent browser context (save session)
3. Manual session cookie management

### Decision
Use Playwright's launchPersistentContext with userDataDir.

### Reasoning
- **User Experience:** Only scan QR code once
- **Reliability:** Browser handles session management
- **Simplicity:** Built-in Playwright feature
- **Maintenance:** Session automatically refreshed by browser

### Consequences
**Positive:**
- No QR scan needed after first run
- Browser manages cookies and local storage
- More reliable than manual session management

**Negative:**
- Requires writable data directory
- Session folder must be backed up if moving computers
- Cannot run multiple instances simultaneously (locks user data dir)

---

## ADR-005: Time Window Enforcement with Manual Override

**Date:** 2025-01-31 (Pre-project planning)
**Status:** Accepted

### Context
Messages should be sent in evening (18:40-19:20) but need testing flexibility.

### Decision
Implement time window check but make it easy to override via code comment for testing.

### Reasoning
- **Safety:** Prevents accidental sends at wrong time
- **Flexibility:** Can test outside window during development
- **Simplicity:** Simple if statement with clear comment for override

### Implementation
```typescript
if (!await isWithinTimeWindow()) {
  logger.warning('Not within time window');
  // Comment this out for manual testing:
  // return;
}
```

### Consequences
**Positive:**
- Safe by default
- Easy to test
- Clear intent in code

**Negative:**
- Manual code change needed for testing (acceptable trade-off)

---

## ADR-006: Idempotent Operations via State Tracking

**Date:** 2025-01-31 (Pre-project planning)
**Status:** Accepted

### Context
Script may run multiple times per day (manual runs, testing, Task Scheduler retries).

### Decision
Track sent reminders by calendar event ID in state.json. Never send same event twice.

### Reasoning
- **Safety:** Critical to avoid spamming recipients
- **Reliability:** Safe to run script multiple times
- **Simplicity:** Simple event ID check

### Consequences
**Positive:**
- Idempotent operations (safe to retry)
- No duplicate messages
- Clear audit trail of sent messages

**Negative:**
- State file must be preserved between runs
- Need manual state.json edit to resend after error

---

<!-- Future ADRs will be added below -->
