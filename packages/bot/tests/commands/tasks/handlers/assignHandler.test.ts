import { describe, it, expect, beforeEach } from '@jest/globals';
import { AssignHandler } from '../../../../src/commands/tasks/handlers/assignHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { mockTaskRepo } from '../../../mocks/database.js';
import { TaskStatus } from 'shared';
import { TaskDocument } from 'database';

describe('AssignHandler', () => {
  const handler = new AssignHandler();
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
      updatedAt: new Date()
    } as TaskDocument;
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
    mockTaskRepo.findById.mockResolvedValue({
      ...mockTask,
      serverId: 'different-server'
    } as TaskDocument);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Task belongs to a different server'
    });
  });

  it('should assign task to new user', async () => {
    // Arrange
    const newAssignee = {
      ...ctx.user,
      id: '999888777',
      toString: () => '<@999888777>'
    };
    
    ctx.options.getString.mockReturnValue(taskId);
    ctx.options.getUser.mockReturnValue(newAssignee);
    mockTaskRepo.findById.mockResolvedValue(mockTask);
    mockTaskRepo.update.mockResolvedValue({
      ...mockTask,
      assigneeId: newAssignee.id
    } as TaskDocument);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.update).toHaveBeenCalledWith(taskId, {
      assigneeId: newAssignee.id
    });
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: `✅ Task "${mockTask.title}" has been assigned to ${newAssignee.toString()}`
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
      content: '❌ Failed to reassign task: Database error'
    });
  });

  it('should handle assigning task to same user', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(taskId);
    ctx.options.getUser.mockReturnValue(ctx.user);
    mockTaskRepo.findById.mockResolvedValue({
      ...mockTask,
      assigneeId: ctx.user.id
    } as TaskDocument);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.update).not.toHaveBeenCalled();
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Task is already assigned to this user'
    });
  });
});