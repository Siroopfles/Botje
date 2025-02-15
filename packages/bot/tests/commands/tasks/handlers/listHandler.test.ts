// Create repository mocks first, before any jest.mock calls
const mockTaskRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByServerId: jest.fn(),
  findByAssignee: jest.fn(),
  findByStatusAndServer: jest.fn(),
  findOverdueTasks: jest.fn(),
  findUpcomingTasks: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
} as jest.Mocked<TaskRepository>;

// Then the jest.mock calls
jest.mock('database', () => ({
  createTaskRepository: () => mockTaskRepo
}));
jest.mock('../../../../src/commands/test/utils.js');

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ChatInputCommandInteraction, User } from 'discord.js';
import { ListHandler } from '../../../../src/commands/tasks/handlers/listHandler.js';
import { mockInteraction, mocks } from '../../../setup.js';
import { TaskRepository, TaskDocument } from 'database';
import { TaskStatus } from 'shared';

describe('ListHandler', () => {
  const handler = new ListHandler();
  
  const mockUser = {
    id: '123456789',
    toString: () => '<@123456789>',
    valueOf: () => '123456789',
    username: 'TestUser',
    discriminator: '0000',
    bot: false,
    system: false,
  } as unknown as User;

  const guildId = '987654321';

  const mockTasks: Partial<TaskDocument>[] = [
    {
      id: '1',
      title: 'Task 1',
      description: 'Description 1',
      status: TaskStatus.PENDING,
      assigneeId: mockUser.id,
      serverId: guildId,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      title: 'Task 2',
      description: 'Description 2',
      status: TaskStatus.COMPLETED,
      assigneeId: mockUser.id,
      serverId: guildId,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedDate: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup interaction mocks
    Object.defineProperty(mockInteraction, 'guildId', {
      value: guildId,
      configurable: true
    });

    mocks.functions.getUser.mockReturnValue(mockUser);
    mocks.functions.getString.mockReturnValue(null);
    mocks.functions.getInteger.mockReturnValue(null);
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
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ This command can only be used in a server'
    });
  });

  it('should list all tasks in server', async () => {
    // Arrange
    mockTaskRepo.findByServerId.mockResolvedValue(mockTasks as TaskDocument[]);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.findByServerId).toHaveBeenCalledWith(guildId);
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('📋 Tasks')
    });
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Task 1')
    });
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Task 2')
    });
  });

  it('should filter tasks by status', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(TaskStatus.PENDING);

    mockTaskRepo.findByStatusAndServer.mockResolvedValue([mockTasks[0]] as TaskDocument[]);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.findByStatusAndServer).toHaveBeenCalledWith(
      guildId,
      TaskStatus.PENDING
    );
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Task 1')
    });
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: expect.not.stringContaining('Task 2')
    });
  });

  it('should filter tasks by assignee', async () => {
    // Arrange
    const filterUser = {
      ...mockUser,
      id: '999888777'
    } as User;

    jest.spyOn(mocks.functions, 'getUser')
      .mockReturnValueOnce(filterUser);

    mockTaskRepo.findByAssignee.mockResolvedValue([mockTasks[1]] as TaskDocument[]);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.findByAssignee).toHaveBeenCalledWith(
      filterUser.id,
      guildId
    );
  });

  it('should handle no tasks found', async () => {
    // Arrange
    mockTaskRepo.findByServerId.mockResolvedValue([]);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('No tasks found')
    });
  });

  it('should handle invalid status filter', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce('INVALID_STATUS');

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Invalid status filter'
    });
  });

  it('should handle database errors', async () => {
    // Arrange
    mockTaskRepo.findByServerId.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to fetch tasks: Database error'
    });
  });

  it('should format task list with status indicators', async () => {
    // Arrange
    mockTaskRepo.findByServerId.mockResolvedValue(mockTasks as TaskDocument[]);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('📝') // Pending indicator
    });
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('✅') // Completed indicator
    });
  });

  it('should handle pagination', async () => {
    // Arrange
    const manyTasks = Array(25).fill(null).map((_, i) => ({
      ...mockTasks[0],
      id: String(i + 1),
      title: `Task ${i + 1}`
    })) as TaskDocument[];

    mockTaskRepo.findByServerId.mockResolvedValue(manyTasks);
    jest.spyOn(mocks.functions, 'getInteger')
      .mockReturnValueOnce(2); // Page number

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Page 2')
    });
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Task 11')
    }); // First task on second page
  });
});