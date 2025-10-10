/**
 * Annie Charts - Base Chart Configuration Interface
 * Standardized configuration for all chart types
 */

export interface ChartConfig {
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

// Chart-Specific Options Interfaces

export interface PieChartOptions {
  innerRadius?: number;            // 0 = pie, >0 = donut
  outerRadius?: number;            // Chart radius
  startAngle?: number;             // Start angle (degrees)
  endAngle?: number;               // End angle (degrees)
  padAngle?: number;               // Padding between slices
  cornerRadius?: number;           // Rounded corners
  labelPosition?: 'inside' | 'outside' | 'none'; // Label placement
  showLabels?: boolean;            // Show data labels
  showValues?: boolean;            // Show actual values
  showPercentages?: boolean;       // Show percentage labels
  explodeSlices?: boolean;         // Exploded pie slices
  explodeOnHover?: boolean;        // Explode on hover
  explodeDistance?: number;        // Distance for exploded slices
  labelOffset?: number;            // Distance for outside labels
  sortValues?: boolean;            // Sort slices by value
  clockwise?: boolean;             // Clockwise slice order
}

export interface BarChartOptions {
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

export interface LineChartOptions {
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

export interface ScatterPlotOptions {
  pointRadius?: number;            // Point size
  pointShape?: 'circle' | 'square' | 'triangle' | 'diamond'; // Point shape
  pointOpacity?: number;           // Point transparency
  showTrendLine?: boolean;         // Show regression line
  trendLineType?: 'linear' | 'polynomial' | 'exponential'; // Trend line type
  bubbleChart?: boolean;           // Enable bubble chart (size mapping)
  maxBubbleSize?: number;          // Maximum bubble size
}

export interface AreaChartOptions extends LineChartOptions {
  fillOpacity?: number;            // Area fill transparency
  stacked?: boolean;               // Stacked areas
  streamGraph?: boolean;           // Stream graph layout
  baseline?: 'zero' | 'wiggle' | 'silhouette'; // Baseline for stacked areas
}

export interface HeatmapOptions {
  cellPadding?: number;            // Padding between cells
  colorScale?: string[];           // Color scale for values
  showValues?: boolean;            // Show values in cells
  cellBorder?: boolean;            // Show cell borders
  borderColor?: string;            // Border color
  borderWidth?: number;            // Border width
}

// Data Processing Types
export interface ChartData {
  label?: string;
  value?: number;
  values?: number[];               // For multi-series charts
  x?: any;
  y?: any;
  size?: number;
  color?: string;
  category?: string;
  [key: string]: any;              // Allow additional properties
}

// Event Types
export interface ChartEvent {
  type: 'click' | 'hover' | 'brush' | 'zoom';
  data: ChartData;
  element: Element;
  coordinates: { x: number; y: number };
}

// Tooltip Configuration
export interface TooltipConfig {
  enabled?: boolean;
  template?: string;               // HTML template for tooltip
  position?: 'mouse' | 'fixed';    // Tooltip positioning
  offset?: { x: number; y: number }; // Tooltip offset
  delay?: number;                  // Show/hide delay (ms)
}

// Animation Configuration  
export interface AnimationConfig {
  enabled?: boolean;
  duration?: number;               // Animation duration (ms)
  easing?: string;                 // Easing function
  stagger?: number;                // Stagger delay for multiple elements (ms)
}

// Responsive Configuration
export interface ResponsiveConfig {
  breakpoints: {
    mobile: number;                // Mobile breakpoint (px)
    tablet: number;                // Tablet breakpoint (px)  
    desktop: number;               // Desktop breakpoint (px)
  };
  mobile?: Partial<ChartConfig>;   // Mobile-specific overrides
  tablet?: Partial<ChartConfig>;   // Tablet-specific overrides
  desktop?: Partial<ChartConfig>;  // Desktop-specific overrides
}