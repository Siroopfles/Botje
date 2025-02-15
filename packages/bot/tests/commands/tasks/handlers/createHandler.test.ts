import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CreateHandler } from '../../../../src/commands/tasks/handlers/createHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { mockTaskRepo } from '../../../mocks/database.js';
import { TaskStatus } from 'shared';
import { TaskDocument } from 'database';

describe('CreateHandler', () => {
  const handler = new CreateHandler();
  let ctx: TestContext;

  const createMockTask = (
    id: string,
    title: string,
    description: string
  ): TaskDocument => ({
    id,
    title,
    description,
    status: TaskStatus.PENDING,
    assigneeId: ctx.user.id,
    serverId: ctx.guild.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn()
  } as unknown as TaskDocument);

  beforeEach(() => {
    ctx = setup();
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

  it('should handle missing required fields', async () => {
    // Arrange
    ctx.options.getString.mockReturnValue(null);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.create).not.toHaveBeenCalled();
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Title and description are required'
    });
  });

  it('should handle missing description', async () => {
    // Arrange
    ctx.options.getString
      .mockReturnValueOnce('Test Title')
      .mockReturnValue(null);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.create).not.toHaveBeenCalled();
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Title and description are required'
    });
  });

  it('should create task with required fields', async () => {
    // Arrange
    const title = 'Test Task';
    const description = 'Test Description';
    
    ctx.options.getString
      .mockReturnValueOnce(title)
      .mockReturnValueOnce(description)
      .mockReturnValue(null);

    const mockTask = createMockTask('1', title, description);
    mockTaskRepo.create.mockResolvedValue(mockTask);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      title,
      description,
      status: TaskStatus.PENDING,
      assigneeId: ctx.user.id,
      serverId: ctx.guild.id
    }));

    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: `✅ Created task "${title}" [ID: ${mockTask.id}]`
    });
  });

  it('should handle optional due date', async () => {
    // Arrange
    const title = 'Test Task';
    const description = 'Test Description';
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow
    
    ctx.options.getString
      .mockReturnValueOnce(title)
      .mockReturnValueOnce(description);
    ctx.options.getInteger.mockReturnValue(dueDate.getTime());

    const mockTask = {
      ...createMockTask('1', title, description),
      dueDate
    } as unknown as TaskDocument;
    mockTaskRepo.create.mockResolvedValue(mockTask);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      title,
      description,
      dueDate
    }));
  });

  it('should handle database errors', async () => {
    // Arrange
    const title = 'Test Task';
    const description = 'Test Description';
    
    ctx.options.getString
      .mockReturnValueOnce(title)
      .mockReturnValueOnce(description);

    mockTaskRepo.create.mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to create task: Database error'
    });
  });

  it('should handle invalid due date', async () => {
    // Arrange
    const title = 'Test Task';
    const description = 'Test Description';
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday
    
    ctx.options.getString
      .mockReturnValueOnce(title)
      .mockReturnValueOnce(description);
    ctx.options.getInteger.mockReturnValue(pastDate.getTime());

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(mockTaskRepo.create).not.toHaveBeenCalled();
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Due date must be in the future'
    });
  });
});