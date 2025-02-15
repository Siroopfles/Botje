import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ListHandler } from '../../../../src/commands/tasks/handlers/listHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { mockTaskRepo } from '../../../mocks/database.js';
import { TaskStatus } from 'shared';
import { TaskDocument } from 'database';

describe('ListHandler', () => {
  const handler = new ListHandler();
  let ctx: TestContext;
  
  let mockTasks: TaskDocument[];

  const createMockTask = (
    id: string,
    title: string,
    status: TaskStatus = TaskStatus.PENDING,
    completedDate?: Date
  ): TaskDocument => ({
    id,
    title,
    description: `Description for ${title}`,
    status,
    assigneeId: ctx.user.id,
    serverId: ctx.guild.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedDate,
    completedBy: completedDate ? ctx.user.id : undefined,
    save: jest.fn()
  } as unknown as TaskDocument);

  beforeEach(() => {
    ctx = setup();
    mockTasks = [
      createMockTask('1', 'Task 1'),
      createMockTask('2', 'Task 2', TaskStatus.COMPLETED, new Date())
    ];
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

  it('should list all tasks in server', async () => {
    // Arrange
    mockTaskRepo.findByServerId.mockResolvedValue(mockTasks);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.findByServerId).toHaveBeenCalledWith(ctx.guild.id);
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('📋 Tasks')
    });
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Task 1')
    });
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Task 2')
    });
  });

  it('should filter tasks by status', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(TaskStatus.PENDING);
    mockTaskRepo.findByStatusAndServer.mockResolvedValue([mockTasks[0]]);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.findByStatusAndServer).toHaveBeenCalledWith(
      ctx.guild.id,
      TaskStatus.PENDING
    );
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Task 1')
    });
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.not.stringContaining('Task 2')
    });
  });

  it('should filter tasks by assignee', async () => {
    // Arrange
    const filterUser = {
      ...ctx.user,
      id: '999888777',
      toString: () => '<@999888777>'
    };

    ctx.options.getUser.mockReturnValue(filterUser);
    mockTaskRepo.findByAssignee.mockResolvedValue([mockTasks[1]]);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.findByAssignee).toHaveBeenCalledWith(
      filterUser.id,
      ctx.guild.id
    );
  });

  it('should handle no tasks found', async () => {
    // Arrange
    mockTaskRepo.findByServerId.mockResolvedValue([]);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('No tasks found')
    });
  });

  it('should handle invalid status filter', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue('INVALID_STATUS');

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Invalid status filter'
    });
  });

  it('should handle database errors', async () => {
    // Arrange
    mockTaskRepo.findByServerId.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to fetch tasks: Database error'
    });
  });

  it('should handle pagination', async () => {
    // Arrange
    const manyTasks = Array(25).fill(null).map((_, i) => 
      createMockTask(String(i + 1), `Task ${i + 1}`)
    );

    mockTaskRepo.findByServerId.mockResolvedValue(manyTasks);
    ctx.options.getInteger.mockReturnValue(2); // Page number

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Page 2')
    });
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Task 11')
    }); // First task on second page
  });
});