/**
 * Annie Charts - Interactive Simple Chart
 * Enhanced SimpleChart with navigation, actions, and interactions
 */

import { ChartActionHandler, InteractiveChartData, ChartInteraction, ChartInteractionConfig } from './chart-interactions';

// Enhanced configuration interface
export interface InteractiveChartConfig {
  type: 'pie' | 'bar' | 'line' | 'donut';
  width?: number;
  height?: number;
  title?: string;
  theme?: 'light' | 'dark';
  colors?: string[];
  animated?: boolean;
  showLabels?: boolean;
  showTooltip?: boolean;
  
  // Interactive features
  interactions?: ChartInteractionConfig;
  
  // Annie integration
  annieIntegration?: {
    autoProcess?: boolean;        // Auto-process on data change
    dataSource?: string;          // Annie data source name
    contextBindings?: string[];   // Context variables to watch
  };
}

/**
 * Interactive Simple Chart Class
 * Extends basic charting with rich interaction capabilities
 */
export class InteractiveSimpleChart {
  private config: InteractiveChartConfig;
  private container: HTMLElement | null = null;
  private actionHandler: ChartActionHandler;
  private chartData: InteractiveChartData[] = [];

  constructor(config: InteractiveChartConfig) {
    this.config = {
      width: 400,
      height: 300,
      theme: 'light',
      animated: true,
      showLabels: true,
      showTooltip: true,
      interactions: {
        elementInteractions: true,
        hoverEffect: { enabled: true, style: 'highlight' },
        clickEffect: { enabled: true, style: 'pulse' }
      },
      ...config
    };
    
    this.actionHandler = ChartActionHandler.getInstance();
  }

  /**
   * Render interactive chart
   */
  render(containerId: string, data: InteractiveChartData[]): void {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id '${containerId}' not found`);
      return;
    }

    // Store chart data for interactions
    this.chartData = data;

    // Check for D3.js
    const d3 = (window as any).d3;
    if (!d3) {
      console.error('D3.js is required but not found');
      return;
    }

    switch (this.config.type) {
      case 'pie':
      case 'donut':
        this.renderInteractivePieChart(d3, data);
        break;
      case 'bar':
        this.renderInteractiveBarChart(d3, data);
        break;
      case 'line':
        this.renderInteractiveLineChart(d3, data);
        break;
      default:
        console.error(`Chart type '${this.config.type}' not implemented`);
    }
    
    // Setup Annie integration
    this.setupAnnieIntegration();
  }

  /**
   * Render interactive pie chart
   */
  private renderInteractivePieChart(d3: any, data: InteractiveChartData[]): void {
    if (!this.container) return;

    // Clear existing content
    d3.select(this.container).selectAll('*').remove();

    const width = this.config.width!;
    const height = this.config.height!;
    const radius = Math.min(width, height) / 2 - 40;
    const innerRadius = this.config.type === 'donut' ? radius * 0.4 : 0;

    // Create SVG
    const svg = d3.select(this.container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', this.config.theme === 'dark' ? '#2d3748' : '#ffffff');

    // Add title
    if (this.config.title) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', this.config.theme === 'dark' ? '#e2e8f0' : '#333333')
        .text(this.config.title);
    }

    const chartGroup = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Create pie layout
    const pie = d3.pie()
      .value((d: any) => d.value)
      .sort(null);

    // Create arc generator
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    // Create hover arc for effects
    const hoverArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius + 5);

    // Create slices
    const slices = chartGroup.selectAll('.pie-slice')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'pie-slice')
      .style('cursor', 'pointer');

    const paths = slices.append('path')
      .attr('fill', (d: any, i: number) => this.getColor(d.data, i))
      .attr('stroke', this.config.theme === 'dark' ? '#2d3748' : '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Animation
    if (this.config.animated) {
      paths.attr('d', d3.arc().innerRadius(innerRadius).outerRadius(0))
        .transition()
        .duration(750)
        .ease(d3.easeElastic.amplitude(1).period(0.3))
        .attr('d', arc);
    } else {
      paths.attr('d', arc);
    }

    // Setup interactive behaviors
    this.setupPieInteractions(slices, paths, arc, hoverArc, data);

    // Add labels if enabled
    if (this.config.showLabels) {
      this.addPieLabels(chartGroup, pie(data), d3, radius);
    }
  }

  /**
   * Setup pie chart interactions
   */
  private setupPieInteractions(
    slices: any,
    paths: any,
    arc: any,
    hoverArc: any,
    data: InteractiveChartData[]
  ): void {
    const interactions = this.config.interactions!;
    
    slices
      .on('click', (event: MouseEvent, d: any) => {
        const chartData = d.data as InteractiveChartData;
        this.actionHandler.handleElementClick(chartData, event.currentTarget, interactions, event);
      })
      
      .on('dblclick', (event: MouseEvent, d: any) => {
        const chartData = d.data as InteractiveChartData;
        if (chartData.onDoubleClick || interactions.global?.onDoubleClick) {
          const interaction = chartData.onDoubleClick || interactions.global?.onDoubleClick;
          this.executeInteraction(interaction!, chartData, event.currentTarget, event);
        }
      })
      
      .on('mouseenter', (event: MouseEvent, d: any) => {
        const chartData = d.data as InteractiveChartData;
        
        // Apply hover effect
        if (interactions.hoverEffect?.enabled) {
          this.applyHoverEffect(event.currentTarget, paths, arc, hoverArc, interactions.hoverEffect);
        }
        
        // Handle hover interaction
        if (chartData.onHover || interactions.global?.onHover) {
          const interaction = chartData.onHover || interactions.global?.onHover;
          this.executeInteraction(interaction!, chartData, event.currentTarget, event);
        }
        
        // Show enhanced tooltip
        this.showEnhancedTooltip(event, chartData);
      })
      
      .on('mouseleave', (event: MouseEvent, d: any) => {
        // Remove hover effect
        if (interactions.hoverEffect?.enabled) {
          this.removeHoverEffect(event.currentTarget, paths, arc);
        }
        
        // Hide tooltip
        this.hideTooltip();
      })
      
      .on('contextmenu', (event: MouseEvent, d: any) => {
        event.preventDefault();
        const chartData = d.data as InteractiveChartData;
        
        if (chartData.contextMenu) {
          this.showContextMenu(event, chartData.contextMenu);
        }
      });
  }

  /**
   * Apply hover effect to chart element
   */
  private applyHoverEffect(
    element: any,
    paths: any,
    arc: any,
    hoverArc: any,
    effect: NonNullable<ChartInteractionConfig['hoverEffect']>
  ): void {
    const d3 = (window as any).d3;
    
    switch (effect.style) {
      case 'highlight':
        d3.select(element).select('path')
          .transition()
          .duration(200)
          .style('opacity', 0.8)
          .style('filter', 'brightness(1.1)');
        break;
        
      case 'explode':
        d3.select(element).select('path')
          .transition()
          .duration(200)
          .attr('d', hoverArc);
        break;
        
      case 'glow':
        d3.select(element).select('path')
          .transition()
          .duration(200)
          .style('filter', 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))');
        break;
        
      case 'scale':
        d3.select(element)
          .transition()
          .duration(200)
          .attr('transform', 'scale(1.05)');
        break;
    }
  }

  /**
   * Remove hover effect
   */
  private removeHoverEffect(element: any, paths: any, arc: any): void {
    const d3 = (window as any).d3;
    
    d3.select(element).select('path')
      .transition()
      .duration(200)
      .attr('d', arc)
      .style('opacity', 1)
      .style('filter', 'none');
      
    d3.select(element)
      .transition()
      .duration(200)
      .attr('transform', 'scale(1)');
  }

  /**
   * Show enhanced tooltip with interaction hints
   */
  private showEnhancedTooltip(event: MouseEvent, data: InteractiveChartData): void {
    if (!this.config.showTooltip) return;
    
    const d3 = (window as any).d3;
    
    // Remove existing tooltip
    d3.select('.annie-interactive-tooltip').remove();
    
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'annie-interactive-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.9)')
      .style('color', 'white')
      .style('padding', '12px 16px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('font-family', 'Arial, sans-serif')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
      .style('pointer-events', 'none')
      .style('z-index', 1000)
      .style('max-width', '300px');
    
    let content = `<strong>${data.label}</strong><br/>Value: ${data.value.toLocaleString()}`;
    
    // Add interaction hints
    if (data.onClick) {
      content += '<br/><small style="color: #93c5fd;">Click to navigate</small>';
    }
    if (data.onDoubleClick) {
      content += '<br/><small style="color: #93c5fd;">Double-click for action</small>';
    }
    if (data.contextMenu) {
      content += '<br/><small style="color: #93c5fd;">Right-click for menu</small>';
    }
    
    // Add metadata if available
    if (data.metadata) {
      Object.entries(data.metadata).forEach(([key, value]) => {
        content += `<br/><small>${key}: ${value}</small>`;
      });
    }
    
    tooltip.html(content);
    
    // Position tooltip
    const rect = tooltip.node().getBoundingClientRect();
    let left = event.pageX + 10;
    let top = event.pageY - 10;
    
    if (left + rect.width > window.innerWidth) {
      left = event.pageX - rect.width - 10;
    }
    if (top - rect.height < 0) {
      top = event.pageY + 20;
    }
    
    tooltip
      .style('left', left + 'px')
      .style('top', top + 'px')
      .style('opacity', 0)
      .transition()
      .duration(200)
      .style('opacity', 1);
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    const d3 = (window as any).d3;
    d3.selectAll('.annie-interactive-tooltip')
      .transition()
      .duration(200)
      .style('opacity', 0)
      .remove();
  }

  /**
   * Show context menu
   */
  private showContextMenu(event: MouseEvent, menuItems: ChartInteraction[]): void {
    // Implementation for context menu
    console.log('Show context menu:', menuItems, event);
    // This would create a dropdown menu with the interaction options
  }

  /**
   * Execute an interaction
   */
  private executeInteraction(
    interaction: ChartInteraction,
    data: InteractiveChartData,
    element: any,
    event: Event
  ): void {
    // Delegate to the action handler
    // Note: We'd need to modify ChartActionHandler to accept this signature
    // For now, let's create a wrapper
    if (this.config.interactions) {
      this.actionHandler.handleElementClick(data, element, this.config.interactions, event as MouseEvent);
    }
  }

  /**
   * Render interactive bar chart (simplified implementation)
   */
  private renderInteractiveBarChart(d3: any, data: InteractiveChartData[]): void {
    // Similar to pie chart but for bars - implementation would follow same pattern
    console.log('Interactive bar chart not yet implemented', d3, data);
  }

  /**
   * Render interactive line chart (simplified implementation)  
   */
  private renderInteractiveLineChart(d3: any, data: InteractiveChartData[]): void {
    // Similar to pie chart but for lines - implementation would follow same pattern
    console.log('Interactive line chart not yet implemented', d3, data);
  }

  /**
   * Add pie chart labels
   */
  private addPieLabels(chartGroup: any, pieData: any[], d3: any, radius: number): void {
    const labelArc = d3.arc()
      .innerRadius(radius + 10)
      .outerRadius(radius + 10);

    chartGroup.selectAll('.pie-label')
      .data(pieData)
      .enter()
      .append('text')
      .attr('class', 'pie-label')
      .attr('transform', (d: any) => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', this.config.theme === 'dark' ? '#e2e8f0' : '#333333')
      .text((d: any) => d.data.label);
  }

  /**
   * Setup Annie Framework integration
   */
  private setupAnnieIntegration(): void {
    if (!this.config.annieIntegration) return;
    
    const annie = (window as any).Annie;
    if (!annie) return;
    
    // Listen for Annie data changes
    if (this.config.annieIntegration.dataSource) {
      // This would integrate with Annie's data store change events
      console.log('Setting up Annie data integration for:', this.config.annieIntegration.dataSource);
    }
    
    // Listen for context changes
    if (this.config.annieIntegration.contextBindings) {
      // This would watch for changes in Annie's context/state
      console.log('Setting up Annie context bindings:', this.config.annieIntegration.contextBindings);
    }
  }

  /**
   * Get color for data point
   */
  private getColor(data: InteractiveChartData, index: number): string {
    if (data.color) return data.color;
    if (this.config.colors && this.config.colors.length > 0) {
      return this.config.colors[index % this.config.colors.length];
    }

    // Default color palette
    const defaultColors = this.config.theme === 'dark' 
      ? ['#64ffda', '#ff6b9d', '#ffd54f', '#69f0ae', '#ff9800', '#e91e63']
      : ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
    
    return defaultColors[index % defaultColors.length];
  }

  /**
   * Update chart configuration
   */
  updateConfig(newConfig: Partial<InteractiveChartConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Update chart data and re-render
   */
  updateData(newData: InteractiveChartData[]): void {
    if (this.container) {
      this.render(this.container.id, newData);
    }
  }

  /**
   * Destroy chart and cleanup
   */
  destroy(): void {
    if (this.container) {
      const d3 = (window as any).d3;
      if (d3) {
        d3.select(this.container).selectAll('*').remove();
        d3.selectAll('.annie-interactive-tooltip').remove();
      }
    }
  }
}