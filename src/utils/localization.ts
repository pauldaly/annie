/**
 * Annie Localization System - AI-First Approach
 * Uses data-attributes for easy AI generation and visual builder compatibility
 */

export interface LocaleConfig {
  locale: string;
  currency: string;
  dateFormat?: Intl.DateTimeFormatOptions;
  numberFormat?: Intl.NumberFormatOptions;
}

export class Localization {
  private currentLocale: string = 'en-US';
  private messages: Map<string, Map<string, string>> = new Map();
  
  constructor() {
    this.currentLocale = navigator.language || 'en-US';
  }

  /**
   * Process all elements with data-annie-i18n attributes
   * AI-friendly: <div data-annie-i18n="welcome.message">Hello</div>
   */
  processI18nElements(): void {
    // Text content localization
    document.querySelectorAll('[data-annie-i18n]').forEach(element => {
      const key = element.getAttribute('data-annie-i18n');
      if (key) {
        const localized = this.getMessage(key, element.textContent || '');
        element.textContent = localized;
      }
    });

    // Format numbers: data-annie-format="number" data-annie-value="1234.56"
    document.querySelectorAll('[data-annie-format="number"]').forEach(element => {
      const value = element.getAttribute('data-annie-value');
      if (value) {
        const formatted = this.formatNumber(parseFloat(value));
        element.textContent = formatted;
      }
    });

    // Format currency: data-annie-format="currency" data-annie-value="29.99" data-annie-currency="USD"
    document.querySelectorAll('[data-annie-format="currency"]').forEach(element => {
      const value = element.getAttribute('data-annie-value');
      const currency = element.getAttribute('data-annie-currency') || 'USD';
      if (value) {
        const formatted = this.formatCurrency(parseFloat(value), currency);
        element.textContent = formatted;
      }
    });

    // Format dates: data-annie-format="date" data-annie-value="2025-10-02T10:30:00Z"
    document.querySelectorAll('[data-annie-format="date"]').forEach(element => {
      const value = element.getAttribute('data-annie-value');
      if (value) {
        const formatted = this.formatDate(new Date(value));
        element.textContent = formatted;
      }
    });
  }

  /**
   * Load locale messages (BoltAPI compatible)
   */
  loadMessages(locale: string, messages: Record<string, string>): void {
    if (!this.messages.has(locale)) {
      this.messages.set(locale, new Map());
    }
    
    const localeMap = this.messages.get(locale)!;
    Object.entries(messages).forEach(([key, value]) => {
      localeMap.set(key, value);
    });
  }

  /**
   * Get localized message with fallback
   */
  getMessage(key: string, fallback: string = key): string {
    const localeMap = this.messages.get(this.currentLocale);
    return localeMap?.get(key) || fallback;
  }

  /**
   * Set current locale and reprocess elements
   */
  setLocale(locale: string): void {
    this.currentLocale = locale;
    this.processI18nElements();
  }

  /**
   * Format number using current locale
   */
  formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
    return new Intl.NumberFormat(this.currentLocale, options).format(value);
  }

  /**
   * Format currency using current locale
   */
  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat(this.currentLocale, { 
      style: 'currency', 
      currency 
    }).format(value);
  }

  /**
   * Format date using current locale
   */
  formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
    return new Intl.DateTimeFormat(this.currentLocale, options).format(date);
  }

  /**
   * Get text direction for current locale
   */
  getTextDirection(): 'ltr' | 'rtl' {
    const rtlLocales = ['ar', 'he', 'fa', 'ur'];
    return rtlLocales.some(rtl => this.currentLocale.startsWith(rtl)) ? 'rtl' : 'ltr';
  }

  /**
   * Apply text direction to document
   */
  applyTextDirection(): void {
    document.documentElement.dir = this.getTextDirection();
  }
}

/**
 * Global instance for easy access
 */
export const localization = new Localization();

/**
 * Initialize localization system with DOM watching
 */
export function initializeLocalization(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      localization.processI18nElements();
      localization.applyTextDirection();
    });
  } else {
    localization.processI18nElements();
    localization.applyTextDirection();
  }

  // Watch for dynamically added elements
  const observer = new MutationObserver(() => {
    localization.processI18nElements();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-annie-i18n', 'data-annie-format', 'data-annie-value']
  });
}