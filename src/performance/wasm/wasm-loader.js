/**
 * WebAssembly Module Loader
 * High-performance computation modules for TrainingLab
 */

export class WasmLoader {
  constructor() {
    this.modules = new Map();
    this.loading = new Map();
    this.isSupported = this.checkWasmSupport();
    this.fallbackMode = !this.isSupported;
  }

  /**
   * Check if WebAssembly is supported
   */
  checkWasmSupport() {
    try {
      return typeof WebAssembly === 'object' &&
        typeof WebAssembly.instantiate === 'function' &&
        typeof WebAssembly.Module === 'function' &&
        typeof WebAssembly.Instance === 'function';
    } catch (error) {
      console.warn('WebAssembly support check failed:', error);
      return false;
    }
  }

  /**
   * Load WebAssembly module with fallback
   * @param {string} moduleName - Module name
   * @param {string} wasmPath - Path to WASM file
   * @param {Object} fallbackImplementation - JavaScript fallback
   * @returns {Promise<Object>} Module instance
   */
  async loadModule(moduleName, wasmPath, fallbackImplementation) {
    if (this.modules.has(moduleName)) {
      return this.modules.get(moduleName);
    }

    if (this.loading.has(moduleName)) {
      return this.loading.get(moduleName);
    }

    const loadPromise = this.fallbackMode
      ? this.loadFallback(moduleName, fallbackImplementation)
      : this.loadWasm(moduleName, wasmPath, fallbackImplementation);

    this.loading.set(moduleName, loadPromise);

    try {
      const module = await loadPromise;
      this.modules.set(moduleName, module);
      this.loading.delete(moduleName);
      return module;
    } catch (error) {
      console.warn(`Failed to load WASM module ${moduleName}, using fallback:`, error);
      this.loading.delete(moduleName);
      return this.loadFallback(moduleName, fallbackImplementation);
    }
  }

  /**
   * Load WebAssembly module
   * @private
   */
  async loadWasm(moduleName, wasmPath, fallbackImplementation) {
    const response = await fetch(wasmPath);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch WASM module: ${response.status}`);
    }

    const wasmBytes = await response.arrayBuffer();
    const wasmModule = await WebAssembly.instantiate(wasmBytes);
    
    return {
      type: 'wasm',
      name: moduleName,
      exports: wasmModule.instance.exports,
      fallback: fallbackImplementation,
      memory: wasmModule.instance.exports.memory
    };
  }

  /**
   * Load fallback JavaScript implementation
   * @private
   */
  async loadFallback(moduleName, fallbackImplementation) {
    return {
      type: 'fallback',
      name: moduleName,
      exports: fallbackImplementation,
      fallback: null,
      memory: null
    };
  }

  /**
   * Get loaded module
   */
  getModule(moduleName) {
    return this.modules.get(moduleName);
  }

  /**
   * Unload module and free memory
   */
  unloadModule(moduleName) {
    const module = this.modules.get(moduleName);
    if (module && module.memory) {
      // Free WASM memory if possible
      try {
        module.memory = null;
      } catch (error) {
        console.warn('Failed to free WASM memory:', error);
      }
    }
    this.modules.delete(moduleName);
  }

  /**
   * Get performance information
   */
  getPerformanceInfo() {
    return {
      supported: this.isSupported,
      fallbackMode: this.fallbackMode,
      loadedModules: Array.from(this.modules.keys()),
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Get memory usage for all loaded modules
   */
  getMemoryUsage() {
    let totalMemory = 0;
    
    this.modules.forEach(module => {
      if (module.memory) {
        totalMemory += module.memory.buffer.byteLength;
      }
    });

    return totalMemory;
  }

  /**
   * Destroy all modules and free memory
   */
  destroy() {
    this.modules.forEach((module, name) => {
      this.unloadModule(name);
    });
    this.modules.clear();
    this.loading.clear();
  }
}

// Export singleton instance
export const wasmLoader = new WasmLoader();