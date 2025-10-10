/**
 * Annie Chart Processor - D3.js Integration Layer
 * Converts Annie data attributes into D3.js chart configurations
 */

import { jsonLogic } from '../utils/json-logic.js';
import { DataStore } from '../core/data-store.js';
import { Logger } from '../core/logger.js';

// D3.js global declaration
declare const d3: any;

export interface ChartConfig {
    type: string;
    source: string;
    x?: string;
    y?: string | string[];
    title?: string;
    colors?: string[];
    width?: number;
    height?: number;
    interactive?: boolean;
    legend?: boolean;
    [key: string]: any;
}

export interface ChartData {
    label: string;
    value: number;
    color?: string;
    drillid?: string;
    [key: string]: any;
}

export class AnnieChartProcessor {
    private dataStore: DataStore;
    private logger: Logger;
    private chartTypes: Map<string, any> = new Map();
    private loadedLibraries: Set<string> = new Set();

    constructor(dataStore: DataStore, logger: Logger) {
        this.dataStore = dataStore;
        this.logger = logger;
        this.registerDefaultCharts();
    }

    /**
     * Process all chart elements in the document
     */
    public processCharts(): void {
        const chartElements = document.querySelectorAll('[data-annie-chart]');
        chartElements.forEach(element => this.processChart(element as HTMLElement));
    }

    /**
     * Process a single chart element
     */
    public async processChart(element: HTMLElement): Promise<void> {
        try {
            const config = this.parseChartConfig(element);
            await this.ensureChartLibraryLoaded(config.type);
            
            const data = this.getData(config.source);
            const processedData = this.processData(data, config);
            
            this.renderChart(element, config, processedData);
            this.setupObservers(element, config);
            
        } catch (error) {
            this.logger.error(`Chart processing error: ${error}`);
            this.showChartError(element, error);
        }
    }

    /**
     * Parse chart configuration from data attributes
     */
    private parseChartConfig(element: HTMLElement): ChartConfig {
        const config: ChartConfig = {
            type: 'bar',
            source: 'default'
        };

        // Parse each data attribute
        for (const attr of Array.from(element.attributes)) {
            if (attr.name.startsWith('data-annie-')) {
                const key = attr.name.replace('data-annie-', '').replace(/-/g, '_');
                let value = attr.value;

                // Handle JsonLogic expressions
                if (this.isJsonLogic(value)) {
                    const contextData = this.getContextData();
                    value = jsonLogic.apply(JSON.parse(value).jsonlogic, contextData);
                }
                
                // Type conversion
                if (key === 'colors' || key === 'y') {
                    try {
                        (config as any)[key] = JSON.parse(value);
                    } catch {
                        (config as any)[key] = value;
                    }
                } else if (['width', 'height'].includes(key)) {
                    (config as any)[key] = parseInt(value);
                } else if (['interactive', 'legend'].includes(key)) {
                    (config as any)[key] = value === 'true';
                } else {
                    (config as any)[key] = value;
                }
            }
        }

        return config;
    }

    /**
     * Get data from Annie's DataStore
     */
    private getData(source: string): any[] {
        const dataset = this.dataStore.getDataset(source);
        if (!dataset) {
            throw new Error(`Dataset '${source}' not found`);
        }
        return dataset.data || [];
    }

    /**
     * Process and transform data for chart consumption
     */
    private processData(data: any[], config: ChartConfig): ChartData[] {
        return data.map((item, index) => {
            const chartData: ChartData = {
                label: config.x ? item[config.x] : `Item ${index + 1}`,
                value: 0,
                color: config.colors?.[index % config.colors.length] || this.getDefaultColor(index),
                drillid: item.id || item.drillid || index
            };

            // Handle Y values (single or multiple)
            if (Array.isArray(config.y)) {
                chartData.values = config.y.map(field => item[field] || 0);
                chartData.value = chartData.values[0]; // Primary value
            } else {
                chartData.value = item[config.y || 'value'] || 0;
            }

            // Copy additional fields
            Object.keys(item).forEach(key => {
                if (!chartData.hasOwnProperty(key)) {
                    chartData[key] = item[key];
                }
            });

            return chartData;
        });
    }

    /**
     * Render chart using appropriate D3.js implementation
     */
    private renderChart(element: HTMLElement, config: ChartConfig, data: ChartData[]): void {
        // Clear existing content
        element.innerHTML = '';

        // Create SVG container
        const svg = d3.select(element)
            .append('svg')
            .attr('width', config.width || 450)
            .attr('height', config.height || 250)
            .attr('class', 'annie-chart');

        // Get chart renderer
        const chartRenderer = this.chartTypes.get(config.type);
        if (!chartRenderer) {
            throw new Error(`Chart type '${config.type}' not supported`);
        }

        // Render chart
        chartRenderer.render(svg, data, config, element);
        
        this.logger.debug(`Chart '${config.type}' rendered with ${data.length} data points`);
    }

    /**
     * Setup observers for real-time updates
     */
    private setupObservers(element: HTMLElement, config: ChartConfig): void {
        // Watch for data source changes (using waitForData as observe doesn't exist)
        this.dataStore.waitForData(config.source).then(() => {
            this.processChart(element);
        }).catch(() => {
            // Data not available, chart will render with empty state
        });

        // Observe context changes (for JsonLogic re-evaluation)
        if (this.hasJsonLogic(element)) {
            // Re-evaluate on user/theme/device changes
            window.addEventListener('resize', () => this.processChart(element));
        }
    }

    /**
     * Register default chart types
     */
    private registerDefaultCharts(): void {
        // We'll implement these as separate modules
        this.chartTypes.set('pie', new PieChartRenderer());
        this.chartTypes.set('dashboard', new DashboardRenderer());
        this.chartTypes.set('bar', new BarChartRenderer());
        this.chartTypes.set('line', new LineChartRenderer());
    }

    /**
     * Ensure chart library is loaded
     */
    private async ensureChartLibraryLoaded(chartType: string): Promise<void> {
        if (!this.loadedLibraries.has('d3')) {
            await this.loadScript('/libs/d3.min.js');
            this.loadedLibraries.add('d3');
        }

        if (!this.loadedLibraries.has(chartType)) {
            await this.loadScript(`/charts/${chartType}-chart.js`);
            this.loadedLibraries.add(chartType);
        }
    }

    /**
     * Load external script
     */
    private loadScript(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Get context data for JsonLogic evaluation
     */
    private getContextData(): any {
        return {
            user: (window as any).annie?.getCurrentUser() || {},
            device: {
                isMobile: window.innerWidth < 768,
                width: window.innerWidth,
                height: window.innerHeight
            },
            theme: document.body.className.includes('dark') ? 'dark' : 'light',
            time: {
                hour: new Date().getHours(),
                isNight: new Date().getHours() >= 18 || new Date().getHours() < 6
            },
            data: this.getDataMetrics()
        };
    }

    /**
     * Helper methods
     */
    private isJsonLogic(value: string): boolean {
        try {
            const parsed = JSON.parse(value);
            return parsed.hasOwnProperty('jsonlogic');
        } catch {
            return false;
        }
    }

    private hasJsonLogic(element: HTMLElement): boolean {
        return Array.from(element.attributes).some(attr => 
            this.isJsonLogic(attr.value)
        );
    }

    private getDefaultColor(index: number): string {
        const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
        return colors[index % colors.length];
    }

    private getDataMetrics(): any {
        // Return metrics about current datasets
        return {
            count: this.dataStore.getAllDatasetNames().length,
            // Add more metrics as needed
        };
    }

    private showChartError(element: HTMLElement, error: any): void {
        element.innerHTML = `
            <div class="annie-chart-error">
                <h4>Chart Error</h4>
                <p>${error.message}</p>
                <small>Check console for details</small>
            </div>
        `;
    }
}

/**
 * Base chart renderer interface
 */
export abstract class ChartRenderer {
    abstract render(svg: any, data: ChartData[], config: ChartConfig, element: HTMLElement): void;
}

/**
 * Dashboard renderer - ports your existing createDashboard logic
 */
class DashboardRenderer extends ChartRenderer {
    render(svg: any, data: ChartData[], config: ChartConfig, element: HTMLElement): void {
        // Port your existing createDashboard logic here
        const _width = config.width || 450;
        const _height = config.height || 250;
        
        // Add pie chart group
        const _pieGroup = svg.append("g").attr("id", element.id + "pie");
        
        // Use your existing gradPie logic (to be ported)
        if (window.gradPie) {
            window.gradPie.draw(element.id + "pie", this.piedata(data), 125, 130, 100);
        }
        
        // Add legend (port your createTitle logic)
        this.createLegend(svg, data, config);
        
        // Add title
        if (config.title) {
            svg.append("g")
                .attr("class", "y axis axisLeft")
                .attr("transform", "translate(0, 45)")
                .append("text")
                .attr("class", "ytitle")
                .attr("y", "10px")
                .attr("dy", "-2em")
                .attr("dx", "13px")
                .style("text-anchor", "start")
                .text(config.title);
        }
    }
    
    private piedata(data: ChartData[]): any[] {
        return data.map(d => ({
            label: d.label,
            value: d.value,
            color: d.color,
            drillid: d.drillid
        }));
    }
    
    private createLegend(svg: any, data: ChartData[], _config: ChartConfig): void {
        let yTitle = 0;
        const gElement = svg.append("g")
            .attr("class", "y axis axisLeft")
            .attr("transform", "translate(280, 50)");
            
        data.forEach(element => {
            if (element.label !== '') {
                yTitle += 25;
                
                // Create clickable link (if drilldown enabled)
                const gElement2 = gElement.append("a")
                    .attr("xlink:href", `/admin/user-drill?i=${element.label}`);
                
                // Add text
                gElement2.append("text")
                    .attr("class", "ytitle")
                    .attr("y", yTitle)
                    .attr("dy", "-2em")
                    .attr("dx", "13px")
                    .style("text-anchor", "start")
                    .text(element.label);
                    
                // Add color rectangle
                gElement2.append("rect")
                    .attr("style", `fill:${element.color};`)
                    .attr("x", -20)
                    .attr("width", 20)
                    .attr("y", yTitle - 57)
                    .attr("height", 20);
            }
        });
    }
}

/**
 * Pie chart renderer
 */
class PieChartRenderer extends ChartRenderer {
    render(svg: any, data: ChartData[], config: ChartConfig, _element: HTMLElement): void {
        const width = config.width || 450;
        const height = config.height || 250;
        const radius = Math.min(width, height) / 2 - 10;
        
        const g = svg.append("g")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);
        
        const pie = d3.pie()
            .value((d: any) => d.value)
            .sort(null);
        
        const path = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);
        
        const arcs = g.selectAll(".arc")
            .data(pie(data))
            .enter().append("g")
            .attr("class", "arc");
        
        arcs.append("path")
            .attr("d", path as any)
            .attr("fill", (d: any) => d.data.color);
        
        if (config.legend) {
            arcs.append("text")
                .attr("transform", (d: any) => `translate(${(path as any).centroid(d)})`)
                .attr("dy", ".35em")
                .style("text-anchor", "middle")
                .text((d: any) => d.data.label);
        }
    }
}

/**
 * Bar chart renderer
 */
class BarChartRenderer extends ChartRenderer {
    render(_svg: any, _data: ChartData[], _config: ChartConfig, _element: HTMLElement): void {
        // Implement standard bar chart using D3.js
        // This would be a new implementation following D3.js patterns
    }
}

/**
 * Line chart renderer
 */
class LineChartRenderer extends ChartRenderer {
    render(_svg: any, _data: ChartData[], _config: ChartConfig, _element: HTMLElement): void {
        // Implement standard line chart using D3.js
        // This would be a new implementation following D3.js patterns
    }
}

// Global interface for legacy gradPie support
declare global {
    interface Window {
        gradPie: any;
    }
}