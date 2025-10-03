# Client Formatting & Localization Utilities

Annie Framework now includes comprehensive client-side formatting and localization utilities that leverage native browser `Intl` APIs for high performance and standards compliance.

## Features

✅ **Number Formatting** - Decimal, currency, percentage, and compact number formats  
✅ **Date & Time Formatting** - Multiple preset formats plus custom options  
✅ **Message Interpolation** - Dynamic template strings with formatting support  
✅ **Locale Detection** - Automatic browser locale detection with fallbacks  
✅ **Typography Helpers** - Text direction, RTL support, and text formatting  
✅ **Unified API** - Single interface for all localization needs  

## Quick Start

```typescript
import { localization } from './annie';

// Number formatting
localization.formatNumber(1234.56);        // "1,234.56"
localization.formatCurrency(1234.56);      // "$1,234.56"
localization.formatPercent(0.1234);        // "12%"

// Date formatting
localization.formatDate(new Date());       // Localized date
localization.formatTime(new Date());       // Localized time
localization.formatRelativeTime(date);     // "5 minutes ago"

// Message interpolation
localization.interpolate("Hello {{name}}, you have {{count | number}} messages", {
    name: "John",
    count: 5
}); // "Hello John, you have 5 messages"

// Typography
localization.getTextDirection();           // "ltr" or "rtl"
localization.isRightToLeft();             // boolean
localization.applyTextDirection(element); // Apply to DOM element
```

## API Reference

### LocalizationUtils (Main Class)

The primary interface for all localization functionality.

#### Constructor
```typescript
new LocalizationUtils(config?: Partial<LocaleConfig>)
```

#### Locale Management
- `getLocale(): string` - Get current locale
- `setLocale(locale: string): void` - Change locale
- `getConfig(): LocaleConfig` - Get full configuration

#### Number Formatting
- `formatNumber(value: number, options?: NumberFormatOptions): string`
- `formatCurrency(value: number, options?: NumberFormatOptions): string`
- `formatPercent(value: number, options?: NumberFormatOptions): string`

#### Date & Time Formatting
- `formatDate(date: Date | string | number, options?: DateFormatOptions): string`
- `formatTime(date: Date | string | number, options?: DateFormatOptions): string`
- `formatRelativeTime(date: Date | string | number, options?: RelativeTimeOptions): string`

#### Message Interpolation
- `interpolate(template: string, values: Record<string, any>, options?: MessageInterpolationOptions): string`

#### Typography Helpers
- `getTextDirection(): 'ltr' | 'rtl'`
- `isRightToLeft(): boolean`
- `applyTextDirection(element: HTMLElement): void`
- `formatText(text: string, options?: TextFormatOptions): string`

### Standalone Components

For specific use cases, individual formatters are also available:

```typescript
import { 
    localeManager, 
    numberFormatter, 
    dateFormatter, 
    messageInterpolator, 
    typographyHelper 
} from './annie';
```

## Configuration

### LocaleConfig Interface
```typescript
interface LocaleConfig {
    locale: string;           // Primary locale (e.g., 'en-US')
    fallbackLocale?: string;  // Fallback locale (default: 'en-US')
    currency?: string;        // Currency code (e.g., 'USD')
    timezone?: string;        // Timezone (e.g., 'America/New_York')
    numberSystem?: string;    // Number system (default: 'latn')
}
```

### Number Format Options
```typescript
interface NumberFormatOptions extends Intl.NumberFormatOptions {
    preset?: 'decimal' | 'currency' | 'percent' | 'compact';
    locale?: string;
}
```

### Date Format Options
```typescript
interface DateFormatOptions extends Intl.DateTimeFormatOptions {
    preset?: 'short' | 'medium' | 'long' | 'full';
    locale?: string;
}
```

## Examples

### E-commerce Product Display
```typescript
const product = {
    name: "Wireless Headphones",
    price: 199.99,
    discount: 0.15,
    stock: 1234,
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000)
};

const template = `{{name}} - {{price | currency}} ({{discount | percent}} off)
Stock: {{stock | number}} units
Last updated {{lastUpdated | relative}}`;

const result = localization.interpolate(template, product);
// "Wireless Headphones - $199.99 (15% off)
//  Stock: 1,234 units
//  Last updated 2 hours ago"
```

### Banking Transaction
```typescript
const transaction = {
    type: "Transfer",
    amount: -1500.50,
    balance: 12345.67,
    date: new Date('2025-10-01T09:30:00'),
    fee: 2.50
};

const template = `{{type}}: {{amount | currency}}
New Balance: {{balance | currency}}
Fee: {{fee | currency}}
Processed: {{date | date}}`;

const result = localization.interpolate(template, transaction);
```

### Multi-language Support
```typescript
// Switch to French locale
localization.setLocale('fr-FR');

localization.formatNumber(1234.56);     // "1 234,56"
localization.formatCurrency(1234.56);  // "1 234,56 €"
localization.formatDate(new Date());   // "2 octobre 2025"

// Switch to Arabic (RTL)
localization.setLocale('ar-SA');
localization.getTextDirection();       // "rtl"
localization.isRightToLeft();         // true
```

### Custom Formatters in Templates
```typescript
const customFormatters = {
    uppercase: (value: string) => value.toUpperCase(),
    fileSize: (bytes: number) => {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }
};

const template = "File: {{filename | uppercase}} ({{size | fileSize}})";
const values = { filename: "document.pdf", size: 1048576 };

const result = localization.interpolate(template, values, { formatters: customFormatters });
// "File: DOCUMENT.PDF (1.0 MB)"
```

## RTL (Right-to-Left) Support

The utilities automatically detect RTL languages and provide appropriate helpers:

```typescript
// Hebrew locale
localization.setLocale('he-IL');

localization.getTextDirection();    // "rtl"
localization.isRightToLeft();      // true

// Apply to DOM element
const element = document.getElementById('content');
localization.applyTextDirection(element);
// Sets element.dir = "rtl" and element.style.textAlign = "right"
```

### Supported RTL Languages
- Arabic (ar)
- Hebrew (he)
- Persian/Farsi (fa)
- Urdu (ur)
- Kurdish (ku)
- Pashto (ps)
- Sindhi (sd)
- Uyghur (ug)
- Yiddish (yi)

## Browser Compatibility

The localization utilities use native browser `Intl` APIs, which are supported in:

- ✅ Chrome 24+
- ✅ Firefox 29+
- ✅ Safari 10+
- ✅ Edge 12+
- ✅ iOS Safari 10+
- ✅ Android Browser 4.4+

For older browsers, consider including the [Intl.js polyfill](https://github.com/andyearnshaw/Intl.js/).

## Performance

- **Lightweight**: ~15KB minified (leverages native browser APIs)
- **Fast**: Built-in formatter caching and reuse
- **Memory efficient**: Minimal memory footprint
- **Standards compliant**: Uses official Unicode CLDR data via browser APIs

## Demo

See `demo-localization.html` for a comprehensive interactive demo showcasing all features across different locales.

## Testing

Comprehensive unit tests are included in `src/testing/localization.test.ts` covering:
- All formatting functions
- Locale detection and switching
- Message interpolation
- Typography helpers
- Edge cases and error handling
- Performance benchmarks

---

*This completes Task #9 from the Annie Framework roadmap: Client Formatting & Localization Utilities.*