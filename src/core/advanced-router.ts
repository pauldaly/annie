/**
 * Advanced Router for Annie Framework
 * 
 * Enhances Annie's existing routing system with:
 * - Route parameters (/user/:id)
 * - Nested routing hierarchies
 * - Lazy loading with preload strategies
 * - Navigation events and lifecycle hooks
 * - Query string handling
 * - History API integration
 * - Route state management
 * 
 * Maintains Annie's AI-first, data-attribute approach while adding enterprise features
 */

import { Observable } from './observable.js';
import { DataStore } from './data-store.js';
import { ILogger } from './logger.js';
import { IDisposable } from './di-container.js';
import { 
    dataAttributeManager, 
    DataAttributeCategories,
    setDataState,
    queryByDataRole
} from '../utils/helpers.js';

// ============================================================================
// Advanced Route Configuration Interfaces
// ============================================================================

export interface AdvancedRouteConfig {
    // Basic routing (existing)
    target?: string | RouteCondition[];
    
    // Advanced features
    path?: string;                    // URL path with parameters: "/user/:id"
    params?: { [key: string]: RouteParamType };  // Parameter type definitions
    query?: { [key: string]: any };   // Default query parameters
    lazy?: string | LazyLoadConfig;   // Lazy loading configuration
    preload?: PreloadStrategy;        // When to preload lazy content
    nested?: boolean;                 // Supports nested child routes
    history?: HistoryMode;            // History API behavior
    state?: any;                      // Route state data
    
    // Lifecycle hooks
    onEnter?: string | string[];      // Functions to call on route enter
    onLeave?: string | string[];      // Functions to call on route leave
    onParams?: string;                // Function to call when params change
    
    // Access control (server-rendered only)
    roles?: string[];                 // Required roles (server validates)
    conditions?: RouteCondition[];    // Data-based conditions
}

export interface LazyLoadConfig {
    module: string;                   // Module/bundle to load
    fallback?: string;                // Loading placeholder content
    timeout?: number;                 // Load timeout in ms
    retry?: number;                   // Retry attempts on failure
}

export interface RouteCondition {
    name: string;
    condition: {
        datasource: string;
        datafield: string;
        value: any;
        operator?: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
    };
}

export interface RouteContainerConfig {
    classstates: {
        active: string;
        enabled: string;
        disabled: string;
        loading?: string;
    };
    classstatefunction?: string;
    nested?: boolean;                 // Container supports nested routes
    lazy?: boolean;                   // Container supports lazy loading
}

export interface NavigationEvent {
    type: 'beforeNavigate' | 'afterNavigate' | 'routeChange' | 'paramChange';
    from?: RouteInfo;
    to: RouteInfo;
    params?: { [key: string]: any };
    query?: { [key: string]: any };
    state?: any;
    timestamp: number;
    cancelled?: boolean;
}

export interface RouteInfo {
    path: string;
    element: HTMLElement;
    params: { [key: string]: any };
    query: { [key: string]: any };
    state: any;
    nested: RouteInfo[];
}

export type RouteParamType = 'string' | 'number' | 'boolean';
export type PreloadStrategy = 'none' | 'hover' | 'visible' | 'immediate';
export type HistoryMode = 'push' | 'replace' | 'none';

// ============================================================================
// Route Parameter Parser
// ============================================================================

export class RouteParams {
    static parse(path: string, url: string): { [key: string]: any } | null {
        const pathParts = path.split('/').filter(p => p);
        const urlParts = url.split('?')[0].split('/').filter(p => p);
        
        if (pathParts.length !== urlParts.length) {
            return null;
        }
        
        const params: { [key: string]: any } = {};
        
        for (let i = 0; i < pathParts.length; i++) {
            const pathPart = pathParts[i];
            const urlPart = urlParts[i];
            
            if (pathPart.startsWith(':')) {
                const paramName = pathPart.substring(1);
                params[paramName] = this.convertParam(urlPart);
            } else if (pathPart !== urlPart) {
                return null; // No match
            }
        }
        
        return params;
    }
    
    static convertParam(value: string): any {
        // Try to convert to number
        if (/^\d+$/.test(value)) {
            return parseInt(value, 10);
        }
        
        if (/^\d*\.\d+$/.test(value)) {
            return parseFloat(value);
        }
        
        // Try to convert to boolean
        if (value === 'true') return true;
        if (value === 'false') return false;
        
        // Return as string
        return decodeURIComponent(value);
    }
    
    static buildPath(path: string, params: { [key: string]: any }): string {
        let result = path;
        
        Object.keys(params).forEach(key => {
            result = result.replace(`:${key}`, encodeURIComponent(String(params[key])));
        });
        
        return result;
    }
}

// ============================================================================
// Query String Handler
// ============================================================================

export class QueryParams {
    static parse(search: string): { [key: string]: any } {
        const params: { [key: string]: any } = {};
        const urlParams = new URLSearchParams(search);
        
        urlParams.forEach((value, key) => {
            params[key] = RouteParams.convertParam(value);
        });
        
        return params;
    }
    
    static stringify(params: { [key: string]: any }): string {
        const urlParams = new URLSearchParams();
        
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                urlParams.set(key, String(params[key]));
            }
        });
        
        return urlParams.toString();
    }
}

// ============================================================================
// Lazy Loading Manager
// ============================================================================

export class LazyLoader {
    private loadedModules = new Set<string>();
    private loadingPromises = new Map<string, Promise<void>>();
    
    async loadModule(config: string | LazyLoadConfig): Promise<void> {
        const moduleConfig = typeof config === 'string' ? { module: config } : config;
        const { module, timeout = 10000, retry = 3 } = moduleConfig;
        
        if (this.loadedModules.has(module)) {
            return Promise.resolve();
        }
        
        if (this.loadingPromises.has(module)) {
            return this.loadingPromises.get(module)!;
        }
        
        const loadPromise = this.loadModuleWithRetry(module, timeout, retry);
        this.loadingPromises.set(module, loadPromise);
        
        try {
            await loadPromise;
            this.loadedModules.add(module);
        } finally {
            this.loadingPromises.delete(module);
        }
    }
    
    private async loadModuleWithRetry(module: string, timeout: number, maxRetries: number): Promise<void> {
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await this.loadModuleScript(module, timeout);
                return;
            } catch (error) {
                lastError = error as Error;
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }
        
        throw lastError || new Error(`Failed to load module: ${module}`);
    }
    
    private loadModuleScript(module: string, timeout: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const timer = setTimeout(() => {
                reject(new Error(`Module load timeout: ${module}`));
            }, timeout);
            
            script.onload = () => {
                clearTimeout(timer);
                resolve();
            };
            
            script.onerror = () => {
                clearTimeout(timer);
                reject(new Error(`Failed to load script: ${module}`));
            };
            
            // Support both .js files and module paths
            if (module.endsWith('.js')) {
                script.src = module;
            } else {
                script.src = `/modules/${module}.js`;
            }
            
            document.head.appendChild(script);
        });
    }
}

// ============================================================================
// Advanced Router Implementation
// ============================================================================

export class AdvancedRouter implements IDisposable {
    private dataStore: DataStore;
    private logger: ILogger;
    private subscriptions: Array<{ unsubscribe: () => void }> = [];
    private disposed: boolean = false;
    
    private lazyLoader = new LazyLoader();
    private currentRoute: RouteInfo | null = null;
    private navigationHistory: RouteInfo[] = [];
    private eventHandlers = new Map<string, Function[]>();
    
    constructor(dataStore: DataStore, logger: ILogger) {
        this.dataStore = dataStore;
        this.logger = logger;
        this.initializeAdvancedRouting();
    }
    
    // ========================================================================
    // Initialization
    // ========================================================================
    
    private initializeAdvancedRouting(): void {
        this.setupHistoryListener();
        this.initializeRouteContainers();
        this.initializeIndividualRoutes();
        this.setupPreloadingObservers();
        this.handleInitialRoute();
    }
    
    private setupHistoryListener(): void {
        if (this.disposed) return;
        
        // Use native event listener since Observable.fromEvent only supports Elements
        const handlePopstate = (event: PopStateEvent) => {
            this.handleHistoryChange(event);
        };
        
        window.addEventListener('popstate', handlePopstate);
        
        // Store cleanup function
        this.subscriptions.push({
            unsubscribe: () => {
                window.removeEventListener('popstate', handlePopstate);
            }
        });
    }
    
    // ========================================================================
    // Route Container Initialization (Enhanced)
    // ========================================================================
    
    private initializeRouteContainers(): void {
        const routeContainers = document.querySelectorAll("[data-routecontainer], [data-annie-route-container]");
        
        routeContainers.forEach(container => {
            this.initializeRouteContainer(container as HTMLElement);
        });
    }
    
    private initializeRouteContainer(container: HTMLElement): void {
        // Mark container with framework data attributes
        dataAttributeManager.setAttribute(container, DataAttributeCategories.FRAMEWORK, 'advanced-route-container');
        dataAttributeManager.setAttribute(container, DataAttributeCategories.ROLE, 'navigation-container');
        
        const routes = container.querySelectorAll("[data-route], [data-annie-route]");
        
        routes.forEach(route => {
            this.initializeRoute(route as HTMLElement, container);
        });
    }
    
    // ========================================================================
    // Individual Route Initialization (Enhanced)
    // ========================================================================
    
    private initializeIndividualRoutes(): void {
        const routes = document.querySelectorAll("[data-route], [data-annie-route]");
        
        routes.forEach(route => {
            const routeElement = route as HTMLElement;
            
            // Skip routes already in containers
            if (!routeElement.closest('[data-routecontainer], [data-annie-route-container]')) {
                this.initializeRoute(routeElement);
            }
        });
    }
    
    private initializeRoute(route: HTMLElement, container?: HTMLElement): void {
        // Mark route with data attributes
        dataAttributeManager.setAttribute(route, DataAttributeCategories.FRAMEWORK, 'advanced-route');
        dataAttributeManager.setAttribute(route, DataAttributeCategories.ROLE, 'route-enabled');
        setDataState(route, 'route-state', 'enabled');
        
        // Setup click handler
        this.setupAdvancedRouteHandler(route, container);
        
        // Setup preloading if configured
        this.setupPreloading(route);
    }
    
    // ========================================================================
    // Advanced Route Handling
    // ========================================================================
    
    private setupAdvancedRouteHandler(route: HTMLElement, container?: HTMLElement): void {
        if (this.disposed) return;
        
        const routeClick = Observable.fromEvent(route, "click");
        
        const subscription = routeClick.subscribe({
            next: async (event: Event) => {
                event.preventDefault();
                await this.handleRouteNavigation(route, container);
            },
            error: (e: any) => {
                this.logger.error(`Advanced route navigation error: ${e}`);
            },
            complete: () => {
                // Route navigation complete
            }
        });
        
        this.subscriptions.push(subscription);
    }
    
    private async handleRouteNavigation(route: HTMLElement, container?: HTMLElement): Promise<void> {
        if (route.hasAttribute("disabled")) {
            return;
        }
        
        const routeConfig = this.getAdvancedRouteConfig(route);
        if (!routeConfig) {
            this.logger.warn('Invalid route configuration');
            return;
        }
        
        try {
            // Call beforeNavigate hooks
            const navigationEvent = this.createNavigationEvent('beforeNavigate');
            await this.callLifecycleHooks(routeConfig.onLeave || [], navigationEvent);
            
            if (navigationEvent.cancelled) {
                return;
            }
            
            // Handle lazy loading
            if (routeConfig.lazy) {
                await this.handleLazyLoading(route, routeConfig.lazy);
            }
            
            // Perform navigation
            await this.navigateToRoute(routeConfig, route, container);
            
            // Call afterNavigate hooks
            const afterEvent = this.createNavigationEvent('afterNavigate');
            await this.callLifecycleHooks(routeConfig.onEnter || [], afterEvent);
            
        } catch (error) {
            this.logger.error(`Route navigation failed: ${error}`);
            this.handleNavigationError(route, error);
        }
    }
    
    // ========================================================================
    // Configuration Parsing (Enhanced)
    // ========================================================================
    
    private getAdvancedRouteConfig(route: HTMLElement): AdvancedRouteConfig | null {
        // Try new data-annie-route attribute first, then fall back to data-route
        const configJson = route.getAttribute("data-annie-route") || route.getAttribute("data-route");
        
        if (!configJson) {
            return null;
        }
        
        try {
            const config = JSON.parse(configJson) as AdvancedRouteConfig;
            
            // Enhanced parsing for new attributes
            config.path = route.getAttribute("data-annie-path") || config.path;
            config.lazy = route.getAttribute("data-annie-lazy") || config.lazy;
            config.preload = (route.getAttribute("data-annie-preload") as PreloadStrategy) || config.preload || 'none';
            config.history = (route.getAttribute("data-annie-history") as HistoryMode) || config.history || 'push';
            
            // Parse lifecycle hooks from attributes
            const onEnter = route.getAttribute("data-annie-on-enter");
            const onLeave = route.getAttribute("data-annie-on-leave");
            const onParams = route.getAttribute("data-annie-on-params");
            
            if (onEnter) config.onEnter = onEnter.split(',').map(h => h.trim());
            if (onLeave) config.onLeave = onLeave.split(',').map(h => h.trim());
            if (onParams) config.onParams = onParams.trim();
            
            // Parse parameters from attribute
            const paramsAttr = route.getAttribute("data-annie-params");
            if (paramsAttr) {
                config.params = JSON.parse(paramsAttr);
            }
            
            // Parse query parameters from attribute  
            const queryAttr = route.getAttribute("data-annie-query");
            if (queryAttr) {
                config.query = JSON.parse(queryAttr);
            }
            
            return config;
            
        } catch (error) {
            this.logger.error(`Failed to parse advanced route config: ${error}`);
            return null;
        }
    }
    
    // ========================================================================
    // Navigation Implementation
    // ========================================================================
    
    private async navigateToRoute(config: AdvancedRouteConfig, route: HTMLElement, container?: HTMLElement): Promise<void> {
        let target: string | null = null;
        
        // Resolve target from various sources
        if (config.path) {
            // Use path-based routing
            target = this.resolvePathTarget(config.path);
        } else if (config.target) {
            // Use traditional target-based routing
            target = typeof config.target === 'string' ? config.target : this.resolveConditionalTarget(config.target);
        }
        
        if (!target) {
            this.logger.warn('Could not resolve navigation target');
            return;
        }
        
        // Parse parameters if path-based routing
        let params: { [key: string]: any } = {};
        let query: { [key: string]: any } = {};
        
        if (config.path) {
            params = RouteParams.parse(config.path, window.location.pathname) || {};
            query = QueryParams.parse(window.location.search);
        }
        
        // Update browser history if configured
        if (config.history && config.history !== 'none') {
            this.updateBrowserHistory(config, params, query);
        }
        
        // Perform the actual view navigation
        await this.navigateToView(target, params, query, config.state);
        
        // Update navigation styles
        if (container) {
            const containerConfig = this.getContainerConfig(container);
            if (containerConfig) {
                this.updateNavStyles(route, containerConfig);
            }
        }
        
        // Update current route info
        this.updateCurrentRoute(target, route, params, query, config.state);
    }
    
    private resolvePathTarget(path: string): string | null {
        // For path-based routing, find view that matches the path pattern
        const views = document.querySelectorAll("view, [data-annie-view]");
        
        for (let i = 0; i < views.length; i++) {
            const viewElement = views[i] as HTMLElement;
            const viewPath = viewElement.getAttribute("data-annie-path") || 
                            viewElement.getAttribute("data-path") ||
                            viewElement.id;
            
            if (viewPath && RouteParams.parse(path, viewPath)) {
                return viewElement.id || viewPath;
            }
        }
        
        return null;
    }
    
    private resolveConditionalTarget(target: RouteCondition[]): string | null {
        for (const condition of target) {
            if (this.evaluateCondition(condition)) {
                return condition.name;
            }
        }
        return null;
    }
    
    // ========================================================================
    // View Navigation (Enhanced)
    // ========================================================================
    
    private async navigateToView(
        target: string, 
        params: { [key: string]: any } = {},
        query: { [key: string]: any } = {},
        state: any = null
    ): Promise<void> {
        
        // Hide all views and mark them as inactive
        const views = document.querySelectorAll("view, [data-annie-view]");
        for (let i = 0; i < views.length; i++) {
            const viewElement = views[i] as HTMLElement;
            viewElement.style.display = "none";
            setDataState(viewElement, 'active', 'false');
            dataAttributeManager.setAttribute(viewElement, DataAttributeCategories.STATE, 'navigation-state', 'hidden');
        }
        
        // Find and show target view
        let targetElement = document.getElementById(target) as HTMLElement;
        
        if (!targetElement) {
            // Try finding by data attributes
            targetElement = document.querySelector(`[data-annie-view="${target}"], [data-view="${target}"]`) as HTMLElement;
        }
        
        if (targetElement) {
            targetElement.style.display = "block";
            setDataState(targetElement, 'active', 'true');
            dataAttributeManager.setAttribute(targetElement, DataAttributeCategories.STATE, 'navigation-state', 'active');
            dataAttributeManager.setAttribute(targetElement, DataAttributeCategories.DATA, 'last-activated', Date.now().toString());
            
            // Set route parameters and query on the view element
            this.setViewParameters(targetElement, params, query, state);
            
            // Handle nested routes if view supports them
            await this.handleNestedRoutes(targetElement, params, query);
            
            this.logger.info(`Navigated to view: ${target} with params: ${JSON.stringify(params)} query: ${JSON.stringify(query)}`);
            
        } else {
            this.logger.warn(`Target view element not found: ${target}`);
        }
    }
    
    private setViewParameters(
        view: HTMLElement, 
        params: { [key: string]: any },
        query: { [key: string]: any },
        state: any
    ): void {
        
        // Store parameters as data attributes for AI/template access
        if (Object.keys(params).length > 0) {
            dataAttributeManager.setAttribute(view, DataAttributeCategories.DATA, 'route-params', JSON.stringify(params));
        }
        
        if (Object.keys(query).length > 0) {
            dataAttributeManager.setAttribute(view, DataAttributeCategories.DATA, 'route-query', JSON.stringify(query));
        }
        
        if (state !== null) {
            dataAttributeManager.setAttribute(view, DataAttributeCategories.DATA, 'route-state', JSON.stringify(state));
        }
        
        // Store in data store for reactive access
        this.dataStore.setDataset('current-route-params', [params]);
        this.dataStore.setDataset('current-route-query', [query]);
        if (state !== null) {
            this.dataStore.setDataset('current-route-state', [state]);
        }
    }
    
    // ========================================================================
    // Lazy Loading
    // ========================================================================
    
    private async handleLazyLoading(route: HTMLElement, lazyConfig: string | LazyLoadConfig): Promise<void> {
        const config = typeof lazyConfig === 'string' ? { module: lazyConfig } : lazyConfig;
        
        // Show loading state
        if (config.fallback) {
            this.showLoadingState(route, config.fallback);
        }
        
        try {
            await this.lazyLoader.loadModule(config);
            this.hideLoadingState(route);
        } catch (error) {
            this.hideLoadingState(route);
            throw error;
        }
    }
    
    private showLoadingState(route: HTMLElement, fallback: string): void {
        dataAttributeManager.setAttribute(route, DataAttributeCategories.STATE, 'loading-state', 'active');
        
        // You could insert loading content here based on fallback
        const loadingElement = document.createElement('div');
        loadingElement.className = 'annie-route-loading';
        loadingElement.innerHTML = fallback || '<div class="annie-loader"></div>';
        loadingElement.setAttribute('data-annie-loading-placeholder', 'true');
        
        route.appendChild(loadingElement);
    }
    
    private hideLoadingState(route: HTMLElement): void {
        dataAttributeManager.setAttribute(route, DataAttributeCategories.STATE, 'loading-state', 'inactive');
        
        const loadingElements = route.querySelectorAll('[data-annie-loading-placeholder="true"]');
        loadingElements.forEach(el => el.remove());
    }
    
    // ========================================================================
    // Preloading
    // ========================================================================
    
    private setupPreloading(route: HTMLElement): void {
        const config = this.getAdvancedRouteConfig(route);
        if (!config || !config.preload || config.preload === 'none' || !config.lazy) {
            return;
        }
        
        switch (config.preload) {
            case 'immediate':
                this.preloadModule(config.lazy);
                break;
                
            case 'hover':
                this.setupHoverPreload(route, config.lazy);
                break;
                
            case 'visible':
                this.setupVisibilityPreload(route, config.lazy);
                break;
        }
    }
    
    private setupHoverPreload(route: HTMLElement, lazyConfig: string | LazyLoadConfig): void {
        let preloadTimer: number | null = null;
        
        const hoverSubscription = Observable.fromEvent(route, 'mouseenter').subscribe({
            next: () => {
                preloadTimer = window.setTimeout(() => {
                    this.preloadModule(lazyConfig);
                }, 100); // Small delay to avoid accidental preloads
            },
            error: (e: any) => {
                this.logger.error(`Hover preload error: ${e}`);
            },
            complete: () => {
                // Hover preload complete
            }
        });
        
        const leaveSubscription = Observable.fromEvent(route, 'mouseleave').subscribe({
            next: () => {
                if (preloadTimer) {
                    clearTimeout(preloadTimer);
                    preloadTimer = null;
                }
            },
            error: (e: any) => {
                this.logger.error(`Hover leave error: ${e}`);
            },
            complete: () => {
                // Hover leave complete
            }
        });
        
        this.subscriptions.push(hoverSubscription, leaveSubscription);
    }
    
    private setupVisibilityPreload(route: HTMLElement, lazyConfig: string | LazyLoadConfig): void {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.preloadModule(lazyConfig);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            
            observer.observe(route);
        }
    }
    
    private async preloadModule(lazyConfig: string | LazyLoadConfig): Promise<void> {
        try {
            await this.lazyLoader.loadModule(lazyConfig);
        } catch (error) {
            this.logger.debug(`Preload failed: ${error}`);
        }
    }
    
    private setupPreloadingObservers(): void {
        // This method sets up any global preloading observers
        // Currently handled per-route in setupPreloading
    }
    
    // ========================================================================
    // History Management
    // ========================================================================
    
    private updateBrowserHistory(
        config: AdvancedRouteConfig,
        params: { [key: string]: any },
        query: { [key: string]: any }
    ): void {
        
        if (!config.path) return;
        
        const path = RouteParams.buildPath(config.path, params);
        const queryString = QueryParams.stringify({ ...config.query, ...query });
        const url = path + (queryString ? `?${queryString}` : '');
        
        const state = {
            routeConfig: config,
            params,
            query,
            timestamp: Date.now()
        };
        
        if (config.history === 'push') {
            history.pushState(state, '', url);
        } else if (config.history === 'replace') {
            history.replaceState(state, '', url);
        }
    }
    
    private handleHistoryChange(event: PopStateEvent): void {
        if (event.state) {
            const { routeConfig, params, query } = event.state;
            this.navigateToView(
                this.resolvePathTarget(routeConfig.path) || routeConfig.target,
                params,
                query,
                routeConfig.state
            );
        }
    }
    
    private handleInitialRoute(): void {
        // Handle initial page load routing based on current URL
        const currentPath = window.location.pathname;
        const currentQuery = QueryParams.parse(window.location.search);
        
        // Find matching route configuration
        const routes = document.querySelectorAll("[data-annie-route], [data-route]");
        
        for (let i = 0; i < routes.length; i++) {
            const routeElement = routes[i] as HTMLElement;
            const config = this.getAdvancedRouteConfig(routeElement);
            
            if (config && config.path) {
                const params = RouteParams.parse(config.path, currentPath);
                if (params) {
                    // Found matching route
                    this.navigateToView(
                        this.resolvePathTarget(config.path) || config.target as string,
                        params,
                        currentQuery,
                        config.state
                    );
                    break;
                }
            }
        }
    }
    
    // ========================================================================
    // Nested Routing
    // ========================================================================
    
    private async handleNestedRoutes(
        parentView: HTMLElement,
        params: { [key: string]: any },
        query: { [key: string]: any }
    ): Promise<void> {
        
        // Look for nested route containers within the view
        const nestedContainers = parentView.querySelectorAll("[data-annie-nested-routes]");
        
        for (let i = 0; i < nestedContainers.length; i++) {
            const containerElement = nestedContainers[i] as HTMLElement;
            await this.initializeNestedContainer(containerElement, params, query);
        }
    }
    
    private async initializeNestedContainer(
        container: HTMLElement,
        parentParams: { [key: string]: any },
        parentQuery: { [key: string]: any }
    ): Promise<void> {
        
        // Mark as nested container
        dataAttributeManager.setAttribute(container, DataAttributeCategories.FRAMEWORK, 'nested-route-container');
        
        // Initialize nested routes
        const nestedRoutes = container.querySelectorAll("[data-annie-subroute]");
        
        nestedRoutes.forEach(route => {
            this.initializeNestedRoute(route as HTMLElement, container, parentParams, parentQuery);
        });
    }
    
    private initializeNestedRoute(
        route: HTMLElement,
        container: HTMLElement,
        parentParams: { [key: string]: any },
        parentQuery: { [key: string]: any }
    ): void {
        
        dataAttributeManager.setAttribute(route, DataAttributeCategories.FRAMEWORK, 'nested-route');
        
        const routeClick = Observable.fromEvent(route, "click");
        
        const subscription = routeClick.subscribe({
            next: async (event: Event) => {
                event.preventDefault();
                event.stopPropagation(); // Prevent parent route handling
                
                await this.handleNestedRouteNavigation(route, container, parentParams, parentQuery);
            },
            error: (e: any) => {
                this.logger.error(`Nested route navigation error: ${e}`);
            },
            complete: () => {
                // Nested route navigation complete
            }
        });
        
        this.subscriptions.push(subscription);
    }
    
    private async handleNestedRouteNavigation(
        route: HTMLElement,
        container: HTMLElement,
        parentParams: { [key: string]: any },
        parentQuery: { [key: string]: any }
    ): Promise<void> {
        
        const subroutePath = route.getAttribute("data-annie-subroute");
        if (!subroutePath) return;
        
        // Hide other subroutes in this container
        const siblingRoutes = container.querySelectorAll("[data-annie-subroute-view]");
        siblingRoutes.forEach(view => {
            (view as HTMLElement).style.display = "none";
        });
        
        // Show target subroute view
        const targetView = container.querySelector(`[data-annie-subroute-view="${subroutePath}"]`) as HTMLElement;
        
        if (targetView) {
            targetView.style.display = "block";
            
            // Merge parent and local parameters
            const mergedParams = { ...parentParams };
            const mergedQuery = { ...parentQuery };
            
            this.setViewParameters(targetView, mergedParams, mergedQuery, null);
            
            // Handle lazy loading for nested route
            const lazyConfig = route.getAttribute("data-annie-lazy");
            if (lazyConfig) {
                await this.handleLazyLoading(route, lazyConfig);
            }
            
            this.logger.info(`Navigated to nested route: ${subroutePath}`);
        }
    }
    
    // ========================================================================
    // Lifecycle & Event Management
    // ========================================================================
    
    private createNavigationEvent(type: NavigationEvent['type']): NavigationEvent {
        return {
            type,
            from: this.currentRoute || undefined,
            to: {} as RouteInfo, // Will be filled in by caller
            timestamp: Date.now(),
            cancelled: false
        };
    }
    
    private async callLifecycleHooks(hooks: string | string[], event: NavigationEvent): Promise<void> {
        const hookArray = Array.isArray(hooks) ? hooks : [hooks];
        
        for (const hook of hookArray) {
            try {
                const hookFunction = this.resolveFunction(hook);
                if (hookFunction) {
                    await hookFunction(event);
                }
            } catch (error) {
                this.logger.error(`Lifecycle hook error (${hook}): ${error}`);
            }
        }
    }
    
    private resolveFunction(functionPath: string): Function | null {
        try {
            const parts = functionPath.split('.');
            let current: any = window;
            
            for (const part of parts) {
                current = current[part];
                if (!current) return null;
            }
            
            return typeof current === 'function' ? current : null;
            
        } catch {
            this.logger.warn(`Could not resolve function: ${functionPath}`);
            return null;
        }
    }
    
    private updateCurrentRoute(
        target: string,
        element: HTMLElement,
        params: { [key: string]: any },
        query: { [key: string]: any },
        state: any
    ): void {
        
        this.currentRoute = {
            path: target,
            element,
            params,
            query,
            state,
            nested: [] // TODO: populate nested routes
        };
        
        // Add to navigation history
        this.navigationHistory.push(this.currentRoute);
        
        // Limit history size
        if (this.navigationHistory.length > 50) {
            this.navigationHistory.shift();
        }
    }
    
    // ========================================================================
    // Error Handling
    // ========================================================================
    
    private handleNavigationError(route: HTMLElement, error: any): void {
        this.logger.error(`Navigation error: ${error}`);
        
        // Set error state on route
        dataAttributeManager.setAttribute(route, DataAttributeCategories.STATE, 'error-state', 'active');
        
        // Emit error event
        const errorEvent = new CustomEvent('annie:navigation-error', {
            detail: { route, error }
        });
        document.dispatchEvent(errorEvent);
    }
    
    // ========================================================================
    // Legacy Compatibility
    // ========================================================================
    
    private getContainerConfig(container: Element): RouteContainerConfig | null {
        const configJson = container.getAttribute("data-routecontainer") || 
                           container.getAttribute("data-annie-route-container");
                           
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
    
    private evaluateCondition(condition: RouteCondition): boolean {
        const { datasource, datafield, value, operator = 'equals' } = condition.condition;
        const dataset = this.dataStore.getDataset(datasource.replace(/-/g, "_"));
        
        if (dataset && dataset.data[0] && dataset.data[0][datafield] !== undefined) {
            const fieldValue = dataset.data[0][datafield];
            
            switch (operator) {
                case 'equals':
                    return fieldValue === value;
                case 'notEquals':
                    return fieldValue !== value;
                case 'contains':
                    return String(fieldValue).includes(String(value));
                case 'greaterThan':
                    return Number(fieldValue) > Number(value);
                case 'lessThan':
                    return Number(fieldValue) < Number(value);
                default:
                    return fieldValue === value;
            }
        }
        
        return false;
    }
    
    private updateNavStyles(activeRoute: HTMLElement, config: RouteContainerConfig): void {
        // Remove active state from previously active elements
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
    
    // ========================================================================
    // Public API
    // ========================================================================
    
    /**
     * Programmatic navigation
     */
    public navigateTo(target: string, options?: {
        params?: { [key: string]: any };
        query?: { [key: string]: any };
        state?: any;
        history?: HistoryMode;
    }): Promise<void> {
        const { params = {}, query = {}, state = null } = options || {};
        
        return this.navigateToView(target, params, query, state);
    }
    
    /**
     * Navigate by path with parameters
     */
    public navigateToPath(path: string, options?: {
        query?: { [key: string]: any };
        state?: any;
        history?: HistoryMode;
    }): Promise<void> {
        const target = this.resolvePathTarget(path);
        if (!target) {
            return Promise.reject(new Error(`No view found for path: ${path}`));
        }
        
        const params = RouteParams.parse(path, window.location.pathname) || {};
        return this.navigateTo(target, { ...options, params });
    }
    
    /**
     * Get current route information
     */
    public getCurrentRoute(): RouteInfo | null {
        return this.currentRoute;
    }
    
    /**
     * Get navigation history
     */
    public getHistory(): RouteInfo[] {
        return [...this.navigationHistory];
    }
    
    /**
     * Add event listener for navigation events
     */
    public addEventListener(event: string, handler: Function): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)!.push(handler);
    }
    
    /**
     * Remove event listener
     */
    public removeEventListener(event: string, handler: Function): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    /**
     * Clear route cache (for lazy loaded modules)
     */
    public clearCache(): void {
        this.lazyLoader = new LazyLoader();
    }
    
    // ========================================================================
    // Cleanup
    // ========================================================================
    
    dispose(): void {
        if (this.disposed) return;
        
        this.logger.debug('Disposing Advanced Router');
        
        // Unsubscribe from all observables
        this.subscriptions.forEach(subscription => {
            try {
                subscription.unsubscribe();
            } catch (error) {
                this.logger.warn(`Error unsubscribing from advanced route handler: ${error}`);
            }
        });
        
        this.subscriptions.length = 0;
        this.eventHandlers.clear();
        this.navigationHistory.length = 0;
        this.currentRoute = null;
        
        this.disposed = true;
        
        this.logger.debug('Advanced Router disposed successfully');
    }
    
    isDisposed(): boolean {
        return this.disposed;
    }
}