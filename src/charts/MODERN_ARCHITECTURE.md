/**
 * Annie Charts - Modern D3.js Chart System Architecture
 * Each chart type is a separate module with standardized parameters
 */

## 🏗️ **Modern Modular Architecture**

### **File Structure**
```
src/charts/
├── chart-processor.ts           # Main Annie chart processor
├── base/
│   ├── base-chart.ts           # Abstract base class
│   ├── chart-config.ts         # Standardized configuration interface
│   └── chart-utils.ts          # Common D3.js utilities
├── types/
│   ├── pie-chart.ts            # Modern pie chart implementation
│   ├── bar-chart.ts            # Modern bar chart implementation
│   ├── line-chart.ts           # Modern line chart implementation
│   ├── area-chart.ts           # Modern area chart implementation
│   ├── scatter-chart.ts        # Modern scatter chart implementation
│   └── dashboard-chart.ts      # Multi-chart dashboard
└── index.ts                    # Chart system exports

public/charts/                  # Compiled chart modules (loaded dynamically)
├── pie-chart.js
├── bar-chart.js
├── line-chart.js
└── ...
```

### **Benefits of This Approach**

✅ **One Chart = One File** - Easy to enhance individual chart types
✅ **Standardized Parameters** - Consistent API across all charts  
✅ **Robust Configuration** - Rich parameter sets for maximum flexibility
✅ **Dynamic Loading** - Load only the charts you need
✅ **Modern D3.js** - Use latest D3.js patterns and best practices
✅ **JsonLogic Ready** - Built-in conditional parameter support
✅ **AI Friendly** - Structured parameters perfect for AI generation

## 🎯 **Standardized Chart Configuration**

### **Universal Chart Config Interface**
```typescript
interface ChartConfig {
  // Core Configuration
  type: string;                    // 'pie', 'bar', 'line', etc.
  source: string;                  // Data source name
  width?: number;                  // Chart width (default: auto)
  height?: number;                 // Chart height (default: 400)
  
  // Data Mapping
  x?: string | string[];           // X-axis field(s)
  y?: string | string[];           // Y-axis field(s)  
  label?: string;                  // Label field for pie/donut charts
  value?: string;                  // Value field for pie/donut charts
  color?: string;                  // Color grouping field
  size?: string;                   // Size field (scatter plots)
  
  // Styling
  colors?: string[];               // Custom color palette
  theme?: 'light' | 'dark' | 'auto'; // Color theme
  background?: string;             // Chart background
  margin?: {                       // Chart margins
    top: number;
    right: number; 
    bottom: number;
    left: number;
  };
  
  // Visual Options
  title?: string;                  // Chart title
  subtitle?: string;               // Chart subtitle
  showLegend?: boolean;            // Show/hide legend
  showGrid?: boolean;              // Show/hide grid lines
  showAxis?: boolean;              // Show/hide axes
  showTooltip?: boolean;           // Enable tooltips
  
  // Interactivity  
  interactive?: boolean;           // Enable interactions
  clickable?: boolean;             // Enable click events
  hoverable?: boolean;             // Enable hover effects
  zoomable?: boolean;              // Enable zoom/pan
  brushable?: boolean;             // Enable selection brush
  
  // Animation
  animated?: boolean;              // Enable animations
  animationDuration?: number;      // Animation duration (ms)
  animationEasing?: string;        // Animation easing function
  
  // Data Processing
  filter?: any;                    // Data filter (JsonLogic)
  sort?: string | string[];        // Sort fields
  limit?: number;                  // Max data points
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'; // Data aggregation
  
  // Real-time
  realTime?: boolean;              // Enable real-time updates
  updateInterval?: number;         // Update interval (ms)
  maxPoints?: number;              // Max points for real-time charts
  
  // Responsive
  responsive?: boolean;            // Auto-resize
  aspectRatio?: number;            // Width/height ratio
  breakpoints?: {                  // Responsive breakpoints
    mobile?: Partial<ChartConfig>;
    tablet?: Partial<ChartConfig>;
    desktop?: Partial<ChartConfig>;
  };
  
  // Chart-Specific Options (varies by type)
  chartOptions?: any;              // Type-specific configuration
}
```

## 🎨 **Chart-Specific Parameter Examples**

### **Pie Chart Parameters**
```typescript
interface PieChartOptions {
  innerRadius?: number;            // 0 = pie, >0 = donut
  outerRadius?: number;            // Chart radius
  startAngle?: number;             // Start angle (degrees)
  endAngle?: number;               // End angle (degrees)
  padAngle?: number;               // Padding between slices
  cornerRadius?: number;           // Rounded corners
  labelPosition?: 'inside' | 'outside' | 'none'; // Label placement
  showPercentages?: boolean;       // Show percentage labels
  explodeSlices?: boolean;         // Exploded pie slices
  explodeDistance?: number;        // Distance for exploded slices
}
```

### **Bar Chart Parameters**
```typescript
interface BarChartOptions {
  orientation?: 'horizontal' | 'vertical'; // Bar orientation
  barWidth?: number;               // Fixed bar width
  barPadding?: number;             // Padding between bars
  groupPadding?: number;           // Padding between groups
  stacked?: boolean;               // Stacked bars
  grouped?: boolean;               // Grouped bars
  showValues?: boolean;            // Show value labels on bars
  valuePosition?: 'top' | 'center' | 'bottom'; // Value label position
  cornerRadius?: number;           // Rounded bar corners
  gradient?: boolean;              // Gradient fill
}
```

### **Line Chart Parameters**  
```typescript
interface LineChartOptions {
  curveType?: 'linear' | 'smooth' | 'step' | 'basis'; // Line curve
  lineWidth?: number;              // Line thickness
  showPoints?: boolean;            // Show data points
  pointRadius?: number;            // Point size
  pointShape?: 'circle' | 'square' | 'triangle'; // Point shape
  filled?: boolean;                // Area under line
  fillOpacity?: number;            // Fill transparency
  connectGaps?: boolean;           // Connect missing data
  multiSeries?: boolean;           // Multiple lines
}
```

## 🚀 **Modern Chart Implementation Example**

### **Pie Chart Implementation**
```typescript
// src/charts/types/pie-chart.ts
import { BaseChart } from '../base/base-chart.js';
import { ChartConfig, PieChartOptions } from '../base/chart-config.js';
import * as d3 from 'd3';

export class PieChart extends BaseChart {
  private pieOptions: PieChartOptions;
  
  constructor(config: ChartConfig) {
    super(config);
    this.pieOptions = {
      innerRadius: 0,
      outerRadius: Math.min(this.width, this.height) / 2 - 10,
      startAngle: 0,
      endAngle: 2 * Math.PI,
      padAngle: 0.02,
      labelPosition: 'outside',
      showPercentages: true,
      ...config.chartOptions
    };
  }
  
  render(container: HTMLElement, data: any[]): void {
    // Clear existing
    d3.select(container).selectAll('*').remove();
    
    // Create SVG
    const svg = this.createSVG(container);
    const g = svg.append('g')
      .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
    
    // Process data
    const processedData = this.processData(data);
    
    // Create pie generator
    const pie = d3.pie<any>()
      .value(d => d.value)
      .startAngle(this.pieOptions.startAngle!)
      .endAngle(this.pieOptions.endAngle!)
      .padAngle(this.pieOptions.padAngle!)
      .sort(null);
    
    // Create arc generator
    const arc = d3.arc()
      .innerRadius(this.pieOptions.innerRadius!)
      .outerRadius(this.pieOptions.outerRadius!)
      .cornerRadius(this.pieOptions.cornerRadius || 0);
    
    // Create label arc (for outside labels)
    const labelArc = d3.arc()
      .innerRadius(this.pieOptions.outerRadius! + 10)
      .outerRadius(this.pieOptions.outerRadius! + 10);
    
    // Create slices
    const arcs = g.selectAll('.arc')
      .data(pie(processedData))
      .enter().append('g')
      .attr('class', 'arc');
    
    // Add paths
    arcs.append('path')
      .attr('d', arc as any)
      .attr('fill', (d, i) => this.getColor(i, d.data))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', this.config.clickable ? 'pointer' : 'default')
      .on('click', (event, d) => this.handleClick(event, d.data))
      .on('mouseover', (event, d) => this.showTooltip(event, d.data))
      .on('mouseout', () => this.hideTooltip());
    
    // Add labels
    if (this.pieOptions.labelPosition !== 'none') {
      this.addLabels(arcs, arc, labelArc, processedData);
    }
    
    // Add legend
    if (this.config.showLegend) {
      this.addLegend(svg, processedData);
    }
    
    // Add title
    if (this.config.title) {
      this.addTitle(svg);
    }
  }
  
  private processData(data: any[]): any[] {
    return data.map((item, index) => ({
      label: item[this.config.label!] || `Item ${index + 1}`,
      value: item[this.config.value!] || item.value || 0,
      color: item.color || this.getColor(index, item),
      originalData: item
    }));
  }
  
  private addLabels(arcs: any, arc: any, labelArc: any, data: any[]): void {
    if (this.pieOptions.labelPosition === 'outside') {
      // Outside labels with leader lines
      arcs.append('text')
        .attr('transform', (d: any) => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', (d: any) => {
          const centroid = labelArc.centroid(d);
          return centroid[0] > 0 ? 'start' : 'end';
        })
        .text((d: any) => {
          const percentage = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);
          return this.pieOptions.showPercentages ? 
            `${d.data.label} (${percentage}%)` : d.data.label;
        })
        .style('font-size', '12px')
        .style('font-family', 'Arial, sans-serif');
        
      // Leader lines
      arcs.append('polyline')
        .attr('points', (d: any) => {
          const pos = labelArc.centroid(d);
          const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
          const x = Math.cos(midAngle - Math.PI / 2) * this.pieOptions.outerRadius!;
          const y = Math.sin(midAngle - Math.PI / 2) * this.pieOptions.outerRadius!;
          return `${x},${y} ${pos[0]},${pos[1]}`;
        })
        .style('fill', 'none')
        .style('stroke', '#666')
        .style('stroke-width', 1);
        
    } else if (this.pieOptions.labelPosition === 'inside') {
      // Inside labels
      arcs.append('text')
        .attr('transform', (d: any) => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .text((d: any) => {
          const percentage = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);
          return this.pieOptions.showPercentages ? `${percentage}%` : d.data.label;
        })
        .style('font-size', '12px')
        .style('font-family', 'Arial, sans-serif')
        .style('fill', 'white')
        .style('font-weight', 'bold');
    }
  }
}
```

## 📋 **Implementation Strategy**

### **Phase 1: Foundation (Week 1)**
```typescript
// 1. Create base chart class
abstract class BaseChart {
  protected config: ChartConfig;
  protected width: number;
  protected height: number;
  
  abstract render(container: HTMLElement, data: any[]): void;
  
  // Common utilities all charts inherit
  protected createSVG(container: HTMLElement) { /* ... */ }
  protected getColor(index: number, data: any) { /* ... */ }
  protected addTitle(svg: any) { /* ... */ }
  protected addLegend(svg: any, data: any[]) { /* ... */ }
  // ... more common methods
}

// 2. Implement 3-4 core chart types
// - PieChart (replace your legacy pie)
// - BarChart (vertical/horizontal, grouped, stacked)  
// - LineChart (single/multi-series, area fill)
// - ScatterPlot (basic x/y plotting)
```

### **Phase 2: Enhancement (Week 2)**
```typescript
// 3. Add robust parameter support
// 4. JsonLogic integration for conditional parameters
// 5. Real-time data updates
// 6. Interactive features (zoom, brush, click handlers)
```

### **Phase 3: Advanced Charts (Week 3)**
```typescript  
// 7. Add advanced chart types
// - Heatmaps, treemaps, sankey diagrams
// - Multi-chart dashboards
// - Custom chart compositions
```

## 🎯 **Usage Examples**

### **Simple Pie Chart**
```html
<div data-annie-chart="pie"
     data-source="sales-data"
     data-label="product" 
     data-value="sales"
     data-title="Sales by Product">
</div>
```

### **Advanced Pie Chart**  
```html
<div data-annie-chart="pie"
     data-source="sales-data"
     data-label="product"
     data-value="sales" 
     data-chart-options='{
       "innerRadius": 50,
       "cornerRadius": 5,
       "labelPosition": "outside", 
       "showPercentages": true,
       "explodeSlices": true
     }'>
</div>
```

### **Conditional Chart with JsonLogic**
```html
<div data-annie-chart='{"jsonlogic": {"if": [{"var": "isMobile"}, "pie", "bar"]}}'
     data-source="sales-data"
     data-chart-options='{"jsonlogic": {
       "if": [{"==": [{"var": "theme"}, "dark"]},
              {"colors": ["#64ffda", "#ff6b9d"], "background": "#2d3748"},
              {"colors": ["#007bff", "#28a745"], "background": "#ffffff"}]
     }}'>
</div>
```

This approach gives you:
✅ **Clean, modern D3.js implementations**
✅ **Standardized, rich parameter sets** 
✅ **Easy to enhance one chart at a time**
✅ **JsonLogic conditional parameters**
✅ **AI-friendly structured configs**
✅ **No legacy code baggage**

Should we start implementing this modern chart system?