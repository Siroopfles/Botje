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
import { CompleteHandler } from '../../../../src/commands/tasks/handlers/completeHandler.js';
import { mockInteraction, mocks } from '../../../setup.js';
import { TaskRepository, TaskDocument } from 'database';
import { TaskStatus } from 'shared';

describe('CompleteHandler', () => {
  const handler = new CompleteHandler();
  
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
  const taskId = '1';
  const completedDate = new Date();

  const mockTask: Partial<TaskDocument> = {
    id: taskId,
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.PENDING,
    assigneeId: mockUser.id,
    serverId: guildId,
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

    mocks.functions.getUser.mockReturnValue(mockUser);
    mocks.functions.getString.mockReturnValue(null);
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

  it('should handle missing task ID', async () => {
    // Arrange
    mocks.functions.getString.mockReturnValue(null);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Task ID is required'
    });
  });

  it('should handle non-existent task', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    mockTaskRepo.findById.mockResolvedValue(null);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.findById).toHaveBeenCalledWith(taskId);
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Task not found'
    });
  });

  it('should handle task from different server', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    const differentServerTask = {
      ...mockTask,
      serverId: 'different-server'
    };
    mockTaskRepo.findById.mockResolvedValue(differentServerTask as TaskDocument);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Task belongs to a different server'
    });
  });

  it('should complete a pending task', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    const completedTask = {
      ...mockTask,
      status: TaskStatus.COMPLETED,
      completedDate
    } as unknown as TaskDocument;
    mockTaskRepo.update.mockResolvedValue(completedTask);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, expect.objectContaining({
      status: TaskStatus.COMPLETED,
      completedDate: expect.any(Date)
    }));
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: `✅ Task "${mockTask.title}" has been marked as completed`
    });
  });

  it('should handle already completed task', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    const completedTask = {
      ...mockTask,
      status: TaskStatus.COMPLETED,
      completedDate
    } as unknown as TaskDocument;
    mockTaskRepo.findById.mockResolvedValue(completedTask);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.update).not.toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Task is already completed'
    });
  });

  it('should handle task completion by assignee', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    const completedTask = {
      ...mockTask,
      status: TaskStatus.COMPLETED,
      completedDate,
      completedBy: mockUser.id
    } as unknown as TaskDocument;
    mockTaskRepo.update.mockResolvedValue(completedTask);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, expect.objectContaining({
      status: TaskStatus.COMPLETED,
      completedDate: expect.any(Date),
      completedBy: mockUser.id
    }));
  });

  it('should handle database errors when finding task', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    mockTaskRepo.findById.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to find task: Database error'
    });
  });

  it('should handle database errors when updating task', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    mockTaskRepo.update.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to complete task: Database error'
    });
  });

  it('should include completion message when provided', async () => {
    // Arrange
    const completionMessage = 'Task completed with some notes';
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId)
      .mockReturnValueOnce(completionMessage);

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    const completedTask = {
      ...mockTask,
      status: TaskStatus.COMPLETED,
      completedDate,
      completionNotes: completionMessage
    } as unknown as TaskDocument;
    mockTaskRepo.update.mockResolvedValue(completedTask);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, expect.objectContaining({
      status: TaskStatus.COMPLETED,
      completedDate: expect.any(Date),
      completionNotes: completionMessage
    }));
  });
});