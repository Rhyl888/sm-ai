// 全局单例 Worker 管理器 - 支持多组件共享、任务队列、内存优化

interface WorkerTask {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
}

interface WorkerMessage {
  type: 'render' | 'highlight';
  id: number;
  content?: string;
  code?: string;
  language?: string;
}

interface WorkerResponse {
  type: 'rendered' | 'highlighted' | 'error';
  id: number;
  html?: string;
  error?: string;
}

class MarkdownWorkerManager {
  private worker: Worker | null = null;
  private pendingTasks = new Map<number, WorkerTask>();
  private taskId = 0;
  private readonly TASK_TIMEOUT = 30000; // 30秒超时
  private readonly MAX_PENDING_TASKS = 100; // 最大待处理任务数
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // 延迟初始化，避免在模块加载时立即创建 Worker
  }

  private async initWorker(): Promise<void> {
    if (this.worker) {
      return; // 已经初始化
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise; // 正在初始化，等待完成
    }

    this.isInitializing = true;
    this.initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(
          new URL('../workers/markdownWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(e.data);
        };

        this.worker.onerror = (error) => {
          console.error('Markdown Worker error:', error);
          this.handleWorkerError(error);
        };

        // 启动清理任务
        this.startCleanup();

        resolve();
      } catch (error) {
        console.error('Failed to create Markdown Worker:', error);
        this.isInitializing = false;
        this.initPromise = null;
        reject(error);
      } finally {
        this.isInitializing = false;
      }
    });

    return this.initPromise;
  }

  private handleWorkerMessage(data: WorkerResponse) {
    const { type, id, html, error } = data;
    const task = this.pendingTasks.get(id);

    if (!task) {
      console.warn(`No task found for id: ${id}`);
      return;
    }

    this.pendingTasks.delete(id);

    if (type === 'error') {
      task.reject(new Error(error || 'Unknown error'));
    } else {
      task.resolve(html || '');
    }
  }

  private handleWorkerError(error: ErrorEvent) {
    // 处理所有待处理的任务
    const errorMsg = error.message || 'Worker error occurred';
    this.pendingTasks.forEach((task) => {
      task.reject(new Error(errorMsg));
    });
    this.pendingTasks.clear();

    // 尝试重新初始化 Worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitializing = false;
    this.initPromise = null;
  }

  private startCleanup() {
    if (this.cleanupInterval) {
      return; // 已经启动
    }

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const tasksToRemove: number[] = [];

      // 清理超时任务
      this.pendingTasks.forEach((task, id) => {
        if (now - task.timestamp > this.TASK_TIMEOUT) {
          task.reject(new Error('Task timeout'));
          tasksToRemove.push(id);
        }
      });

      tasksToRemove.forEach(id => this.pendingTasks.delete(id));

      // 如果任务队列过长，清理低优先级任务
      if (this.pendingTasks.size > this.MAX_PENDING_TASKS) {
        this.cleanupLowPriorityTasks();
      }
    }, 5000);
  }

  private cleanupLowPriorityTasks() {
    const tasks = Array.from(this.pendingTasks.entries())
      .sort((a, b) => {
        const priorityOrder = { low: 0, normal: 1, high: 2 };
        return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
      });

    // 清理前 20% 的低优先级任务
    const toRemove = Math.floor(tasks.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      const [id, task] = tasks[i];
      task.reject(new Error('Task cancelled due to queue overflow'));
      this.pendingTasks.delete(id);
    }
  }

  async renderMarkdown(
    content: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    // 确保 Worker 已初始化
    await this.initWorker();

    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    if (!content?.trim()) {
      return '';
    }

    // 检查任务队列是否过载
    if (this.pendingTasks.size >= this.MAX_PENDING_TASKS && priority === 'low') {
      throw new Error('Worker queue is full, please try again later');
    }

    const id = ++this.taskId;
    return new Promise((resolve, reject) => {
      this.pendingTasks.set(id, {
        resolve,
        reject,
        timestamp: Date.now(),
        priority,
      });

      this.worker!.postMessage({
        type: 'render',
        content,
        id,
      } as WorkerMessage);
    });
  }

  // 获取当前任务队列状态（用于调试）
  getQueueStatus() {
    return {
      pendingTasks: this.pendingTasks.size,
      maxTasks: this.MAX_PENDING_TASKS,
      isInitialized: !!this.worker,
    };
  }

  destroy() {
    // 停止清理任务
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // 取消所有待处理的任务
    this.pendingTasks.forEach((task) => {
      task.reject(new Error('Worker destroyed'));
    });
    this.pendingTasks.clear();

    // 终止 Worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.isInitializing = false;
    this.initPromise = null;
  }
}

// 全局单例
let workerManager: MarkdownWorkerManager | null = null;

/**
 * 获取全局单例 Worker 管理器
 * 所有组件共享同一个 Worker，降低内存开销
 */
export function getMarkdownWorker(): MarkdownWorkerManager {
  if (!workerManager) {
    workerManager = new MarkdownWorkerManager();
  }
  return workerManager;
}

/**
 * 清理 Worker（应用卸载时调用）
 */
export function destroyMarkdownWorker() {
  if (workerManager) {
    workerManager.destroy();
    workerManager = null;
  }
}

/**
 * 获取 Worker 状态（用于调试和监控）
 */
export function getMarkdownWorkerStatus() {
  return workerManager?.getQueueStatus() || null;
}

