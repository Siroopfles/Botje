import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { User } from 'discord.js';
import { handler } from '../../../../src/commands/stats/handlers/userHandler.js';
import { setup, TestContext } from '../../../setup.js';

describe('UserHandler', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setup();
  });

  describe('execute', () => {
    const mockUser = {
      id: '123456789',
      tag: 'TestUser#1234',
      toString: () => '@TestUser'
    } as unknown as User;

    it('should show user statistics', async () => {
      // Arrange
      ctx.options.getUser.mockReturnValue(mockUser);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        embeds: [expect.objectContaining({
          title: expect.stringContaining(mockUser.tag),
          fields: expect.arrayContaining([
            expect.objectContaining({ name: 'Tasks Created', value: '0' }),
            expect.objectContaining({ name: 'Tasks Completed', value: '0' }),
            expect.objectContaining({ name: 'Tasks Assigned', value: '0' })
          ])
        })]
      });
    });

    it('should use interaction user when no target specified', async () => {
      // Arrange
      ctx.options.getUser.mockReturnValue(null);
      Object.defineProperty(ctx.command, 'user', {
        value: mockUser,
        configurable: true
      });

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        embeds: [expect.objectContaining({
          title: expect.stringContaining(mockUser.tag)
        })]
      });
    });

    it('should handle missing guild context', async () => {
      // Arrange
      Object.defineProperty(ctx.command, 'guild', {
        value: null,
        configurable: true
      });

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ This command can only be used in a server'
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Test error');
      const spy = jest.spyOn(handler as any, 'getUserMetrics');
      spy.mockRejectedValue(error);

      ctx.options.getUser.mockReturnValue(mockUser);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Failed to fetch user statistics: Test error'
      });

      // Cleanup
      spy.mockRestore();
    });

    it('should show completion rate as percentage', async () => {
      // Arrange
      ctx.options.getUser.mockReturnValue(mockUser);
      const spy = jest.spyOn(handler as any, 'getUserMetrics');
      spy.mockResolvedValue({
        tasksCreated: 10,
        tasksCompleted: 5,
        tasksAssigned: 8,
        completionRate: 62.5,
        averageTaskTime: 2.5,
        lastActive: new Date()
      });

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        embeds: [expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ 
              name: 'Completion Rate', 
              value: expect.stringContaining('62.5%')
            })
          ])
        })]
      });

      // Cleanup
      spy.mockRestore();
    });
  });
});