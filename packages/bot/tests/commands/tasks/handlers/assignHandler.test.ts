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
import { AssignHandler } from '../../../../src/commands/tasks/handlers/assignHandler.js';
import { mockInteraction, mocks } from '../../../setup.js';
import { TaskRepository, TaskDocument } from 'database';
import { TaskStatus } from 'shared';

describe('AssignHandler', () => {
  const handler = new AssignHandler();
  
  const mockUser = {
    id: '123456789',
    toString: () => '<@123456789>',
    valueOf: () => '123456789',
    username: 'TestUser',
    discriminator: '0000',
    bot: false,
    system: false,
  } as unknown as User;

  const mockAssignee = {
    id: '987654321',
    toString: () => '<@987654321>',
    valueOf: () => '987654321',
    username: 'AssigneeUser',
    discriminator: '0000',
    bot: false,
    system: false,
  } as unknown as User;

  const guildId = '111222333';
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

    mocks.functions.getUser.mockReturnValue(mockAssignee);
    mocks.functions.getString.mockReturnValueOnce(taskId);
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

  it('should handle non-existent task', async () => {
    // Arrange
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

  it('should assign task to new user', async () => {
    // Arrange
    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    mockTaskRepo.update.mockResolvedValue({
      ...mockTask,
      assigneeId: mockAssignee.id
    } as TaskDocument);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, {
      assigneeId: mockAssignee.id
    });
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: `✅ Task "${mockTask.title}" has been assigned to ${mockAssignee.toString()}`
    });
  });

  it('should handle database errors when finding task', async () => {
    // Arrange
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
    mockTaskRepo.findById.mockResolvedValue(mockTask as TaskDocument);
    mockTaskRepo.update.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to reassign task: Database error'
    });
  });

  it('should handle assigning task to same user', async () => {
    // Arrange
    const sameUserTask = {
      ...mockTask,
      assigneeId: mockAssignee.id
    };
    mockTaskRepo.findById.mockResolvedValue(sameUserTask as TaskDocument);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.update).not.toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Task is already assigned to this user'
    });
  });
});