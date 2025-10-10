/**
 * Annie Charts - Simple Chart Implementation
 * Working version with proper module resolution
 */

// Simple chart configuration interface
export interface SimpleChartConfig {
  type: 'pie' | 'bar' | 'line' | 'donut';
  width?: number;
  height?: number;
  title?: string;
  theme?: 'light' | 'dark';
  colors?: string[];
  animated?: boolean;
  showLabels?: boolean;
  showTooltip?: boolean;
}

// Chart data interface
export interface SimpleChartData {
  label: string;
  value: number;
  color?: string;
}

// Simple chart class that works with D3.js
export class SimpleChart {
  private config: SimpleChartConfig;
  private container: HTMLElement | null = null;

  constructor(config: SimpleChartConfig) {
    this.config = {
      width: 400,
      height: 300,
      theme: 'light',
      animated: true,
      showLabels: true,
      showTooltip: true,
      ...config
    };
  }

  /**
   * Render chart in the specified container
   */
  render(containerId: string, data: SimpleChartData[]): void {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id '${containerId}' not found`);
      return;
    }

    // Check for D3.js
    const d3 = (window as any).d3;
    if (!d3) {
      console.error('D3.js is required but not found');
      return;
    }

    switch (this.config.type) {
      case 'pie':
      case 'donut':
        this.renderPieChart(d3, data);
        break;
      case 'bar':
        this.renderBarChart(d3, data);
        break;
      case 'line':
        this.renderLineChart(d3, data);
        break;
      default:
        console.error(`Chart type '${this.config.type}' not implemented`);
    }
  }

  /**
   * Render pie or donut chart
   */
  private renderPieChart(d3: any, data: SimpleChartData[]): void {
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

    // Setup tooltip if enabled
    let tooltip: any = null;
    if (this.config.showTooltip) {
      tooltip = d3.select('body').append('div')
        .attr('class', 'annie-chart-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0,0,0,0.8)')
        .style('color', 'white')
        .style('padding', '8px 12px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 1000);
    }

    // Create slices
    const slices = chartGroup.selectAll('.pie-slice')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'pie-slice');

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

    // Add interactivity
    if (this.config.showTooltip && tooltip) {
      paths
        .on('mouseenter', (event: any, d: any) => {
          const total = d3.sum(data, (item: SimpleChartData) => item.value);
          const percentage = ((d.data.value / total) * 100).toFixed(1);
          
          tooltip.transition().duration(200).style('opacity', .9);
          tooltip.html(`<strong>${d.data.label}</strong><br/>Value: ${d.data.value.toLocaleString()}<br/>Percentage: ${percentage}%`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseleave', () => {
          tooltip.transition().duration(500).style('opacity', 0);
        });
    }

    // Add labels if enabled
    if (this.config.showLabels) {
      const labelArc = d3.arc()
        .innerRadius(radius + 10)
        .outerRadius(radius + 10);

      slices.append('text')
        .attr('transform', (d: any) => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', this.config.theme === 'dark' ? '#e2e8f0' : '#333333')
        .text((d: any) => d.data.label);
    }
  }

  /**
   * Render bar chart
   */
  private renderBarChart(d3: any, data: SimpleChartData[]): void {
    if (!this.container) return;

    // Clear existing content
    d3.select(this.container).selectAll('*').remove();

    const width = this.config.width!;
    const height = this.config.height!;
    const margin = { top: 50, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

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
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create scales
    const xScale = d3.scaleBand()
      .domain(data.map((d: SimpleChartData) => d.label))
      .range([0, chartWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, (d: SimpleChartData) => d.value)])
      .range([chartHeight, 0]);

    // Add axes
    chartGroup.append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .style('color', this.config.theme === 'dark' ? '#e2e8f0' : '#333333');

    chartGroup.append('g')
      .call(d3.axisLeft(yScale))
      .style('color', this.config.theme === 'dark' ? '#e2e8f0' : '#333333');

    // Create bars
    const bars = chartGroup.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: SimpleChartData) => xScale(d.label)!)
      .attr('width', xScale.bandwidth())
      .attr('fill', (d: SimpleChartData, i: number) => this.getColor(d, i))
      .style('cursor', 'pointer');

    // Animation
    if (this.config.animated) {
      bars.attr('y', chartHeight)
        .attr('height', 0)
        .transition()
        .duration(750)
        .attr('y', (d: SimpleChartData) => yScale(d.value))
        .attr('height', (d: SimpleChartData) => chartHeight - yScale(d.value));
    } else {
      bars.attr('y', (d: SimpleChartData) => yScale(d.value))
        .attr('height', (d: SimpleChartData) => chartHeight - yScale(d.value));
    }

    // Add tooltip if enabled
    if (this.config.showTooltip) {
      const tooltip = d3.select('body').append('div')
        .attr('class', 'annie-chart-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0,0,0,0.8)')
        .style('color', 'white')
        .style('padding', '8px 12px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .style('z-index', 1000);

      bars
        .on('mouseenter', (event: any, d: SimpleChartData) => {
          tooltip.transition().duration(200).style('opacity', .9);
          tooltip.html(`<strong>${d.label}</strong><br/>Value: ${d.value.toLocaleString()}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseleave', () => {
          tooltip.transition().duration(500).style('opacity', 0);
        });
    }
  }

  /**
   * Render line chart (placeholder implementation)
   */
  private renderLineChart(d3: any, _data: SimpleChartData[]): void {
    if (!this.container) return;

    d3.select(this.container).selectAll('*').remove();
    
    const svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.config.width)
      .attr('height', this.config.height);

    svg.append('text')
      .attr('x', this.config.width! / 2)
      .attr('y', this.config.height! / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('fill', '#666')
      .text('Line Chart - Coming Soon!');
  }

  /**
   * Get color for data point
   */
  private getColor(data: SimpleChartData, index: number): string {
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
  updateConfig(newConfig: Partial<SimpleChartConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Destroy chart and cleanup
   */
  destroy(): void {
    if (this.container) {
      const d3 = (window as any).d3;
      if (d3) {
        d3.select(this.container).selectAll('*').remove();
        d3.selectAll('.annie-chart-tooltip').remove();
      }
    }
  }
}