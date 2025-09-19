import { Task } from '../types/Task';

// Mock server configuration
const MOCK_SERVER_URL = 'http://localhost:3001'; // You can change this to your mock server URL
const API_BASE_URL = __DEV__ ? MOCK_SERVER_URL : 'https://your-production-api.com';

interface SyncResponse {
  items: Task[];
  nextCursor?: string;
}

interface BatchResponse {
  success: boolean;
  conflictedIds?: string[];
}

export class APIService {
  private static baseURL = API_BASE_URL;

  private static mockTasks: Task[] = [];
  private static useMockServer = true; 
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (this.useMockServer) {
      return this.handleMockRequest<T>(endpoint, options);
    }

    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private static async handleMockRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    console.log(`Mock API: ${options.method || 'GET'} ${endpoint}`);

    // Network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    // Parse endpoint and method
    const method = options.method || 'GET';

    if (method === 'GET' && endpoint.startsWith('/tasks')) {
      return this.handleMockPull(endpoint) as T;
    }

    if (method === 'POST' && endpoint === '/tasks/batch') {
      return this.handleMockPush(options.body as string) as T;
    }

    throw new Error(`Mock API: Unsupported endpoint ${method} ${endpoint}`);
  }

  private static handleMockPull(endpoint: string): SyncResponse {
    const url = new URL(`http://mock.com${endpoint}`);
    const changedSince = url.searchParams.get('changedSince');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    let filteredTasks = this.mockTasks;

    if (changedSince && changedSince !== '1970-01-01T00:00:00.000Z') {
      const sinceDate = new Date(changedSince);
      filteredTasks = this.mockTasks.filter(task =>
        new Date(task.updatedAt) > sinceDate
      );
    }

    // Sort by updatedAt to ensure consistent ordering
    filteredTasks.sort((a, b) =>
      new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );

    const items = filteredTasks.slice(0, limit);
    const hasMore = filteredTasks.length > limit;

    console.log(`Mock Pull: Returning ${items.length} tasks`);

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].updatedAt : undefined,
    };
  }

  private static handleMockPush(body: string): BatchResponse {
    const { upserts, deletes } = JSON.parse(body);

    console.log(`Mock Push: ${upserts?.length || 0} upserts, ${deletes?.length || 0} deletes`);

    // Handle upserts
    if (upserts && upserts.length > 0) {
      upserts.forEach((task: Task) => {
        const existingIndex = this.mockTasks.findIndex(t => t.id === task.id);
        if (existingIndex >= 0) {
          this.mockTasks[existingIndex] = { ...task, lastSyncAt: new Date().toISOString() };
        } else {
          this.mockTasks.push({ ...task, lastSyncAt: new Date().toISOString() });
        }
      });
    }

    // Handle deletes
    if (deletes && deletes.length > 0) {
      deletes.forEach((deleteInfo: { id: string }) => {
        const index = this.mockTasks.findIndex(t => t.id === deleteInfo.id);
        if (index >= 0) {
          this.mockTasks.splice(index, 1);
        }
      });
    }

    return { success: true };
  }

  // Add some mock data for testing
  static initializeMockData() {
    this.mockTasks = [
    ];
    console.log('Mock server initialized with', this.mockTasks.length, 'tasks');
  }

  // Public API methods
  static async pullTasks(changedSince?: string, limit: number = 100): Promise<SyncResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (changedSince) {
      params.set('changedSince', changedSince);
    }

    return this.request<SyncResponse>(`/tasks?${params}`);
  }

  static async pushTasks(
    upserts: Task[] = [],
    deletes: { id: string; updatedAt: string }[] = []
  ): Promise<BatchResponse> {
    return this.request<BatchResponse>('/tasks/batch', {
      method: 'POST',
      body: JSON.stringify({ upserts, deletes }),
    });
  }

  // This method to debug
  static debugMockData() {
    console.log('=== MOCK SERVER DATA ===');
    console.log(`Total tasks in mock server: ${this.mockTasks.length}`);
    this.mockTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} (${task.id})`);
      console.log(`   isDone: ${task.isDone}, dirty: ${task.dirty}, deleted: ${task.deleted}`);
      console.log(`   lastSyncAt: ${task.lastSyncAt}`);
      console.log(`   updatedAt: ${task.updatedAt}`);
      console.log('---');
    });
    console.log('========================');
    return this.mockTasks;
  }
}