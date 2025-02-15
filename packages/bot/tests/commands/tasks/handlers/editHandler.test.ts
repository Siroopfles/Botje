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
import { EditHandler } from '../../../../src/commands/tasks/handlers/editHandler.js';
import { mockInteraction, mocks } from '../../../setup.js';
import { TaskRepository, TaskDocument } from 'database';
import { TaskStatus } from 'shared';

describe('EditHandler', () => {
  const handler = new EditHandler();
  
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
  const newTitle = 'Updated Task Title';
  const newDescription = 'Updated Task Description';
  const newDueDate = new Date();
  newDueDate.setDate(newDueDate.getDate() + 1);

  const mockTask: Partial<TaskDocument> = {
    id: taskId,
    title: 'Original Title',
    description: 'Original Description',
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
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('This command can only be used in a server')
    );
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
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Task not found')
    );
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
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Task not found in this server')
    );
  });

  it('should update task title', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId)
      .mockReturnValueOnce(newTitle);

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    mockTaskRepo.update.mockResolvedValue({
      ...mockTask,
      title: newTitle
    } as TaskDocument);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, expect.objectContaining({
      title: newTitle
    }));
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Task updated successfully')
    );
  });

  it('should update task description', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(newDescription);

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    mockTaskRepo.update.mockResolvedValue({
      ...mockTask,
      description: newDescription
    } as TaskDocument);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, expect.objectContaining({
      description: newDescription
    }));
  });

  it('should update task due date', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(newDueDate.toISOString());

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    mockTaskRepo.update.mockResolvedValue({
      ...mockTask,
      dueDate: newDueDate
    } as TaskDocument);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, expect.objectContaining({
      dueDate: newDueDate
    }));
  });

  it('should handle invalid due date format', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('invalid-date');

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.update).not.toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Invalid due date format')
    );
  });

  it('should handle database errors when finding task', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId);

    mockTaskRepo.findById.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Failed to find task')
    );
  });

  it('should handle database errors when updating task', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId)
      .mockReturnValueOnce(newTitle);

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    mockTaskRepo.update.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update task')
    );
  });

  it('should handle no changes provided', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(taskId)
      .mockReturnValue(null);

    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.update).not.toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      expect.stringContaining('No changes provided')
    );
  });
});