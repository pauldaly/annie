# Annie Chart Usage Guide

Recommendations for which chart implementation to use in your Annie Framework projects.

## ✅ RECOMMENDED: SimpleChart for Most Cases

Use `SimpleChart` for production applications - it's fast, reliable, and covers 90% of use cases.

```javascript
import { SimpleChart } from './charts/simple-chart';

// Basic pie chart
const chart = new SimpleChart({
  type: 'pie',
  width: 400,
  height: 300,
  title: 'Sales Distribution',
  theme: 'light',
  animated: true,
  showLabels: true,
  showTooltip: true
});

chart.render('chart-container', [
  { label: 'Q1 Sales', value: 12000 },
  { label: 'Q2 Sales', value: 15000 },
  { label: 'Q3 Sales', value: 18000 },
  { label: 'Q4 Sales', value: 21000 }
]);
```

## 🔮 FUTURE: Advanced PieChart for Enterprise Features

The `PieChart` class will be available for enterprise applications requiring advanced customization.

```javascript
import { PieChart } from './charts/pie-chart';

const advancedChart = new PieChart({
  type: 'pie',
  width: 500,
  height: 400,
  title: 'Advanced Sales Chart',
  options: {
    innerRadius: 60,           // Donut chart
    explodeOnHover: true,      // Interactive explosion
    labelPosition: 'outside',  // External labels
    cornerRadius: 5,           // Rounded corners
    startAngle: -90,           // Start at top
    sortValues: true,          // Sort by value
    showValues: true,          // Show actual values
    showPercentages: true,     // Show percentages
    labelOffset: 25            // Label distance
  }
});
```

## 🎯 Interactive Charts with Navigation

For charts that need to link to other locations and trigger actions:

```javascript
import { InteractiveSimpleChart } from './charts/interactive-chart';

const interactiveChart = new InteractiveSimpleChart({
  type: 'pie',
  title: 'Regional Sales Performance',
  interactions: {
    global: {
      onClick: {
        navigate: { url: '/reports/{label}' },
        analytics: { event: 'chart_click', category: 'dashboard' }
      }
    },
    hoverEffect: { enabled: true, style: 'explode' },
    clickEffect: { enabled: true, style: 'pulse' }
  }
});

// Data with element-specific interactions
const interactiveData = [
  {
    label: "North America",
    value: 45000,
    onClick: {
      navigate: { url: '/reports/north-america' },
      analytics: { event: 'region_click', category: 'sales' }
    },
    metadata: {
      growth: '+12%',
      manager: 'Alice Johnson'
    }
  }
];

interactiveChart.render('chart-container', interactiveData);
```

## 📋 Annie Declarative Usage

Use Annie's declarative syntax for HTML-based chart definitions:

```html
<!-- Basic chart -->
<div annie-chart="pie"
     annie-data-source="salesData"
     annie-chart-config='{
       "title": "Sales by Region",
       "animated": true,
       "showLabels": true
     }'>
</div>

<!-- Interactive chart with navigation -->
<div annie-chart="pie"
     annie-data-source="salesData"
     annie-chart-config='{
       "title": "Sales by Region",
       "interactions": {
         "global": {
           "onClick": {
             "navigate": {
               "url": "/reports/region/{label}",
               "params": {"value": "{value}"}
             }
           }
         }
       }
     }'>
</div>
```

## 🛠️ When to Use Each Approach

### SimpleChart ✅
- **Use for:** Production applications, standard pie charts, basic interactivity
- **Benefits:** Fast, reliable, small bundle size, covers 90% of use cases
- **Good for:** Dashboards, reports, simple data visualization

### PieChart 🔮
- **Use for:** Enterprise applications requiring advanced customization
- **Benefits:** Full feature set, extensive theming, complex interactions
- **Good for:** Complex dashboards, branded applications, advanced UX

### InteractiveSimpleChart 🎯
- **Use for:** Charts that need navigation, actions, and rich interactions
- **Benefits:** D3.js event handling, Annie integration, action system
- **Good for:** Interactive dashboards, drill-down reports, user workflows

## 📊 Configuration Options

### Basic Configuration
```javascript
{
  type: 'pie',              // Chart type
  width: 400,               // Chart width
  height: 300,              // Chart height
  title: 'Chart Title',     // Chart title
  theme: 'light',           // 'light' or 'dark'
  animated: true,           // Enable animations
  showLabels: true,         // Show labels
  showTooltip: true         // Enable tooltips
}
```

### Interactive Configuration
```javascript
{
  interactions: {
    global: {                        // Applied to all elements
      onClick: { /* action */ },     // Click action
      onDoubleClick: { /* */ },      // Double-click action
      onHover: { /* */ }             // Hover action
    },
    hoverEffect: {                   // Visual hover effects
      enabled: true,
      style: 'explode',              // 'explode', 'glow', 'scale'
      intensity: 1.2
    },
    clickEffect: {                   // Visual click effects
      enabled: true,
      style: 'pulse',                // 'pulse', 'flash', 'bounce'
      duration: 300
    }
  }
}
```

## 🚀 Getting Started

1. **For simple charts:** Start with `SimpleChart`
2. **For interactive charts:** Use `InteractiveSimpleChart`
3. **For declarative usage:** Use Annie's `annie-chart` attributes
4. **For advanced features:** Consider `PieChart` (when available)

## 📝 Best Practices

- Use `SimpleChart` for most applications
- Add interactivity only when needed for user workflows
- Keep chart configurations simple and focused
- Use declarative syntax for static chart definitions
- Test interactions thoroughly across different devices
- Consider performance implications of complex animations