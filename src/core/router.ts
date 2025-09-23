import { Observable } from './observable.js';
import { DataStore } from './data-store.js';
import { ILogger } from './logger.js';
import { IDisposable } from './di-container.js';
import { 
    dataAttributeManager, 
    DataAttributeCategories,
    setDataState,
    getDataState,
    queryByDataRole
} from '../utils/helpers.js';

export interface RouteConfig {
  target: string | RouteCondition[];
  // FullCalendar removed - use external calendar libraries or modern calendar components
}

export interface RouteCondition {
  name: string;
  condition: {
    datasource: string;
    datafield: string;
    value: any;
  };
}

export interface RouteContainerConfig {
  classstates: {
    active: string;
    enabled: string;
    disabled: string;
  };
  classstatefunction?: string;
}

export class Router implements IDisposable {
    private dataStore: DataStore;
    private logger: ILogger;
    private subscriptions: Array<{ unsubscribe: () => void }> = [];
    private disposed: boolean = false;

    constructor(dataStore: DataStore, logger: ILogger) {
        this.dataStore = dataStore;
        this.logger = logger;
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        const routeContainers = document.querySelectorAll("[data-routecontainer]");
    
        if (routeContainers.length > 0) {
            this.initializeContainerRoutes(routeContainers);
        } else {
            this.initializeIndividualRoutes();
        }
    }

    private initializeContainerRoutes(routeContainers: NodeListOf<Element>): void {
        for (let i = 0; i < routeContainers.length; i++) {
            const routeContainer = routeContainers[i] as HTMLElement;
      
            // Mark route containers with framework data attributes
            dataAttributeManager.setAttribute(routeContainer, DataAttributeCategories.FRAMEWORK, 'route-container');
            dataAttributeManager.setAttribute(routeContainer, DataAttributeCategories.ROLE, 'navigation-container');
      
            const routes = routeContainer.querySelectorAll("[data-route]");
      
            for (let j = 0; j < routes.length; j++) {
                const route = routes[j] as HTMLElement;
        
                // Mark individual routes with data attributes
                dataAttributeManager.setAttribute(route, DataAttributeCategories.FRAMEWORK, 'route-element');
                dataAttributeManager.setAttribute(route, DataAttributeCategories.ROLE, 'route-enabled');
                setDataState(route, 'route-state', 'enabled');
        
                this.setupRouteClickHandler(route, routeContainer);
            }
        }
    }

    private initializeIndividualRoutes(): void {
        const routes = document.querySelectorAll("[data-route]");
    
        for (let i = 0; i < routes.length; i++) {
            const route = routes[i] as HTMLElement;
      
            // Skip routes that are already in containers
            if (!route.closest('[data-routecontainer]')) {
                dataAttributeManager.setAttribute(route, DataAttributeCategories.FRAMEWORK, 'route-element');
                dataAttributeManager.setAttribute(route, DataAttributeCategories.ROLE, 'route-standalone');
                setDataState(route, 'route-state', 'enabled');
        
                this.setupSimpleRouteClickHandler(route);
            }
        }
    }

    private setupRouteClickHandler(route: HTMLElement, container: Element): void {
        if (this.disposed) return;

        const routeClick = Observable.fromEvent(route, "click");
    
        const subscription = routeClick.subscribe({
            next: () => {
                if (route.hasAttribute("disabled")) {
                    return;
                }

                const containerConfig = this.getContainerConfig(container);
                const routeConfig = this.getRouteConfig(route);
        
                if (!containerConfig || !routeConfig) {
                    return;
                }

                const target = this.resolveTarget(routeConfig.target);
                if (target) {
                    this.navigateToView(target);
                    this.updateNavStyles(route, containerConfig);
                    // FullCalendar handling removed - implement externally if needed
                }
            },
            error: (e: any) => {
                this.logger.error(`Route navigation error: ${e}`);
            },
            complete: () => {
                // Navigation complete
            }
        });

        this.subscriptions.push(subscription);
    }

    private setupSimpleRouteClickHandler(route: HTMLElement): void {
        if (this.disposed) return;

        const routeClick = Observable.fromEvent(route, "click");
    
        const subscription = routeClick.subscribe({
            next: () => {
                if (route.hasAttribute("disabled")) {
                    return;
                }

                const routeConfig = this.getRouteConfig(route);
                if (!routeConfig) {
                    return;
                }

                const target = this.resolveTarget(routeConfig.target);
                if (target) {
                    this.navigateToView(target);
                    // FullCalendar handling removed - implement externally if needed
                }
            },
            error: (e: any) => {
                this.logger.error(`Simple route navigation error: ${e}`);
            },
            complete: () => {
                // Navigation complete
            }
        });

        this.subscriptions.push(subscription);
    }

    private getContainerConfig(container: Element): RouteContainerConfig | null {
        const configJson = container.getAttribute("data-routecontainer");
        if (!configJson) {
            return null;
        }

        try {
            return JSON.parse(configJson);
        } catch (error) {
            this.logger.error(`Failed to parse route container config: ${error}`);
            return null;
        }
    }

    private getRouteConfig(route: HTMLElement): RouteConfig | null {
        const configJson = route.getAttribute("data-route");
        if (!configJson) {
            return null;
        }

        try {
            return JSON.parse(configJson);
        } catch (error) {
            this.logger.error(`Failed to parse route config: ${error}`);
            return null;
        }
    }

    private resolveTarget(target: string | RouteCondition[]): string | null {
        if (typeof target === "string") {
            return target;
        }

        if (Array.isArray(target)) {
            for (let condition of target) {
                if (this.evaluateCondition(condition)) {
                    return condition.name;
                }
            }
        }

        return null;
    }

    private evaluateCondition(condition: RouteCondition): boolean {
        const { datasource, datafield, value } = condition.condition;
        const dataset = this.dataStore.getDataset(datasource.replace(/-/g, "_"));
    
        if (dataset && dataset.data[0] && dataset.data[0][datafield] !== undefined) {
            return dataset.data[0][datafield] === value;
        }

        return false;
    }

    private navigateToView(target: string): void {
    // Hide all views and mark them as inactive
        const views = document.querySelectorAll("view");
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            if (view instanceof HTMLElement) {
                view.style.display = "none";
                setDataState(view, 'active', 'false');
                dataAttributeManager.setAttribute(view, DataAttributeCategories.STATE, 'navigation-state', 'hidden');
            }
        }

        // Try to find target by data attribute first, then by ID
        let targetElement: HTMLElement | null = null;
    
        // Look for view with data-component attribute
        const viewElements = dataAttributeManager.getElements(DataAttributeCategories.COMPONENT, 'view');
        targetElement = viewElements.find(el => 
            el.getAttribute('data-view-name') === target || 
      el.id === target
        ) || null;
    
        // Fallback to getElementById
        if (!targetElement) {
            targetElement = document.getElementById(target);
        }

        if (targetElement) {
            targetElement.style.display = "block";
            setDataState(targetElement, 'active', 'true');
            dataAttributeManager.setAttribute(targetElement, DataAttributeCategories.STATE, 'navigation-state', 'active');
            dataAttributeManager.setAttribute(targetElement, DataAttributeCategories.DATA, 'last-activated', Date.now().toString());
      
            this.logger.info(`Navigated to view: ${target}`);
        } else {
            this.logger.warn(`Target view element not found: ${target}`);
        }
    }

    private updateNavStyles(activeRoute: HTMLElement, config: RouteContainerConfig): void {
    // Remove active state from previously active elements using data attributes
        const previousActives = queryByDataRole('route-active');
        previousActives.forEach(element => {
            dataAttributeManager.setAttribute(element, DataAttributeCategories.ROLE, 'route-enabled');
            element.setAttribute('data-nav-state', config.classstates.enabled);
            setDataState(element, 'route-state', 'enabled');
        });

        // Set active state on current route
        dataAttributeManager.setAttribute(activeRoute, DataAttributeCategories.ROLE, 'route-active');
        activeRoute.setAttribute('data-nav-state', config.classstates.active);
        setDataState(activeRoute, 'route-state', 'active');
        dataAttributeManager.setAttribute(activeRoute, DataAttributeCategories.DATA, 'activated-at', Date.now().toString());
    }

    // Public API for programmatic navigation
    navigateTo(target: string): void {
        this.navigateToView(target);
    }

    // Get current active view
    getCurrentView(): string | null {
        const views = document.querySelectorAll("view");
        for (let i = 0; i < views.length; i++) {
            const view = views[i];
            if (view instanceof HTMLElement && view.style.display !== "none") {
                return view.id;
            }
        }
        return null;
    }

    dispose(): void {
        if (this.disposed) return;

        this.logger.debug('Disposing Router');
    
        // Unsubscribe from all observables
        this.subscriptions.forEach(subscription => {
            try {
                subscription.unsubscribe();
            } catch (error) {
                this.logger.warn(`Error unsubscribing from route handler: ${error}`);
            }
        });
    
        this.subscriptions.length = 0; // Clear array
        this.disposed = true;
    
        this.logger.debug('Router disposed successfully');
    }

    isDisposed(): boolean {
        return this.disposed;
    }
}
