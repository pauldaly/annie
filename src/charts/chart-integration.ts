/**
 * Annie Charts - Integration with Annie Framework
 * Connects the chart system to Annie's core functionality
 */

import { SimpleChart, SimpleChartConfig, SimpleChartData } from './simple-chart';

export class AnnieChartIntegration {
  private static charts: Map<string, SimpleChart> = new Map();
  private static initialized = false;

  /**
   * Initialize Annie chart system
   */
  static initialize(): void {
    if (this.initialized) return;

    // Process existing chart elements on page
    this.processExistingCharts();

    // Setup mutation observer for dynamic charts
    this.setupMutationObserver();

    this.initialized = true;
    console.log('Annie Chart System initialized');
  }

  /**
   * Process existing chart elements in the DOM
   */
  static processExistingCharts(): void {
    const chartElements = document.querySelectorAll('[annie-chart]');
    
    chartElements.forEach((element: Element) => {
      this.processChartElement(element as HTMLElement);
    });
  }

  /**
   * Process a single chart element
   */
  static processChartElement(element: HTMLElement): void {
    try {
      const chartType = element.getAttribute('annie-chart');
      const configAttr = element.getAttribute('annie-chart-config');
      const dataSource = element.getAttribute('annie-data-source');

      if (!chartType) {
        console.warn('Chart element missing annie-chart attribute');
        return;
      }

      // Parse configuration
      let config: SimpleChartConfig = { type: chartType as any };
      
      if (configAttr) {
        try {
          const parsedConfig = JSON.parse(configAttr);
          config = { ...config, ...parsedConfig };
        } catch (error) {
          console.error('Invalid JSON in annie-chart-config:', error);
        }
      }

      // Set container dimensions if not specified
      if (!config.width) config.width = element.clientWidth || 400;
      if (!config.height) config.height = element.clientHeight || 300;

      // Create chart instance
      const chart = new SimpleChart(config);
      const chartId = element.id || `annie-chart-${Date.now()}-${Math.random()}`;
      
      if (!element.id) {
        element.id = chartId;
      }

      // Get data
      const data = this.getChartData(dataSource, element);
      
      // Render chart
      chart.render(chartId, data);
      
      // Store chart reference
      this.charts.set(chartId, chart);

      console.log(`Annie chart created: ${chartType} (${chartId})`);

    } catch (error) {
      console.error('Error processing chart element:', error);
    }
  }

  /**
   * Get chart data from various sources
   */
  private static getChartData(dataSource: string | null, element: HTMLElement): SimpleChartData[] {
    if (!dataSource) {
      // Look for inline data
      const inlineData = element.getAttribute('annie-chart-data');
      if (inlineData) {
        try {
          return JSON.parse(inlineData);
        } catch (error) {
          console.error('Invalid JSON in annie-chart-data:', error);
        }
      }

      // Return sample data if no source specified
      return this.getSampleData();
    }

    // Try to get data from Annie's data store (if available)
    const annieGlobal = (window as any).Annie;
    if (annieGlobal && annieGlobal.dataStore && annieGlobal.dataStore.getDataset) {
      const dataset = annieGlobal.dataStore.getDataset(dataSource);
      if (dataset && dataset.data) {
        return this.transformDatasetToChartData(dataset.data);
      }
    }

    // Try to get data from global variables
    const globalData = (window as any)[dataSource];
    if (globalData && Array.isArray(globalData)) {
      return this.transformDataToChartData(globalData);
    }

    console.warn(`Data source "${dataSource}" not found, using sample data`);
    return this.getSampleData();
  }

  /**
   * Transform Annie dataset to chart data format
   */
  private static transformDatasetToChartData(data: any[]): SimpleChartData[] {
    return data.map((item, index) => ({
      label: item.label || item.name || item.category || `Item ${index + 1}`,
      value: Number(item.value || item.amount || item.count || 0),
      color: item.color
    }));
  }

  /**
   * Transform generic data to chart data format
   */
  private static transformDataToChartData(data: any[]): SimpleChartData[] {
    return data.map((item, index) => {
      if (typeof item === 'object') {
        return {
          label: item.label || item.name || item.category || `Item ${index + 1}`,
          value: Number(item.value || item.amount || item.count || 0),
          color: item.color
        };
      } else {
        return {
          label: `Item ${index + 1}`,
          value: Number(item) || 0
        };
      }
    });
  }

  /**
   * Get sample data for demonstration
   */
  private static getSampleData(): SimpleChartData[] {
    return [
      { label: 'Category A', value: 30, color: '#007bff' },
      { label: 'Category B', value: 45, color: '#28a745' },
      { label: 'Category C', value: 25, color: '#dc3545' }
    ];
  }

  /**
   * Setup mutation observer to detect dynamically added charts
   */
  private static setupMutationObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            
            // Check if the node itself is a chart
            if (element.hasAttribute && element.hasAttribute('annie-chart')) {
              this.processChartElement(element);
            }
            
            // Check for chart elements within the added node
            if (element.querySelectorAll) {
              const chartElements = element.querySelectorAll('[annie-chart]');
              chartElements.forEach((chartEl) => {
                this.processChartElement(chartEl as HTMLElement);
              });
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Create a chart programmatically
   */
  static createChart(containerId: string, config: SimpleChartConfig, data: SimpleChartData[]): SimpleChart {
    const chart = new SimpleChart(config);
    chart.render(containerId, data);
    this.charts.set(containerId, chart);
    return chart;
  }

  /**
   * Update chart data
   */
  static updateChart(chartId: string, data: SimpleChartData[]): void {
    const chart = this.charts.get(chartId);
    if (chart) {
      chart.render(chartId, data);
    } else {
      console.warn(`Chart with id "${chartId}" not found`);
    }
  }

  /**
   * Remove a chart
   */
  static removeChart(chartId: string): void {
    const chart = this.charts.get(chartId);
    if (chart) {
      chart.destroy();
      this.charts.delete(chartId);
    }
  }

  /**
   * Get all chart instances
   */
  static getCharts(): Map<string, SimpleChart> {
    return new Map(this.charts);
  }

  /**
   * Refresh all charts (useful after theme changes, etc.)
   */
  static refreshAllCharts(): void {
    this.charts.forEach((chart, chartId) => {
      const element = document.getElementById(chartId);
      if (element) {
        this.processChartElement(element);
      }
    });
  }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      AnnieChartIntegration.initialize();
    });
  } else {
    AnnieChartIntegration.initialize();
  }
}

// Export for global usage
if (typeof window !== 'undefined') {
  (window as any).AnnieCharts = AnnieChartIntegration;
}

export { SimpleChart, SimpleChartConfig, SimpleChartData };