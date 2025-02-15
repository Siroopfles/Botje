import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DeleteHandler } from '../../../../src/commands/tasks/handlers/deleteHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { mockTaskRepo } from '../../../mocks/database.js';
import { TaskStatus } from 'shared';
import { TaskDocument } from 'database';

describe('DeleteHandler', () => {
  const handler = new DeleteHandler();
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

  it('should delete task successfully', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(taskId);
    mockTaskRepo.findById.mockResolvedValue(mockTask);
    mockTaskRepo.delete.mockResolvedValue(true);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.delete).toHaveBeenCalledWith(taskId);
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: `✅ Deleted task "${mockTask.title}" (ID: ${taskId})`
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

  it('should handle database errors when deleting task', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(taskId);
    mockTaskRepo.findById.mockResolvedValue(mockTask);
    mockTaskRepo.delete.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to delete task: Database error'
    });
  });

  it('should handle completed tasks', async () => {
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
    mockTaskRepo.delete.mockResolvedValue(true);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.delete).toHaveBeenCalledWith(taskId);
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: `✅ Deleted task "${mockTask.title}" (ID: ${taskId})`
    });
  });

  it('should handle tasks with dependencies', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(taskId);
    const taskWithDependencies = {
      ...mockTask,
      dependentTasks: ['2', '3'],
      save: jest.fn()
    } as unknown as TaskDocument;
    mockTaskRepo.findById.mockResolvedValue(taskWithDependencies);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.delete).not.toHaveBeenCalled();
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Cannot delete task with dependencies'
    });
  });
});