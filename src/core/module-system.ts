/**
 * Annie Module System - AI-First Approach
 * Simple data-attribute based module loading for BoltAPI integration
 */

export interface ModuleConfig {
  name: string;
  url: string;
  dependencies?: string[];
  lazy?: boolean;
}

export class AnnieModuleSystem {
  private loadedModules = new Set<string>();
  private moduleConfigs = new Map<string, ModuleConfig>();
  private moduleCache = new Map<string, any>();

  /**
   * Register a module configuration
   * Perfect for BoltAPI: annie.modules.register('user-management', { url: '/modules/users.js' })
   */
  register(name: string, config: Omit<ModuleConfig, 'name'>): void {
    this.moduleConfigs.set(name, { name, ...config });
  }

  /**
   * Process all elements with data-annie-module attributes
   * AI-friendly: <div data-annie-module="user-list">Loading...</div>
   */
  async processModuleElements(): Promise<void> {
    const elements = document.querySelectorAll('[data-annie-module]');
    
    for (const element of Array.from(elements)) {
      const moduleName = element.getAttribute('data-annie-module');
      const moduleProps = element.getAttribute('data-annie-module-props');
      
      if (moduleName) {
        try {
          const module = await this.loadModule(moduleName);
          if (module && module.render) {
            const props = moduleProps ? JSON.parse(moduleProps) : {};
            module.render(element, props);
          }
        } catch (error) {
          console.error(`Failed to load module ${moduleName}:`, error);
          element.innerHTML = `<div class="annie-module-error">Module ${moduleName} failed to load</div>`;
        }
      }
    }
  }

  /**
   * Load a module by name
   */
  async loadModule(name: string): Promise<any> {
    if (this.moduleCache.has(name)) {
      return this.moduleCache.get(name);
    }

    const config = this.moduleConfigs.get(name);
    if (!config) {
      throw new Error(`Module ${name} not registered`);
    }

    // Load dependencies first
    if (config.dependencies) {
      for (const dep of config.dependencies) {
        await this.loadModule(dep);
      }
    }

    // Load the module
    const module = await this.loadModuleScript(config.url);
    this.moduleCache.set(name, module);
    this.loadedModules.add(name);

    return module;
  }

  /**
   * Load module script dynamically
   */
  private async loadModuleScript(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = url;
      
      script.onload = () => {
        // Module should register itself on window.annieModules
        const moduleName = url.split('/').pop()?.replace('.js', '');
        const module = (window as any).annieModules?.[moduleName || ''];
        resolve(module);
      };
      
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      
      document.head.appendChild(script);
    });
  }

  /**
   * Preload modules marked for eager loading
   */
  async preloadEagerModules(): Promise<void> {
    const eagerModules = Array.from(this.moduleConfigs.entries())
      .filter(([, config]) => !config.lazy);

    for (const [name] of eagerModules) {
      try {
        await this.loadModule(name);
      } catch (error) {
        console.warn(`Failed to preload module ${name}:`, error);
      }
    }
  }

  /**
   * Check if module is loaded
   */
  isModuleLoaded(name: string): boolean {
    return this.loadedModules.has(name);
  }

  /**
   * Get loaded module
   */
  getModule(name: string): any {
    return this.moduleCache.get(name);
  }
}

/**
 * Global instance
 */
export const annieModules = new AnnieModuleSystem();

/**
 * Initialize module system
 */
export function initializeModuleSystem(): void {
  // Process existing module elements
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      annieModules.processModuleElements();
      annieModules.preloadEagerModules();
    });
  } else {
    annieModules.processModuleElements();
    annieModules.preloadEagerModules();
  }

  // Watch for dynamically added module elements
  const observer = new MutationObserver(() => {
    annieModules.processModuleElements();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-annie-module']
  });
}

/**
 * BoltAPI Integration Helper
 * Register modules from server-side configuration
 */
export function registerModulesFromConfig(modules: Record<string, ModuleConfig>): void {
  Object.entries(modules).forEach(([name, config]) => {
    annieModules.register(name, config);
  });
}