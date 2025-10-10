/**
 * Annie Charts - Pie Chart Implementation
 * Modern D3.js pie chart with rich configuration options
 */

import { BaseChart } from './base/base-chart';
import { ChartConfig, ChartData, PieChartOptions } from './base/chart-config';
import { ChartUtils } from './base/chart-utils';

// D3.js global declaration
declare const d3: any;

export class PieChart extends BaseChart {
  private pieOptions: PieChartOptions;
  private pieData: any[] = [];
  private arc: any;
  private pie: any;

  constructor(config: ChartConfig & { options?: PieChartOptions }) {
    super(config);
    
    // Calculate outer radius after parent construction
    const minDimension = Math.min(this.width, this.height);
    
    this.pieOptions = {
      innerRadius: 0,
      outerRadius: minDimension / 2 - 10,
      cornerRadius: 0,
      padAngle: 0,
      startAngle: 0,
      endAngle: 2 * Math.PI,
      sortValues: true,
      clockwise: true,
      showLabels: true,
      showValues: true,
      showPercentages: true,
      labelPosition: 'outside',
      labelOffset: 20,
      explodeOnHover: true,
      explodeDistance: 10,
      ...config.options
    };
  }

  render(container: HTMLElement, data: ChartData[]): void {
    if (!data || data.length === 0) {
      console.warn('PieChart: No data provided');
      return;
    }

    // Validate required D3.js
    const d3 = (window as any).d3;
    if (!d3) {
      console.error('PieChart: D3.js is required but not found');
      return;
    }

    // Process and validate data
    this.pieData = this.processData(data);
    if (this.pieData.length === 0) {
      console.warn('PieChart: No valid data after processing');
      return;
    }

    // Create SVG with centered chart group
    const svg = this.createSVG(container);
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    const chartGroup = svg.append('g')
      .attr('class', 'pie-chart-group')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Setup D3 pie and arc generators
    this.setupPieLayout(d3);
    
    // Setup tooltip
    this.setupTooltip();

    // Draw pie slices
    this.drawPieSlices(chartGroup, d3);

    // Add labels if enabled
    if (this.pieOptions.showLabels) {
      this.drawLabels(chartGroup, d3);
    }

    // Add title and legend
    this.addTitle(svg);
    if (this.config.showLegend) {
      this.addLegend(svg, data);
    }

    // Setup interactions
    this.setupInteractions(chartGroup);
  }

  private processData(data: ChartData[]): any[] {
    return data
      .filter(d => d.value !== undefined && d.value > 0)
      .map((d, index) => ({
        label: d.label || d.name || `Item ${index + 1}`,
        value: Number(d.value),
        color: d.color || this.getColor(index, d),
        originalData: d
      }))
      .sort((a, b) => this.pieOptions.sortValues ? b.value - a.value : 0);
  }

  private setupPieLayout(d3: any): void {
    // Create pie generator
    this.pie = d3.pie()
      .value((d: any) => d.value)
      .sort(this.pieOptions.sortValues ? null : null)
      .startAngle(this.pieOptions.startAngle)
      .endAngle(this.pieOptions.endAngle);

    if (!this.pieOptions.clockwise) {
      this.pie.sort((a: any, b: any) => b.value - a.value);
    }

    // Create arc generator
    this.arc = d3.arc()
      .innerRadius(this.pieOptions.innerRadius)
      .outerRadius(this.pieOptions.outerRadius)
      .cornerRadius(this.pieOptions.cornerRadius)
      .padAngle(this.pieOptions.padAngle);
  }

  private drawPieSlices(chartGroup: any, d3: any): void {
    const pieSlices = chartGroup.selectAll('.pie-slice')
      .data(this.pie(this.pieData))
      .enter().append('g')
      .attr('class', 'pie-slice');

    // Draw paths
    const paths = pieSlices.append('path')
      .attr('class', 'slice-path')
      .attr('fill', (d: any) => d.data.color)
      .attr('stroke', this.getBackgroundColor())
      .attr('stroke-width', 1);

    // Animation
    if (this.config.animated) {
      paths
        .attr('d', this.arc.outerRadius(0))
        .transition()
        .duration(this.config.animationDuration || 750)
        .ease(d3.easeElastic.amplitude(1).period(0.3))
        .attr('d', this.arc);
    } else {
      paths.attr('d', this.arc);
    }

    // Store reference for interactions
    pieSlices.each((d: any, i: number, nodes: any) => {
      nodes[i].__pieData__ = d;
    });
  }

  private drawLabels(chartGroup: any, d3: any): void {
    if (!this.pieOptions.showLabels) return;

    const labelGroup = chartGroup.append('g')
      .attr('class', 'pie-labels');

    const labels = labelGroup.selectAll('.pie-label')
      .data(this.pie(this.pieData))
      .enter().append('g')
      .attr('class', 'pie-label');

    // Calculate label positions
    const outerRadius = this.pieOptions.outerRadius || 100;
    const labelOffset = this.pieOptions.labelOffset || 20;
    const labelArc = d3.arc()
      .innerRadius(outerRadius + labelOffset)
      .outerRadius(outerRadius + labelOffset);

    // Add connecting lines for outside labels
    if (this.pieOptions.labelPosition === 'outside') {
      labels.append('line')
        .attr('class', 'label-line')
        .attr('stroke', this.getTextColor())
        .attr('stroke-width', 1)
        .attr('opacity', 0.6);
    }

    // Add label text
    const labelTexts = labels.append('text')
      .attr('class', 'label-text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', this.getTextColor())
      .style('pointer-events', 'none');

    // Position labels
    this.positionLabels(labels, labelTexts, labelArc, d3);
  }

  private positionLabels(labels: any, labelTexts: any, labelArc: any, d3: any): void {
    const total = d3.sum(this.pieData, (d: any) => d.value);

    labels.each((d: any, i: number, nodes: any) => {
      const centroid = labelArc.centroid(d);
      
      let labelText = d.data.label;
      
      // Add value and/or percentage
      if (this.pieOptions.showValues || this.pieOptions.showPercentages) {
        const parts = [labelText];
        
        if (this.pieOptions.showValues) {
          parts.push(this.formatValue(d.data.value));
        }
        
        if (this.pieOptions.showPercentages) {
          const percentage = ((d.data.value / total) * 100).toFixed(1);
          parts.push(`${percentage}%`);
        }
        
        labelText = parts.join('\n');
      }

      const textElement = d3.select(nodes[i]).select('.label-text');
      
      if (this.pieOptions.labelPosition === 'outside') {
        // Position outside the pie
        const x = centroid[0];
        const y = centroid[1];
        
        textElement
          .attr('transform', `translate(${x}, ${y})`)
          .text(labelText);

        // Update connecting line
        const lineElement = d3.select(nodes[i]).select('.label-line');
        const innerCentroid = this.arc.centroid(d);
        
        lineElement
          .attr('x1', innerCentroid[0])
          .attr('y1', innerCentroid[1])
          .attr('x2', x)
          .attr('y2', y);
          
      } else {
        // Position inside the pie
        const innerCentroid = this.arc.centroid(d);
        textElement
          .attr('transform', `translate(${innerCentroid[0]}, ${innerCentroid[1]})`)
          .attr('fill', ChartUtils.getContrastingTextColor(d.data.color))
          .text(labelText);
      }

      // Handle multi-line text
      if (labelText.includes('\n')) {
        const lines = labelText.split('\n');
        textElement.text('');
        
        lines.forEach((line: string, lineIndex: number) => {
          textElement.append('tspan')
            .attr('x', 0)
            .attr('dy', lineIndex === 0 ? '0.35em' : '1.2em')
            .text(line);
        });
      }
    });
  }

  private setupInteractions(chartGroup: any): void {
    const slices = chartGroup.selectAll('.pie-slice');

    slices
      .style('cursor', this.config.clickable ? 'pointer' : 'default')
      .on('mouseenter', (event: any, d: any) => this.handleMouseEnter(event, d))
      .on('mousemove', (event: any, d: any) => this.handleMouseMove(event, d))
      .on('mouseleave', (event: any, d: any) => this.handleMouseLeave(event, d))
      .on('click', (event: any, d: any) => this.handleSliceClick(event, d));
  }

  private handleMouseEnter(event: any, _d: any): void {
    const slice = event.currentTarget;
    const sliceData = slice.__pieData__;
    
    // Show tooltip
    if (this.config.showTooltip) {
      this.showTooltip(event, sliceData.data.originalData);
    }

    // Explode slice on hover
    if (this.pieOptions.explodeOnHover) {
      const angle = (sliceData.startAngle + sliceData.endAngle) / 2;
      const explodeDistance = this.pieOptions.explodeDistance || 10;
      const x = Math.cos(angle - Math.PI / 2) * explodeDistance;
      const y = Math.sin(angle - Math.PI / 2) * explodeDistance;
      
      const d3 = (window as any).d3;
      d3.select(slice)
        .transition()
        .duration(150)
        .attr('transform', `translate(${x}, ${y})`);
    }

    // Highlight effect
    const d3 = (window as any).d3;
    const path = d3.select(slice).select('.slice-path');
    const originalColor = path.attr('fill');
    path.attr('fill', ChartUtils.adjustColorBrightness(originalColor, 10));
  }

  private handleMouseMove(event: any, _d: any): void {
    if (this.config.showTooltip) {
      this.updateTooltipPosition(event);
    }
  }

  private handleMouseLeave(event: any, _d: any): void {
    const slice = event.currentTarget;
    const sliceData = slice.__pieData__;
    
    // Hide tooltip
    this.hideTooltip();

    // Return slice to original position
    if (this.pieOptions.explodeOnHover) {
      const d3 = (window as any).d3;
      d3.select(slice)
        .transition()
        .duration(150)
        .attr('transform', 'translate(0, 0)');
    }

    // Remove highlight
    const d3 = (window as any).d3;
    const path = d3.select(slice).select('.slice-path');
    path.attr('fill', sliceData.data.color);
  }

  private handleSliceClick(event: any, _d: any): void {
    if (!this.config.clickable) return;
    
    const sliceData = event.currentTarget.__pieData__;
    this.handleClick(event, sliceData.data.originalData);
  }

  protected formatTooltipContent(data: ChartData): string {
    const total = this.pieData.reduce((sum, d) => sum + d.value, 0);
    const value = data.value || 0;
    const percentage = ((value / total) * 100).toFixed(1);
    
    return `
      <strong>${data.label || data.name || 'Unknown'}</strong><br>
      Value: ${this.formatValue(value)}<br>
      Percentage: ${percentage}%
    `;
  }
}