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
import { CreateHandler } from '../../../../src/commands/tasks/handlers/createHandler.js';
import { mockInteraction, mocks } from '../../../setup.js';
import { TaskRepository, TaskDocument } from 'database';
import { TaskStatus } from 'shared';

describe('CreateHandler', () => {
  const handler = new CreateHandler();
  
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
  const title = 'Test Task';
  const description = 'Test Description';
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow

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

  it('should create a task with required fields', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(title)
      .mockReturnValueOnce(description)
      .mockReturnValue(null);

    const expectedTask = {
      id: '1',
      title,
      description,
      status: TaskStatus.PENDING,
      assigneeId: mockUser.id,
      serverId: guildId,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      save: jest.fn()
    } as unknown as TaskDocument;

    mockTaskRepo.create.mockResolvedValue(expectedTask);

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      title,
      description,
      status: TaskStatus.PENDING,
      assigneeId: mockUser.id,
      serverId: guildId
    }));

    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: `✅ Created task "${title}" [ID: ${expectedTask.id}]`
    });
  });

  it('should handle missing required fields', async () => {
    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockTaskRepo.create).not.toHaveBeenCalled();
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Title and description are required'
    });
  });

  it('should handle database errors', async () => {
    // Arrange
    jest.spyOn(mocks.functions, 'getString')
      .mockReturnValueOnce(title)
      .mockReturnValueOnce(description)
      .mockReturnValue(null);
    
    mockTaskRepo.create.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(mockInteraction as ChatInputCommandInteraction);

    // Assert
    expect(mockInteraction.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to create task: Database error'
    });
  });
});