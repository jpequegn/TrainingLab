/**
 * Web Worker Manager
 * Manages background processing tasks with automatic load balancing
 */

export class WorkerManager {
  constructor(maxWorkers = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = Math.min(maxWorkers, 8); // Cap at 8 workers
    this.workers = new Map();
    this.taskQueue = [];
    this.activeTasks = new Map();
    this.workerStats = new Map();
    this.isSupported = this.checkWorkerSupport();
    this.taskId = 0;
  }

  /**
   * Check if Web Workers are supported
   */
  checkWorkerSupport() {
    return typeof Worker !== 'undefined';
  }

  /**
   * Initialize worker pool
   * @param {Object} workerTypes - Worker type configurations
   */
  async initialize(workerTypes = {}) {
    if (!this.isSupported) {
      console.warn('Web Workers not supported, using main thread fallback');
      return;
    }

    const defaultWorkerTypes = {
      analytics: '/src/performance/workers/analytics-worker.js',
      fileProcessor: '/src/performance/workers/file-processor-worker.js',
      dataExport: '/src/performance/workers/data-export-worker.js',
      search: '/src/performance/workers/search-worker.js'
    };

    const types = { ...defaultWorkerTypes, ...workerTypes };

    // Initialize worker pools for each type
    for (const [type, scriptPath] of Object.entries(types)) {
      await this.initializeWorkerPool(type, scriptPath);
    }

    console.log(`Worker manager initialized with ${this.workers.size} worker pools`);
  }

  /**
   * Initialize worker pool for specific type
   * @private
   */
  async initializeWorkerPool(type, scriptPath) {
    const workers = [];
    const workerCount = Math.max(1, Math.floor(this.maxWorkers / 4)); // Distribute workers

    for (let i = 0; i < workerCount; i++) {
      try {
        const worker = new Worker(scriptPath, { type: 'module' });
        const workerId = `${type}-${i}`;
        
        worker.workerId = workerId;
        worker.type = type;
        worker.busy = false;
        worker.lastUsed = Date.now();
        
        // Set up error handling
        worker.onerror = (error) => {
          console.error(`Worker ${workerId} error:`, error);
          this.handleWorkerError(workerId, error);
        };

        // Set up message handling
        worker.onmessage = (event) => {
          this.handleWorkerMessage(workerId, event.data);
        };

        workers.push(worker);
        
        // Initialize worker statistics
        this.workerStats.set(workerId, {
          type,
          tasksCompleted: 0,
          totalProcessingTime: 0,
          averageProcessingTime: 0,
          lastTaskTime: 0,
          errors: 0,
          created: Date.now()
        });

      } catch (error) {
        console.warn(`Failed to create worker ${type}-${i}:`, error);
      }
    }

    if (workers.length > 0) {
      this.workers.set(type, workers);
    }
  }

  /**
   * Execute task in background worker
   * @param {string} workerType - Type of worker to use
   * @param {string} operation - Operation to perform
   * @param {*} data - Data to process
   * @param {Object} options - Task options
   * @returns {Promise} Task result
   */
  async executeTask(workerType, operation, data, options = {}) {
    const taskId = ++this.taskId;
    const task = {
      id: taskId,
      type: workerType,
      operation,
      data,
      options,
      startTime: Date.now(),
      timeout: options.timeout || 30000, // 30 second default timeout
      retries: options.retries || 0,
      maxRetries: options.maxRetries || 2
    };

    if (!this.isSupported || !this.workers.has(workerType)) {
      // Fallback to main thread processing
      return this.executeFallback(task);
    }

    return new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
      
      // Set up timeout
      task.timeoutId = setTimeout(() => {
        this.handleTaskTimeout(taskId);
      }, task.timeout);

      // Try to assign immediately or queue
      const assigned = this.assignTask(task);
      if (!assigned) {
        this.taskQueue.push(task);
      }
    });
  }

  /**
   * Assign task to available worker
   * @private
   */
  assignTask(task) {
    const workers = this.workers.get(task.type);
    if (!workers) return false;

    // Find available worker
    const availableWorker = workers.find(worker => !worker.busy);
    if (!availableWorker) return false;

    // Mark worker as busy
    availableWorker.busy = true;
    availableWorker.lastUsed = Date.now();
    
    // Track active task
    this.activeTasks.set(task.id, {
      task,
      workerId: availableWorker.workerId,
      startTime: Date.now()
    });

    // Send task to worker
    availableWorker.postMessage({
      taskId: task.id,
      operation: task.operation,
      data: task.data,
      options: task.options
    });

    return true;
  }

  /**
   * Handle worker message
   * @private
   */
  handleWorkerMessage(workerId, message) {
    const { taskId, type, result, error, progress } = message;
    const activeTask = this.activeTasks.get(taskId);
    
    if (!activeTask) {
      console.warn(`Received message for unknown task ${taskId} from worker ${workerId}`);
      return;
    }

    const { task } = activeTask;

    switch (type) {
      case 'progress':
        if (task.options.onProgress) {
          task.options.onProgress(progress);
        }
        break;

      case 'success':
        this.completeTask(taskId, result);
        break;

      case 'error':
        this.handleTaskError(taskId, error);
        break;

      default:
        console.warn(`Unknown message type ${type} from worker ${workerId}`);
    }
  }

  /**
   * Complete task successfully
   * @private
   */
  completeTask(taskId, result) {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;

    const { task, workerId } = activeTask;
    const processingTime = Date.now() - activeTask.startTime;

    // Clear timeout
    if (task.timeoutId) {
      clearTimeout(task.timeoutId);
    }

    // Update worker statistics
    const stats = this.workerStats.get(workerId);
    if (stats) {
      stats.tasksCompleted++;
      stats.totalProcessingTime += processingTime;
      stats.averageProcessingTime = stats.totalProcessingTime / stats.tasksCompleted;
      stats.lastTaskTime = processingTime;
    }

    // Free up worker
    this.freeWorker(workerId);

    // Resolve task
    task.resolve(result);

    // Clean up
    this.activeTasks.delete(taskId);

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle task error
   * @private
   */
  handleTaskError(taskId, error) {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;

    const { task, workerId } = activeTask;

    // Update error statistics
    const stats = this.workerStats.get(workerId);
    if (stats) {
      stats.errors++;
    }

    // Retry if possible
    if (task.retries < task.maxRetries) {
      task.retries++;
      console.warn(`Task ${taskId} failed, retrying (${task.retries}/${task.maxRetries}):`, error);
      
      // Clear timeout
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
      }

      // Free worker and retry
      this.freeWorker(workerId);
      this.activeTasks.delete(taskId);
      
      // Re-queue task
      const assigned = this.assignTask(task);
      if (!assigned) {
        this.taskQueue.unshift(task); // High priority for retries
      }
      return;
    }

    // Clear timeout
    if (task.timeoutId) {
      clearTimeout(task.timeoutId);
    }

    // Free up worker
    this.freeWorker(workerId);

    // Reject task
    task.reject(new Error(`Worker task failed: ${error}`));

    // Clean up
    this.activeTasks.delete(taskId);

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle task timeout
   * @private
   */
  handleTaskTimeout(taskId) {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;

    const { task, workerId } = activeTask;

    console.warn(`Task ${taskId} timed out after ${task.timeout}ms`);

    // Terminate and restart worker if needed
    this.restartWorker(workerId);

    // Handle as error for retry logic
    this.handleTaskError(taskId, 'Task timeout');
  }

  /**
   * Free worker for next task
   * @private
   */
  freeWorker(workerId) {
    for (const workers of this.workers.values()) {
      const worker = workers.find(w => w.workerId === workerId);
      if (worker) {
        worker.busy = false;
        break;
      }
    }
  }

  /**
   * Process task queue
   * @private
   */
  processQueue() {
    if (this.taskQueue.length === 0) return;

    const task = this.taskQueue.shift();
    const assigned = this.assignTask(task);
    
    if (!assigned) {
      // Put back at front of queue
      this.taskQueue.unshift(task);
    }
  }

  /**
   * Restart worker
   * @private
   */
  restartWorker(workerId) {
    for (const [type, workers] of this.workers.entries()) {
      const workerIndex = workers.findIndex(w => w.workerId === workerId);
      if (workerIndex !== -1) {
        const oldWorker = workers[workerIndex];
        
        try {
          // Terminate old worker
          oldWorker.terminate();

          // Create new worker
          const scriptPath = this.getWorkerScript(type);
          const newWorker = new Worker(scriptPath, { type: 'module' });
          
          newWorker.workerId = workerId;
          newWorker.type = type;
          newWorker.busy = false;
          newWorker.lastUsed = Date.now();

          // Set up handlers
          newWorker.onerror = (error) => {
            console.error(`Worker ${workerId} error:`, error);
            this.handleWorkerError(workerId, error);
          };

          newWorker.onmessage = (event) => {
            this.handleWorkerMessage(workerId, event.data);
          };

          // Replace worker
          workers[workerIndex] = newWorker;

          console.log(`Worker ${workerId} restarted`);
        } catch (error) {
          console.error(`Failed to restart worker ${workerId}:`, error);
        }
        break;
      }
    }
  }

  /**
   * Get worker script path for type
   * @private
   */
  getWorkerScript(type) {
    const scripts = {
      analytics: '/src/performance/workers/analytics-worker.js',
      fileProcessor: '/src/performance/workers/file-processor-worker.js',
      dataExport: '/src/performance/workers/data-export-worker.js',
      search: '/src/performance/workers/search-worker.js'
    };
    return scripts[type] || '/src/performance/workers/generic-worker.js';
  }

  /**
   * Execute task on main thread (fallback)
   * @private
   */
  async executeFallback(task) {
    console.warn(`Executing task ${task.id} on main thread (fallback mode)`);
    
    // Simulate async processing to avoid blocking UI
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Basic fallback implementations would go here
    throw new Error('Fallback implementation not available');
  }

  /**
   * Get worker statistics
   */
  getStatistics() {
    const stats = {
      supported: this.isSupported,
      workerPools: this.workers.size,
      totalWorkers: 0,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      workers: {}
    };

    for (const [type, workers] of this.workers.entries()) {
      stats.totalWorkers += workers.length;
      stats.workers[type] = {
        count: workers.length,
        busy: workers.filter(w => w.busy).length,
        available: workers.filter(w => !w.busy).length
      };
    }

    return stats;
  }

  /**
   * Get detailed worker performance stats
   */
  getPerformanceStats() {
    const stats = {};
    
    for (const [workerId, workerStats] of this.workerStats.entries()) {
      stats[workerId] = { ...workerStats };
    }

    return stats;
  }

  /**
   * Terminate all workers and clean up
   */
  destroy() {
    // Clear all active tasks
    for (const [taskId, activeTask] of this.activeTasks.entries()) {
      const { task } = activeTask;
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
      }
      task.reject(new Error('Worker manager destroyed'));
    }

    // Terminate all workers
    for (const workers of this.workers.values()) {
      workers.forEach(worker => {
        try {
          worker.terminate();
        } catch (error) {
          console.warn('Error terminating worker:', error);
        }
      });
    }

    // Clear all data
    this.workers.clear();
    this.activeTasks.clear();
    this.taskQueue.length = 0;
    this.workerStats.clear();

    console.log('Worker manager destroyed');
  }
}

// Export singleton instance
export const workerManager = new WorkerManager();