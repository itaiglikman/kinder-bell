import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { config } from './config';
import { logger } from './logger';
import { SendResult } from './types';

class WhatsAppService {
  private browser: BrowserContext | null = null;
  private page: Page | null = null;

  // DECISION: Use launchPersistentContext instead of regular launch
  // REASONING: Maintains WhatsApp Web session between runs, avoids QR scan every time
  // ALTERNATIVES: Regular context (rejected - would require QR scan every run)
  async initialize() {
    try {
      logger.info('Launching WhatsApp Web...');

      this.browser = await chromium.launchPersistentContext(
        config.whatsapp.userDataDir,
        {
          headless: false,  // Must be visible for reliability
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
      const chatResult = await this.page.$('[data-testid="cell-frame-title"]');

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

      // Random delay before next message (human-like behavior)
      // DECISION: 2-8 second delays to appear human and avoid spam detection
      // USER PREFERENCE: Must appear natural, not system-generated
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
      // This is a special chat in WhatsApp for notes to yourself
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

// Export singleton instance
export const whatsappService = new WhatsAppService();
