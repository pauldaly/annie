/**
 * Annie Charts - Chart Utilities
 * Common utility functions for chart operations
 */

export class ChartUtils {
  
  /**
   * Scale value to fit within a range
   */
  static scaleValue(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
    const fromRange = fromMax - fromMin;
    const toRange = toMax - toMin;
    const scaledValue = (value - fromMin) / fromRange;
    return toMin + (scaledValue * toRange);
  }

  /**
   * Calculate optimal number of ticks for an axis
   */
  static calculateTicks(min: number, max: number, targetCount: number = 5): number[] {
    const range = max - min;
    const step = this.niceNumber(range / (targetCount - 1), false);
    const niceMin = Math.floor(min / step) * step;
    const niceMax = Math.ceil(max / step) * step;
    
    const ticks: number[] = [];
    for (let tick = niceMin; tick <= niceMax; tick += step) {
      ticks.push(Math.round(tick * 1000000) / 1000000); // Avoid floating point errors
    }
    
    return ticks;
  }

  /**
   * Create a "nice" number for axis scaling
   */
  static niceNumber(num: number, round: boolean): number {
    const exponent = Math.floor(Math.log10(Math.abs(num)));
    const fraction = Math.abs(num) / Math.pow(10, exponent);
    
    let niceFraction: number;
    
    if (round) {
      if (fraction < 1.5) niceFraction = 1;
      else if (fraction < 3) niceFraction = 2;
      else if (fraction < 7) niceFraction = 5;
      else niceFraction = 10;
    } else {
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 5) niceFraction = 5;
      else niceFraction = 10;
    }
    
    return niceFraction * Math.pow(10, exponent) * Math.sign(num);
  }

  /**
   * Calculate angle in radians for pie chart segments
   */
  static calculateAngle(value: number, total: number): number {
    return (value / total) * 2 * Math.PI;
  }

  /**
   * Convert angle to coordinates for pie chart labels
   */
  static angleToCoordinates(angle: number, radius: number): { x: number; y: number } {
    return {
      x: Math.cos(angle - Math.PI / 2) * radius,
      y: Math.sin(angle - Math.PI / 2) * radius
    };
  }

  /**
   * Generate smooth curve path for line charts
   */
  static generateCurvePath(points: Array<{ x: number; y: number }>, tension: number = 0.3): string {
    if (points.length < 2) return '';

    const d3 = (window as any).d3;
    
    if (d3 && d3.line && d3.curveCatmullRom) {
      const line = d3.line()
        .x((d: any) => d.x)
        .y((d: any) => d.y)
        .curve(d3.curveCatmullRom.alpha(tension));
      
      return line(points);
    }

    // Fallback to simple line path
    let path = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += `L${points[i].x},${points[i].y}`;
    }
    return path;
  }

  /**
   * Truncate text to fit within specified width
   */
  static truncateText(text: string, maxWidth: number, fontSize: number = 12): string {
    const avgCharWidth = fontSize * 0.6; // Approximate character width
    const maxChars = Math.floor(maxWidth / avgCharWidth);
    
    if (text.length <= maxChars) return text;
    
    return text.substring(0, maxChars - 3) + '...';
  }

  /**
   * Generate contrasting color for text based on background
   */
  static getContrastingTextColor(backgroundColor: string): string {
    // Convert color to RGB
    const rgb = this.hexToRgb(backgroundColor);
    if (!rgb) return '#000000';

    // Calculate luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    
    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  /**
   * Convert hex color to RGB
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Lighten or darken a color by a percentage
   */
  static adjustColorBrightness(color: string, percent: number): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;

    const adjust = (value: number) => {
      const adjusted = Math.round(value + (value * percent / 100));
      return Math.max(0, Math.min(255, adjusted));
    };

    const r = adjust(rgb.r).toString(16).padStart(2, '0');
    const g = adjust(rgb.g).toString(16).padStart(2, '0');
    const b = adjust(rgb.b).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
  }

  /**
   * Create gradient definition for SVG
   */
  static createGradient(svg: any, id: string, color1: string, color2: string, direction: 'horizontal' | 'vertical' = 'vertical'): void {
    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
    
    const gradient = defs.append('linearGradient')
      .attr('id', id)
      .attr('x1', direction === 'horizontal' ? '0%' : '0%')
      .attr('y1', direction === 'horizontal' ? '0%' : '0%')
      .attr('x2', direction === 'horizontal' ? '100%' : '0%')
      .attr('y2', direction === 'horizontal' ? '0%' : '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color1);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color2);
  }

  /**
   * Animate element along a path
   */
  static animateAlongPath(element: any, path: string, duration: number = 1000): void {
    const d3 = (window as any).d3;
    
    if (!d3) return;

    const pathLength = element.node().getTotalLength();
    
    element
      .attr('stroke-dasharray', pathLength + ' ' + pathLength)
      .attr('stroke-dashoffset', pathLength)
      .transition()
      .duration(duration)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0);
  }

  /**
   * Format number with appropriate suffix (K, M, B)
   */
  static formatNumber(num: number): string {
    const absNum = Math.abs(num);
    
    if (absNum >= 1e9) {
      return (num / 1e9).toFixed(1) + 'B';
    } else if (absNum >= 1e6) {
      return (num / 1e6).toFixed(1) + 'M';
    } else if (absNum >= 1e3) {
      return (num / 1e3).toFixed(1) + 'K';
    }
    
    return num.toString();
  }

  /**
   * Generate accessible color palette
   */
  static generateAccessibleColors(count: number, saturation: number = 70, lightness: number = 50): string[] {
    const colors: string[] = [];
    const step = 360 / count;
    
    for (let i = 0; i < count; i++) {
      const hue = i * step;
      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    
    return colors;
  }

  /**
   * Check if two rectangles intersect (for label collision detection)
   */
  static rectanglesIntersect(rect1: any, rect2: any): boolean {
    return !(rect1.x + rect1.width < rect2.x || 
             rect2.x + rect2.width < rect1.x || 
             rect1.y + rect1.height < rect2.y || 
             rect2.y + rect2.height < rect1.y);
  }

  /**
   * Calculate best position for labels to avoid overlaps
   */
  static calculateLabelPositions(labels: Array<{ x: number; y: number; width: number; height: number; text: string }>): Array<{ x: number; y: number; text: string }> {
    const positioned = labels.map(label => ({ ...label }));
    
    // Simple algorithm to adjust overlapping labels
    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        if (this.rectanglesIntersect(positioned[i], positioned[j])) {
          // Move the second label down
          positioned[j].y = positioned[i].y + positioned[i].height + 5;
        }
      }
    }
    
    return positioned.map(label => ({ x: label.x, y: label.y, text: label.text }));
  }
}