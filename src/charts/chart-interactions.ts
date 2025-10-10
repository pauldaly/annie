/**
 * Annie Charts - Interactive Actions and Navigation
 * Extends chart system with Annie-style interactions
 */

// Chart interaction configuration
export interface ChartInteraction {
  // Navigation actions
  navigate?: {
    url?: string;                    // Direct URL navigation
    route?: string;                  // Annie route navigation
    target?: '_self' | '_blank' | '_parent' | '_top'; // Window target
    params?: { [key: string]: any }; // URL parameters
  };
  
  // Popup/Modal actions
  popup?: {
    type: 'modal' | 'tooltip' | 'sidebar' | 'drawer';
    content?: string;                // HTML content
    template?: string;               // Template name
    data?: any;                      // Data to pass
    size?: 'small' | 'medium' | 'large' | 'fullscreen';
  };
  
  // Custom function calls
  action?: {
    function: string;                // Function name to call
    params?: any[];                  // Parameters to pass
    context?: any;                   // Context object
  };
  
  // Annie-specific actions
  annie?: {
    trigger?: string;                // Annie trigger to fire
    dataUpdate?: string;             // Update dataset
    stateChange?: { [key: string]: any }; // State changes
    notification?: {
      message: string;
      type?: 'info' | 'success' | 'warning' | 'error';
    };
  };
  
  // Analytics/Tracking
  analytics?: {
    event: string;                   // Analytics event name
    category?: string;               // Event category
    label?: string;                  // Event label
    value?: number;                  // Event value
  };
}

// Enhanced chart data with interactions
export interface InteractiveChartData {
  label: string;
  value: number;
  color?: string;
  
  // Element-specific interactions
  onClick?: ChartInteraction;        // Click action
  onHover?: ChartInteraction;        // Hover action
  onDoubleClick?: ChartInteraction;  // Double-click action
  
  // Custom data for interactions
  metadata?: { [key: string]: any }; // Additional data
  drillDownData?: any[];             // Drill-down data
  contextMenu?: ChartInteraction[];  // Right-click menu
}

// Chart-level interaction configuration
export interface ChartInteractionConfig {
  // Global interactions (apply to all elements)
  global?: {
    onClick?: ChartInteraction;
    onHover?: ChartInteraction;
    onDoubleClick?: ChartInteraction;
  };
  
  // Element-specific interactions override globals
  elementInteractions?: boolean;     // Allow element overrides
  
  // Interaction behavior
  preventDefault?: boolean;          // Prevent default behaviors
  stopPropagation?: boolean;        // Stop event bubbling
  
  // Visual feedback
  hoverEffect?: {
    enabled: boolean;
    style?: 'highlight' | 'explode' | 'glow' | 'scale';
    intensity?: number;
  };
  
  clickEffect?: {
    enabled: boolean;
    style?: 'pulse' | 'bounce' | 'flash';
    duration?: number;
  };
}

/**
 * Interactive Chart Action Handler
 * Processes chart interactions and integrates with Annie ecosystem
 */
export class ChartActionHandler {
  private static instance: ChartActionHandler;
  
  static getInstance(): ChartActionHandler {
    if (!this.instance) {
      this.instance = new ChartActionHandler();
    }
    return this.instance;
  }
  
  /**
   * Handle chart element click
   */
  handleElementClick(
    data: InteractiveChartData, 
    element: any, 
    chartConfig: ChartInteractionConfig,
    event: MouseEvent
  ): void {
    // Prevent default if configured
    if (chartConfig.preventDefault) {
      event.preventDefault();
    }
    
    if (chartConfig.stopPropagation) {
      event.stopPropagation();
    }
    
    // Apply click effect
    this.applyClickEffect(element, chartConfig.clickEffect);
    
    // Determine which interaction to use (element-specific overrides global)
    const interaction = data.onClick || chartConfig.global?.onClick;
    
    if (interaction) {
      this.executeInteraction(interaction, data, element, event);
    }
    
    // Fire Annie custom event
    this.fireAnnieEvent('chart-element-click', {
      data: data,
      element: element,
      interaction: interaction,
      originalEvent: event
    });
  }
  
  /**
   * Execute a chart interaction
   */
  private executeInteraction(
    interaction: ChartInteraction, 
    data: InteractiveChartData, 
    element: any, 
    event: Event
  ): void {
    
    // Navigation action
    if (interaction.navigate) {
      this.handleNavigation(interaction.navigate, data);
    }
    
    // Popup/Modal action
    if (interaction.popup) {
      this.handlePopup(interaction.popup, data, element);
    }
    
    // Custom function action
    if (interaction.action) {
      this.handleCustomAction(interaction.action, data, element, event);
    }
    
    // Annie-specific actions
    if (interaction.annie) {
      this.handleAnnieActions(interaction.annie, data);
    }
    
    // Analytics tracking
    if (interaction.analytics) {
      this.handleAnalytics(interaction.analytics, data);
    }
  }
  
  /**
   * Handle navigation actions
   */
  private handleNavigation(nav: ChartInteraction['navigate'], data: InteractiveChartData): void {
    if (!nav) return;
    
    let url = nav.url;
    
    // Handle Annie route navigation
    if (nav.route) {
      const annie = (window as any).Annie;
      if (annie && annie.router) {
        // Replace route parameters with data values
        url = this.replaceParameters(nav.route, data);
        annie.router.navigate(url);
        return;
      }
    }
    
    // Handle direct URL navigation
    if (url) {
      // Replace URL parameters with data values
      url = this.replaceParameters(url, data);
      
      // Add query parameters if specified
      if (nav.params) {
        const urlObj = new URL(url, window.location.origin);
        Object.entries(nav.params).forEach(([key, value]) => {
          urlObj.searchParams.set(key, String(value));
        });
        url = urlObj.toString();
      }
      
      // Navigate based on target
      const target = nav.target || '_self';
      if (target === '_self') {
        window.location.href = url;
      } else {
        window.open(url, target);
      }
    }
  }
  
  /**
   * Handle popup/modal actions
   */
  private handlePopup(popup: ChartInteraction['popup'], data: InteractiveChartData, element: any): void {
    if (!popup) return;
    
    switch (popup.type) {
      case 'modal':
        this.showModal(popup, data);
        break;
        
      case 'tooltip':
        this.showTooltip(popup, data, element);
        break;
        
      case 'sidebar':
        this.showSidebar(popup, data);
        break;
        
      case 'drawer':
        this.showDrawer(popup, data);
        break;
    }
  }
  
  /**
   * Handle custom function actions
   */
  private handleCustomAction(
    action: ChartInteraction['action'], 
    data: InteractiveChartData, 
    element: any, 
    event: Event
  ): void {
    if (!action) return;
    
    try {
      // Get function from global scope or context
      const context = action.context || window;
      let func: Function | undefined;
      
      if (typeof action.function === 'string') {
        func = this.getNestedProperty(context, action.function);
      }
      
      if (typeof func === 'function') {
        const params = action.params || [];
        // Always pass chart data, element, and event as additional parameters
        func.call(context, ...params, data, element, event);
      } else {
        console.warn(`Chart action function '${action.function}' not found`);
      }
    } catch (error) {
      console.error('Error executing chart action:', error);
    }
  }
  
  /**
   * Handle Annie-specific actions
   */
  private handleAnnieActions(annie: ChartInteraction['annie'], data: InteractiveChartData): void {
    if (!annie) return;
    
    const annieGlobal = (window as any).Annie;
    
    // Fire Annie trigger
    if (annie.trigger && annieGlobal?.triggers) {
      annieGlobal.triggers.fire(annie.trigger, data);
    }
    
    // Update dataset
    if (annie.dataUpdate && annieGlobal?.dataStore) {
      // This could update related datasets based on the clicked data
      annieGlobal.dataStore.setDataset(annie.dataUpdate, [data]);
    }
    
    // State changes
    if (annie.stateChange && annieGlobal?.stateManager) {
      Object.entries(annie.stateChange).forEach(([key, value]) => {
        annieGlobal.stateManager.setState(key, value);
      });
    }
    
    // Show notification
    if (annie.notification && annieGlobal?.notifications) {
      annieGlobal.notifications.show(
        annie.notification.message,
        annie.notification.type || 'info'
      );
    }
  }
  
  /**
   * Handle analytics tracking
   */
  private handleAnalytics(analytics: ChartInteraction['analytics'], data: InteractiveChartData): void {
    if (!analytics) return;
    
    // Google Analytics 4
    if ((window as any).gtag) {
      (window as any).gtag('event', analytics.event, {
        event_category: analytics.category,
        event_label: analytics.label || data.label,
        value: analytics.value || data.value
      });
    }
    
    // Google Analytics Universal
    if ((window as any).ga) {
      (window as any).ga('send', 'event', {
        eventCategory: analytics.category,
        eventAction: analytics.event,
        eventLabel: analytics.label || data.label,
        eventValue: analytics.value || data.value
      });
    }
    
    // Custom analytics
    this.fireAnnieEvent('chart-analytics', {
      event: analytics.event,
      category: analytics.category,
      label: analytics.label || data.label,
      value: analytics.value || data.value,
      chartData: data
    });
  }
  
  /**
   * Apply visual click effect
   */
  private applyClickEffect(element: any, effect?: ChartInteractionConfig['clickEffect']): void {
    if (!effect?.enabled) return;
    
    const d3 = (window as any).d3;
    if (!d3 || !element) return;
    
    const duration = effect.duration || 300;
    
    switch (effect.style) {
      case 'pulse':
        d3.select(element)
          .transition()
          .duration(duration / 2)
          .style('opacity', 0.5)
          .transition()
          .duration(duration / 2)
          .style('opacity', 1);
        break;
        
      case 'bounce':
        d3.select(element)
          .transition()
          .duration(duration / 3)
          .attr('transform', 'scale(1.1)')
          .transition()
          .duration(duration / 3)
          .attr('transform', 'scale(0.95)')
          .transition()
          .duration(duration / 3)
          .attr('transform', 'scale(1)');
        break;
        
      case 'flash':
        const originalFill = d3.select(element).attr('fill');
        d3.select(element)
          .transition()
          .duration(duration / 2)
          .attr('fill', '#ffffff')
          .transition()
          .duration(duration / 2)
          .attr('fill', originalFill);
        break;
    }
  }
  
  /**
   * Replace parameters in strings with data values
   */
  private replaceParameters(template: string, data: InteractiveChartData): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      if (key === 'label') return encodeURIComponent(data.label);
      if (key === 'value') return String(data.value);
      if (data.metadata && key in data.metadata) {
        return encodeURIComponent(String(data.metadata[key]));
      }
      return match; // Return unchanged if no replacement found
    });
  }
  
  /**
   * Get nested property from object by string path
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  /**
   * Fire Annie custom event
   */
  private fireAnnieEvent(eventName: string, detail: any): void {
    const event = new CustomEvent(`annie-${eventName}`, {
      detail: detail,
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(event);
  }
  
  // Popup implementation methods (simplified for now)
  private showModal(popup: any, data: InteractiveChartData): void {
    console.log('Show modal:', popup, data);
    // Implementation would integrate with Annie's modal system
  }
  
  private showTooltip(popup: any, data: InteractiveChartData, element: any): void {
    console.log('Show tooltip:', popup, data, element);
    // Implementation would show rich tooltip
  }
  
  private showSidebar(popup: any, data: InteractiveChartData): void {
    console.log('Show sidebar:', popup, data);
    // Implementation would integrate with Annie's sidebar system
  }
  
  private showDrawer(popup: any, data: InteractiveChartData): void {
    console.log('Show drawer:', popup, data);
    // Implementation would integrate with Annie's drawer system
  }
}