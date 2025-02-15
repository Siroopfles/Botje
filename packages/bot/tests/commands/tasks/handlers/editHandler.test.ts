import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EditHandler } from '../../../../src/commands/tasks/handlers/editHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { mockTaskRepo } from '../../../mocks/database.js';
import { TaskStatus } from 'shared';
import { TaskDocument } from 'database';

describe('EditHandler', () => {
  const handler = new EditHandler();
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

  it('should update task title', async () => {
    // Arrange
    const newTitle = 'Updated Task Title';
    ctx.options.getString
      .mockReturnValueOnce(taskId)
      .mockReturnValueOnce(newTitle)
      .mockReturnValue(null);

    mockTaskRepo.findById.mockResolvedValue(mockTask);
    const updatedTask = {
      ...mockTask,
      title: newTitle,
      save: jest.fn()
    } as unknown as TaskDocument;
    mockTaskRepo.update.mockResolvedValue(updatedTask);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, {
      title: newTitle
    });
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: `✅ Updated task "${newTitle}"`
    });
  });

  it('should update task description', async () => {
    // Arrange
    const newDescription = 'Updated Task Description';
    ctx.options.getString
      .mockReturnValueOnce(taskId)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(newDescription);

    mockTaskRepo.findById.mockResolvedValue(mockTask);
    const updatedTask = {
      ...mockTask,
      description: newDescription,
      save: jest.fn()
    } as unknown as TaskDocument;
    mockTaskRepo.update.mockResolvedValue(updatedTask);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, {
      description: newDescription
    });
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: `✅ Updated task "${mockTask.title}"`
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
    const newTitle = 'Updated Title';
    ctx.options.getString
      .mockReturnValueOnce(taskId)
      .mockReturnValueOnce(newTitle);
    
    mockTaskRepo.findById.mockResolvedValue(mockTask);
    mockTaskRepo.update.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to update task: Database error'
    });
  });

  it('should handle no changes provided', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(taskId);
    mockTaskRepo.findById.mockResolvedValue(mockTask);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.update).not.toHaveBeenCalled();
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ No changes provided'
    });
  });
});