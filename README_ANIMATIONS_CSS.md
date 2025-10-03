# Annie Framework - Animation CSS Distribution Guide

## 🎨 Animation CSS Files

The Annie Framework animation system requires CSS files to be included alongside the JavaScript framework. Here's how to properly distribute and include them:

## 📦 Distribution Files

When you build Annie Framework, the following files are created in the `dist/` folder:

```
dist/
├── annie.esm.js          # ES Module build
├── annie.umd.js          # UMD build (recommended)
├── annie.umd.min.js      # Minified UMD build
├── annie-animations.css  # Animation CSS (automatically copied)
└── types/               # TypeScript definitions
```

## 🔧 CSS Inclusion Options

### Option 1: Automatic CSS Injection (Default)

The animation system automatically injects the CSS when initialized:

```html
<!DOCTYPE html>
<html>
<head>
    <script src="dist/annie.umd.js"></script>
</head>
<body>
    <script>
        // CSS will be automatically loaded from dist/annie-animations.css
        const annie = new Annie.AnnieFramework({
            enableAnimations: true  // CSS auto-injected
        });
        annie.initialize();
    </script>
</body>
</html>
```

### Option 2: Manual CSS Inclusion

For better control or faster loading, include CSS manually:

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Include CSS manually -->
    <link rel="stylesheet" href="dist/annie-animations.css">
    <script src="dist/annie.umd.js"></script>
</head>
<body>
    <script>
        // Disable auto CSS injection since it's already included
        const annie = new Annie.AnnieFramework({
            enableAnimations: true,
            animationConfig: {
                autoInjectCSS: false  // Don't auto-inject since we included manually
            }
        });
        annie.initialize();
    </script>
</body>
</html>
```

### Option 3: Custom CSS Path

If you need to serve CSS from a different location:

```html
<script>
    const annie = new Annie.AnnieFramework({
        enableAnimations: true,
        animationConfig: {
            cssPath: '/assets/css/annie-animations.css'  // Custom path
        }
    });
    annie.initialize();
</script>
```

### Option 4: CDN Distribution

For CDN usage, both files should be available:

```html
<!-- Example CDN usage -->
<link rel="stylesheet" href="https://cdn.example.com/annie/1.0.0/annie-animations.css">
<script src="https://cdn.example.com/annie/1.0.0/annie.umd.min.js"></script>
<script>
    const annie = new Annie.AnnieFramework({
        enableAnimations: true,
        animationConfig: {
            autoInjectCSS: false  // CSS already loaded
        }
    });
</script>
```

## 🚀 Build Process

The CSS is automatically copied during the build process:

```bash
# Build Annie Framework
npm run build

# The rollup config automatically:
# 1. Compiles TypeScript to JavaScript
# 2. Copies src/styles/annie-animations.css to dist/annie-animations.css
# 3. Creates all distribution files
```

## 📁 File Structure for Distribution

When distributing Annie Framework, include both files:

```
your-project/
├── assets/
│   ├── annie.umd.min.js       # Main JavaScript file
│   └── annie-animations.css   # Required CSS file
└── index.html
```

## 🎯 CSS Path Detection

The animation system intelligently detects the correct CSS path:

### Development Mode Detection:
- Checks for `/src/` in script sources
- Uses `/src/styles/annie-animations.css`

### Production Mode Fallback:
- Primary: `/dist/annie-animations.css`
- Fallbacks: `./annie-animations.css`, `/annie-animations.css`, etc.

## ⚙️ Configuration Options

```typescript
interface AnimationConfig {
    enableAnimations: boolean;        // Enable/disable animations
    autoInjectCSS?: boolean;         // Auto-inject CSS (default: true)
    cssPath?: string;                // Custom CSS path
    respectReducedMotion: boolean;   // Respect accessibility settings
    defaultDuration: string;         // Default animation duration
    defaultEasing: string;           // Default easing function
}
```

## 🔍 Troubleshooting

### CSS Not Loading

**Problem:** Animations not working, no styles applied

**Solutions:**
1. Check browser network tab for 404 errors
2. Verify CSS file is in the correct location
3. Use custom `cssPath` if using non-standard structure
4. Manually include CSS in `<head>` and set `autoInjectCSS: false`

### Path Issues

**Problem:** CSS loading from wrong path

**Solutions:**
```javascript
// Solution 1: Specify exact path
const annie = new Annie.AnnieFramework({
    animationConfig: {
        cssPath: '/your/custom/path/annie-animations.css'
    }
});

// Solution 2: Disable auto-inject and include manually
const annie = new Annie.AnnieFramework({
    animationConfig: {
        autoInjectCSS: false
    }
});
```

### CDN/External Hosting

**Problem:** Serving from external domain

**Solutions:**
```javascript
// For external CDN
const annie = new Annie.AnnieFramework({
    animationConfig: {
        cssPath: 'https://cdn.yoursite.com/annie-animations.css'
    }
});
```

## 📝 Best Practices

1. **Include CSS first** for better loading performance
2. **Use minified versions** in production
3. **Set proper cache headers** for CSS files
4. **Test without JavaScript** to ensure CSS loads independently
5. **Use relative paths** when possible for portability

## 🎨 Custom Animations

You can extend the default CSS with your own animations:

```css
/* Your custom animations */
@keyframes my-custom-animation {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

.annie-animate-custom {
    animation: my-custom-animation var(--annie-duration, 300ms) var(--annie-easing, ease);
}
```

```html
<!-- Use custom animation -->
<div data-annie-animate="custom" data-annie-duration="600ms">
    Custom animated element
</div>
```

## Summary

The Annie Framework animation system requires both JavaScript and CSS files. The system provides flexible options for CSS inclusion while maintaining ease of use through intelligent path detection and automatic injection capabilities.