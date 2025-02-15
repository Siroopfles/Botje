import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CompleteHandler } from '../../../../src/commands/tasks/handlers/completeHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { mockTaskRepo } from '../../../mocks/database.js';
import { TaskStatus } from 'shared';
import { TaskDocument } from 'database';

describe('CompleteHandler', () => {
  const handler = new CompleteHandler();
  let ctx: TestContext;
  
  const taskId = '1';
  let mockTask: TaskDocument;

  beforeEach(() => {
    ctx = setup();
    mockTask = {
      id: taskId,
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.PENDING,
      assigneeId: ctx.user.id,
      serverId: ctx.guild.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn()
    } as unknown as TaskDocument;
  });

  it('should handle guild-only restriction', async () => {
    // Arrange
    ctx.command.guildId = null;

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ This command can only be used in a server'
    });
  });

  it('should handle missing task ID', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(null);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Task ID is required'
    });
  });

  it('should handle non-existent task', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(taskId);
    mockTaskRepo.findById.mockResolvedValue(null);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.findById).toHaveBeenCalledWith(taskId);
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Task not found'
    });
  });

  it('should handle task from different server', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(taskId);
    const differentServerTask = {
      ...mockTask,
      serverId: 'different-server',
      save: jest.fn()
    } as unknown as TaskDocument;
    mockTaskRepo.findById.mockResolvedValue(differentServerTask);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Task belongs to a different server'
    });
  });

  it('should complete a pending task', async () => {
    // Arrange
    ctx.options.getString.mockReturnValueOnce(taskId);
    mockTaskRepo.findById.mockResolvedValue(mockTask);
    
    const completedTask = {
      ...mockTask,
      status: TaskStatus.COMPLETED,
      completedDate: new Date(),
      completedBy: ctx.user.id,
      save: jest.fn()
    } as unknown as TaskDocument;
    
    mockTaskRepo.update.mockResolvedValue(completedTask);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, expect.objectContaining({
      status: TaskStatus.COMPLETED,
      completedDate: expect.any(Date),
      completedBy: ctx.user.id
    }));
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: `✅ Task "${mockTask.title}" has been marked as completed`
    });
  });

  it('should handle already completed task', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(taskId);
    const completedTask = {
      ...mockTask,
      status: TaskStatus.COMPLETED,
      completedDate: new Date(),
      completedBy: ctx.user.id,
      save: jest.fn()
    } as unknown as TaskDocument;
    
    mockTaskRepo.findById.mockResolvedValue(completedTask);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.update).not.toHaveBeenCalled();
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Task is already completed'
    });
  });

  it('should handle database errors when finding task', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(taskId);
    mockTaskRepo.findById.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to find task: Database error'
    });
  });

  it('should handle database errors when updating task', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(taskId);
    mockTaskRepo.findById.mockResolvedValue(mockTask);
    mockTaskRepo.update.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to complete task: Database error'
    });
  });

  it('should include completion message when provided', async () => {
    // Arrange
    const completionMessage = 'Task completed with notes';
    ctx.options.getString
      .mockReturnValueOnce(taskId)
      .mockReturnValueOnce(completionMessage);
    
    mockTaskRepo.findById.mockResolvedValue(mockTask);
    const completedTask = {
      ...mockTask,
      status: TaskStatus.COMPLETED,
      completedDate: new Date(),
      completedBy: ctx.user.id,
      completionNotes: completionMessage,
      save: jest.fn()
    } as unknown as TaskDocument;
    
    mockTaskRepo.update.mockResolvedValue(completedTask);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, expect.objectContaining({
      status: TaskStatus.COMPLETED,
      completedDate: expect.any(Date),
      completedBy: ctx.user.id,
      completionNotes: completionMessage
    }));
  });
});