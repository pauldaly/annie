/**
 * Annie Charts - Base Chart Abstract Class
 * Foundation for all chart implementations with common functionality
 */

import { ChartConfig, ChartData, ChartEvent } from './chart-config';
import { ChartUtils } from './chart-utils';

export abstract class BaseChart {
  protected config: ChartConfig;
  protected width: number;
  protected height: number;
  protected margin: { top: number; right: number; bottom: number; left: number };
  protected svg: any;
  protected tooltip: any;
  protected utils: ChartUtils;

  constructor(config: ChartConfig) {
    this.config = {
      // Default configuration
      width: 400,
      height: 300,
      theme: 'light',
      showLegend: true,
      showTooltip: true,
      interactive: true,
      animated: true,
      animationDuration: 750,
      responsive: true,
      margin: { top: 20, right: 20, bottom: 40, left: 40 },
      ...config
    };

    this.margin = this.config.margin!;
    this.width = (this.config.width || 400) - this.margin.left - this.margin.right;
    this.height = (this.config.height || 300) - this.margin.top - this.margin.bottom;
    this.utils = new ChartUtils();
  }

  /**
   * Abstract render method - must be implemented by each chart type
   */
  abstract render(container: HTMLElement, data: ChartData[]): void;

  /**
   * Create base SVG element with standard structure
   */
  protected createSVG(container: HTMLElement): any {
    // Clear existing content
    const d3 = (window as any).d3;
    d3.select(container).selectAll('*').remove();

    // Create SVG with full dimensions
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', this.config.width)
      .attr('height', this.config.height)
      .attr('class', `annie-chart annie-chart-${this.config.type}`)
      .style('background', this.getBackgroundColor());

    // Create main chart group with margins
    const chartGroup = this.svg.append('g')
      .attr('class', 'chart-content')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);

    // Setup responsive behavior
    if (this.config.responsive) {
      this.setupResponsive(container);
    }

    return chartGroup;
  }

  /**
   * Get color for data point based on theme and configuration
   */
  protected getColor(index: number, data?: ChartData): string {
    // Custom colors from config
    if (this.config.colors && this.config.colors.length > 0) {
      return this.config.colors[index % this.config.colors.length];
    }

    // Data-specific color
    if (data?.color) {
      return data.color;
    }

    // Theme-based default colors
    const defaultColors = this.getDefaultColorPalette();
    return defaultColors[index % defaultColors.length];
  }

  /**
   * Get default color palette based on theme
   */
  protected getDefaultColorPalette(): string[] {
    switch (this.config.theme) {
      case 'dark':
        return ['#64ffda', '#ff6b9d', '#ffd54f', '#69f0ae', '#ff9800', '#e91e63'];
      case 'light':
      default:
        return ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
    }
  }

  /**
   * Get background color based on theme
   */
  protected getBackgroundColor(): string {
    if (this.config.background) {
      return this.config.background;
    }
    return this.config.theme === 'dark' ? '#2d3748' : '#ffffff';
  }

  /**
   * Add title to chart
   */
  protected addTitle(svg: any): void {
    if (!this.config.title) return;

    const titleGroup = svg.append('g')
      .attr('class', 'chart-title-group')
      .attr('transform', `translate(${this.width / 2}, ${-this.margin.top / 2})`);

    titleGroup.append('text')
      .attr('class', 'chart-title')
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', this.getTextColor())
      .text(this.config.title);

    if (this.config.subtitle) {
      titleGroup.append('text')
        .attr('class', 'chart-subtitle')
        .attr('text-anchor', 'middle')
        .attr('y', 20)
        .style('font-size', '12px')
        .style('fill', this.getTextColor())
        .style('opacity', 0.7)
        .text(this.config.subtitle);
    }
  }

  /**
   * Add legend to chart
   */
  protected addLegend(svg: any, data: ChartData[]): void {
    if (!this.config.showLegend || !data.length) return;

    const legend = svg.append('g')
      .attr('class', 'chart-legend')
      .attr('transform', `translate(${this.width + 20}, 20)`);

    const legendItems = legend.selectAll('.legend-item')
      .data(data)
      .enter().append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d: any, i: number) => `translate(0, ${i * 25})`);

    // Legend color boxes
    legendItems.append('rect')
      .attr('width', 18)
      .attr('height', 18)
      .attr('rx', 2)
      .attr('fill', (d: any, i: number) => this.getColor(i, d))
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => this.handleLegendClick(event, d));

    // Legend text
    legendItems.append('text')
      .attr('x', 25)
      .attr('y', 9)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('fill', this.getTextColor())
      .style('cursor', 'pointer')
      .text((d: any) => d.label || d.name || 'Unknown')
      .on('click', (event: any, d: any) => this.handleLegendClick(event, d));
  }

  /**
   * Setup tooltip functionality
   */
  protected setupTooltip(): void {
    if (!this.config.showTooltip) return;

    const d3 = (window as any).d3;
    
    // Remove existing tooltip
    d3.select('body').select('.annie-chart-tooltip').remove();

    // Create tooltip
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'annie-chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', this.config.theme === 'dark' ? '#1a202c' : 'rgba(0,0,0,0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('font-family', 'Arial, sans-serif')
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.3)')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
  }

  /**
   * Show tooltip with data information
   */
  protected showTooltip(event: any, data: ChartData): void {
    if (!this.tooltip || !this.config.showTooltip) return;

    const content = this.formatTooltipContent(data);
    
    this.tooltip
      .style('visibility', 'visible')
      .html(content);

    this.updateTooltipPosition(event);
  }

  /**
   * Update tooltip position
   */
  protected updateTooltipPosition(event: any): void {
    if (!this.tooltip) return;

    const tooltipNode = this.tooltip.node();
    const rect = tooltipNode.getBoundingClientRect();
    
    let left = event.pageX + 10;
    let top = event.pageY - 10;

    // Prevent tooltip from going off-screen
    if (left + rect.width > window.innerWidth) {
      left = event.pageX - rect.width - 10;
    }
    if (top - rect.height < 0) {
      top = event.pageY + 20;
    }

    this.tooltip
      .style('left', left + 'px')
      .style('top', top + 'px');
  }

  /**
   * Hide tooltip
   */
  protected hideTooltip(): void {
    if (this.tooltip && this.config.showTooltip) {
      this.tooltip.style('visibility', 'hidden');
    }
  }

  /**
   * Format tooltip content
   */
  protected formatTooltipContent(data: ChartData): string {
    let content = '';
    
    if (data.label) {
      content += `<strong>${data.label}</strong><br>`;
    }
    
    if (data.value !== undefined) {
      content += `Value: ${this.formatValue(data.value)}`;
    }
    
    if (data.x !== undefined && data.y !== undefined) {
      content += `X: ${this.formatValue(data.x)}<br>`;
      content += `Y: ${this.formatValue(data.y)}`;
    }

    return content || 'No data';
  }

  /**
   * Format numeric values for display
   */
  protected formatValue(value: any): string {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value.toLocaleString();
      } else {
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
    }
    return String(value);
  }

  /**
   * Get text color based on theme
   */
  protected getTextColor(): string {
    return this.config.theme === 'dark' ? '#e2e8f0' : '#333333';
  }

  /**
   * Handle click events on chart elements
   */
  protected handleClick(event: any, data: ChartData): void {
    if (!this.config.clickable) return;

    const chartEvent: ChartEvent = {
      type: 'click',
      data: data,
      element: event.target,
      coordinates: { x: event.clientX, y: event.clientY }
    };

    // Emit custom event
    const customEvent = new CustomEvent('annie-chart-click', {
      detail: chartEvent,
      bubbles: true
    });
    
    event.target.dispatchEvent(customEvent);
  }

  /**
   * Handle legend click events
   */
  protected handleLegendClick(event: any, data: ChartData): void {
    // Default behavior: toggle data series visibility
    const element = event.target;
    const isActive = !element.classList.contains('legend-disabled');
    
    if (isActive) {
      element.classList.add('legend-disabled');
      element.style.opacity = '0.3';
    } else {
      element.classList.remove('legend-disabled');
      element.style.opacity = '1';
    }

    // Emit legend toggle event
    const customEvent = new CustomEvent('annie-chart-legend-toggle', {
      detail: { data: data, active: !isActive },
      bubbles: true
    });
    
    element.dispatchEvent(customEvent);
  }

  /**
   * Setup responsive behavior
   */
  protected setupResponsive(container: HTMLElement): void {
    const resize = () => {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      if (containerWidth > 0 && containerHeight > 0) {
        this.width = containerWidth - this.margin.left - this.margin.right;
        this.height = containerHeight - this.margin.top - this.margin.bottom;
        
        // Re-render chart with new dimensions
        this.render(container, []); // Note: Would need to store data for re-render
      }
    };

    // Throttled resize handler
    let resizeTimeout: any;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 250);
    });
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.tooltip) {
      this.tooltip.remove();
    }
  }
}