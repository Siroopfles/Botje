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
import { DeleteHandler } from '../../../../src/commands/tasks/handlers/deleteHandler.js';
import { mockInteraction, mocks } from '../../../setup.js';
import { TaskRepository, TaskDocument } from 'database';
import { TaskStatus } from 'shared';

describe('DeleteHandler', () => {
  const handler = new DeleteHandler();
  
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

  it('should delete task successfully', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    mockTaskRepo.delete.mockResolvedValue(true);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.delete).toHaveBeenCalledWith(taskId);
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: `✅ Deleted task "${mockTask.title}" (ID: ${taskId})`
    });
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

  it('should handle database errors when deleting task', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    mockTaskRepo.delete.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to delete task: Database error'
    });
  });

  it('should handle completed tasks', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    const completedTask = {
      ...mockTask,
      status: TaskStatus.COMPLETED,
      completedDate: new Date()
    };
    mockTaskRepo.findById.mockResolvedValue(completedTask as TaskDocument);
    mockTaskRepo.delete.mockResolvedValue(true);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.delete).toHaveBeenCalledWith(taskId);
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: `✅ Deleted task "${mockTask.title}" (ID: ${taskId})`
    });
  });

  it('should handle tasks with dependencies', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    const taskWithDependencies = {
      ...mockTask,
      dependentTasks: ['2', '3']
    };
    mockTaskRepo.findById.mockResolvedValue(taskWithDependencies as TaskDocument);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Cannot delete task with dependencies'
    });
    expect(mockTaskRepo.delete).not.toHaveBeenCalled();
  });
});