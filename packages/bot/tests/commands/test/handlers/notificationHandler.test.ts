import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ChatInputCommandInteraction, User } from 'discord.js';
import { NotificationService, TaskStatus } from 'shared';
import type { NotificationPreferencesRepository, TaskRepository, NotificationPreferencesDocument, TaskDocument } from 'database';
import type { TestTaskData } from '../../../../src/commands/test/types.js';

// Create repository mocks first
const repositories = {
  notificationPreferences: {
    findByUserId: jest.fn(),
    create: jest.fn(),
    findByServerId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  } as jest.Mocked<NotificationPreferencesRepository>,
  task: {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findByServerId: jest.fn(),
    findByAssignee: jest.fn(),
    findByStatusAndServer: jest.fn(),
    findOverdueTasks: jest.fn(),
    findUpcomingTasks: jest.fn(),
    delete: jest.fn()
  } as jest.Mocked<TaskRepository>
};

// Create mock functions
const mockCreateTestTask: jest.Mock = jest.fn();
const mockCreateTestTasks: jest.Mock = jest.fn();

// Setup mock modules
jest.mock('database', () => ({
  createNotificationPreferencesRepository: () => repositories.notificationPreferences,
  createTaskRepository: () => repositories.task
}));

jest.mock('../../../../src/commands/test/utils.js', () => ({
  createTestTask: (...args: any[]) => mockCreateTestTask(...args),
  createTestTasks: (...args: any[]) => mockCreateTestTasks(...args),
  calculateDueDate: (minutes?: number) => new Date(Date.now() + (minutes || 0) * 60000),
  formatSuccess: (msg: string) => `✅ ${msg}`,
  formatError: (error: Error) => `❌ ${error.message}`
}));

// Import after mock setup
import { NotificationHandler } from '../../../../src/commands/test/handlers/notificationHandler.js';
import { mockInteraction, mocks } from '../../../setup.js';

describe('NotificationHandler', () => {
  const handler = new NotificationHandler();
  
  // Create user mock with required properties
  const mockUser: Partial<User> = {
    id: '123456789',
    toString: () => `<@123456789>`,
    valueOf: () => '123456789',
    username: 'TestUser',
    discriminator: '0000',
    bot: false,
    system: false,
  };
  
  const guildId = '987654321';

  // Create mock documents
  const mockTaskDoc: Partial<TaskDocument> = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.PENDING,
    assigneeId: mockUser.id,
    serverId: guildId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockPreferencesDoc: Partial<NotificationPreferencesDocument> = {
    id: '1',
    userId: mockUser.id,
    serverId: guildId,
    discordDm: true,
    reminderHours: 24,
    dailyDigest: true,
    digestTime: '09:00',
    notifyOnAssignment: true,
    notifyOnCompletion: true,
    notifyOnDue: true,
    notifyOnOverdue: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup interaction mocks
    Object.defineProperty(mockInteraction, 'guildId', {
      value: guildId,
      configurable: true
    });

    // Setup mock function returns
    mocks.functions.getUser.mockReturnValue(mockUser as User);
    mocks.functions.getInteger.mockReturnValue(null);
    mocks.functions.getSubcommand.mockReturnValue('assignment');

    // Setup test task creation mocks
    mockCreateTestTask.mockImplementation((data: any) => Promise.resolve({
      ...mockTaskDoc,
      ...data
    }));

    mockCreateTestTasks.mockImplementation((...args: unknown[]) => {
      const [tasks] = args as [TestTaskData[]];
      return Promise.resolve(
        tasks.map((task, index) => ({
          ...mockTaskDoc,
          id: String(index + 1),
          ...task
        }))
      );
    });

    // Setup database mocks
    repositories.notificationPreferences.findByUserId.mockResolvedValue(mockPreferencesDoc as NotificationPreferencesDocument);
    repositories.notificationPreferences.create.mockResolvedValue(mockPreferencesDoc as NotificationPreferencesDocument);
    repositories.task.create.mockResolvedValue(mockTaskDoc as TaskDocument);
    repositories.task.update.mockResolvedValue(mockTaskDoc as TaskDocument);

    // Setup NotificationService mock
    jest.spyOn(NotificationService, 'createDefaultPreferences')
      .mockReturnValue(mockPreferencesDoc as NotificationPreferencesDocument);
  });

  it('should handle guild-only restriction', async () => {
    // Arrange
    Object.defineProperty(mockInteraction, 'guildId', {
      value: null,
      configurable: true
    });

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      'This command can only be used in a server.'
    );
  });

  it('should create preferences if they do not exist', async () => {
    // Arrange
    repositories.notificationPreferences.findByUserId.mockResolvedValue(null);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(repositories.notificationPreferences.findByUserId).toHaveBeenCalledWith(mockUser.id, guildId);
    expect(NotificationService.createDefaultPreferences).toHaveBeenCalledWith(mockUser.id, guildId);
    expect(repositories.notificationPreferences.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        serverId: guildId
      })
    );
  });

  describe('notification types', () => {
    it('should handle assignment notification', async () => {
      // Arrange
      mocks.functions.getSubcommand.mockReturnValue('assignment');
      mocks.functions.getInteger.mockReturnValue(null);

      // Act
      await handler.execute(mockInteraction as ChatInputCommandInteraction);

      // Assert
      expect(mockCreateTestTask).toHaveBeenCalledWith({
        title: 'Test Assignment Notification',
        description: 'Testing assignment notification format',
        serverId: guildId,
        assigneeId: mockUser.id
      });
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.stringContaining('Created test task with ID: 1')
      );
    });

    it('should handle due date notification', async () => {
      // Arrange
      mocks.functions.getSubcommand.mockReturnValue('due');
      mocks.functions.getInteger.mockReturnValue(60); // 60 minutes

      // Act
      await handler.execute(mockInteraction as ChatInputCommandInteraction);

      // Assert
      expect(mockCreateTestTask).toHaveBeenCalledWith({
        title: 'Test Due Date Notification',
        description: 'Testing due date notification format',
        serverId: guildId,
        assigneeId: mockUser.id,
        dueDate: expect.any(Date)
      });
    });

    it('should handle overdue notification', async () => {
      // Arrange
      mocks.functions.getSubcommand.mockReturnValue('overdue');
      mocks.functions.getInteger.mockReturnValue(null);

      // Act
      await handler.execute(mockInteraction as ChatInputCommandInteraction);

      // Assert
      expect(mockCreateTestTask).toHaveBeenCalledWith({
        title: 'Test Overdue Notification',
        description: 'Testing overdue notification format',
        serverId: guildId,
        assigneeId: mockUser.id,
        dueDate: expect.any(Date)
      });
    });

    it('should handle completion notification', async () => {
      // Arrange
      mocks.functions.getSubcommand.mockReturnValue('complete');
      mocks.functions.getInteger.mockReturnValue(null);

      // Act
      await handler.execute(mockInteraction as ChatInputCommandInteraction);

      // Assert
      expect(mockCreateTestTask).toHaveBeenCalledWith({
        title: 'Test Completion Notification',
        description: 'Testing completion notification format',
        serverId: guildId,
        assigneeId: mockUser.id
      });
      expect(repositories.task.update).toHaveBeenCalledWith('1', {
        status: TaskStatus.COMPLETED,
        completedDate: expect.any(Date)
      });
    });

    it('should handle daily digest notification', async () => {
      // Arrange
      mocks.functions.getSubcommand.mockReturnValue('daily');
      mocks.functions.getInteger.mockReturnValue(null);

      // Act
      await handler.execute(mockInteraction as ChatInputCommandInteraction);

      // Assert
      expect(mockCreateTestTasks).toHaveBeenCalledWith([
        {
          title: 'Test Daily Digest Task 1',
          description: 'A pending task',
          serverId: guildId,
          assigneeId: mockUser.id
        },
        {
          title: 'Test Daily Digest Task 2',
          description: 'An overdue task',
          serverId: guildId,
          assigneeId: mockUser.id,
          dueDate: expect.any(Date)
        }
      ], 2);
      
      expect(mockCreateTestTask).toHaveBeenCalledWith({
        title: 'Test Daily Digest Task 3',
        description: 'A completed task',
        serverId: guildId,
        assigneeId: mockUser.id
      });
      
      expect(repositories.task.update).toHaveBeenCalledWith('1', {
        status: TaskStatus.COMPLETED,
        completedDate: expect.any(Date)
      });
    });
  });
});