import { jest } from '@jest/globals';
import type { 
  TaskRepository, 
  ServerSettingsRepository,
  TaskDocument,
  ServerSettingsDocument
} from 'database';
import { TaskStatus } from 'shared';

// Mock document shapes (without mongoose methods)
interface MockTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string;
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockNotificationSettings {
  taskCreated: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  taskDue: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
}

interface MockServerSettings {
  id: string;
  serverId: string;
  notificationSettings: MockNotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}

// Create type-safe mock repositories
export const mockTaskRepo: jest.Mocked<TaskRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByServerId: jest.fn(),
  findByAssignee: jest.fn(),
  findByStatusAndServer: jest.fn(),
  findOverdueTasks: jest.fn(),
  findUpcomingTasks: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

export const mockServerSettingsRepo: jest.Mocked<ServerSettingsRepository> = {
  findByServerId: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  getNotificationSettings: jest.fn()
};

// Default mock values
const defaultNotificationSettings: MockNotificationSettings = {
  taskCreated: true,
  taskAssigned: true,
  taskCompleted: true,
  taskDue: true,
  dailyDigest: true,
  weeklyDigest: true
};

// Default mock document factories
const createMockTask = (override: Partial<MockTask> = {}): MockTask => ({
  id: 'task-123',
  title: 'Test Task',
  description: 'Test Description',
  status: TaskStatus.PENDING,
  assigneeId: 'user-123',
  serverId: 'server-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...override
});

const createMockSettings = (override: Partial<MockServerSettings> = {}): MockServerSettings => ({
  id: 'settings-123',
  serverId: 'server-123',
  notificationSettings: { ...defaultNotificationSettings },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...override
});

// Setup default mock implementations
mockTaskRepo.create.mockImplementation(async (data) => createMockTask(data) as unknown as TaskDocument);
mockTaskRepo.findById.mockImplementation(async () => createMockTask() as unknown as TaskDocument);
mockTaskRepo.findByServerId.mockImplementation(async () => [createMockTask()] as unknown as TaskDocument[]);
mockTaskRepo.findByAssignee.mockImplementation(async () => [createMockTask()] as unknown as TaskDocument[]);
mockTaskRepo.findByStatusAndServer.mockImplementation(async () => [createMockTask()] as unknown as TaskDocument[]);
mockTaskRepo.findOverdueTasks.mockImplementation(async () => [createMockTask()] as unknown as TaskDocument[]);
mockTaskRepo.findUpcomingTasks.mockImplementation(async () => [createMockTask()] as unknown as TaskDocument[]);
mockTaskRepo.update.mockImplementation(async (id, data) => createMockTask(data) as unknown as TaskDocument);
mockTaskRepo.delete.mockImplementation(async () => true);

mockServerSettingsRepo.findByServerId.mockImplementation(async () => createMockSettings() as unknown as ServerSettingsDocument);
mockServerSettingsRepo.update.mockImplementation(async (id, data) => createMockSettings(data) as unknown as ServerSettingsDocument);
mockServerSettingsRepo.create.mockImplementation(async (data) => createMockSettings(data) as unknown as ServerSettingsDocument);
mockServerSettingsRepo.delete.mockImplementation(async () => true);
mockServerSettingsRepo.getNotificationSettings.mockImplementation(async () => {
  // Need to use any here to bypass the type check since we don't have access to the actual ServerNotificationSettings type
  return defaultNotificationSettings as any;
});

// Reset helper
export const resetMocks = () => {
  Object.values(mockTaskRepo).forEach(mock => mock.mockClear());
  Object.values(mockServerSettingsRepo).forEach(mock => mock.mockClear());
};

// Mock the database module
jest.mock('database', () => ({
  createTaskRepository: () => mockTaskRepo,
  createServerSettingsRepository: () => mockServerSettingsRepo
}));

// Export mock types for use in tests
export type { MockTask, MockServerSettings, MockNotificationSettings };