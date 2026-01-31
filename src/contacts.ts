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

  // Find contact by name (exact match first, then case-insensitive)
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

  // Get all contacts
  getAll(): Contact[] {
    return [...this.contacts];
  }
}

// Export singleton instance
export const contactManager = new ContactManager();
