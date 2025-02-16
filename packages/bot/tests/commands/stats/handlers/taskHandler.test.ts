import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ChatInputCommandInteraction } from 'discord.js';
import { handler } from '../../../../src/commands/stats/handlers/taskHandler.js';
import { setup, TestContext } from '../../../setup.js';

describe('TaskHandler', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setup();
  });

  describe('execute', () => {
    beforeEach(() => {
      ctx.options.getString.mockImplementation((name) => {
        if (name === 'period') return 'day';
        return null;
      });
    });

    it('should show task statistics', async () => {
      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        embeds: [expect.objectContaining({
          title: expect.stringContaining('Task Statistics'),
          fields: expect.arrayContaining([
            expect.objectContaining({ name: 'Total Tasks', value: '0' }),
            expect.objectContaining({ name: 'Completed Tasks', value: '0' })
          ])
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

    it('should handle different periods', async () => {
      // Arrange
      const periods = ['day', 'week', 'month', 'all'];
      
      for (const period of periods) {
        ctx.options.getString.mockReturnValue(period);

        // Act
        await handler.execute(ctx.command);

        // Assert
        expect(ctx.methods.editReply).toHaveBeenCalledWith({
          embeds: [expect.objectContaining({
            title: expect.stringContaining(
              period === 'day' ? 'Today' :
              period === 'week' ? 'This Week' :
              period === 'month' ? 'This Month' : 
              'All Time'
            )
          })]
        });
      }
    });

    it('should use all time as default period', async () => {
      // Arrange
      ctx.options.getString.mockReturnValue(null);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        embeds: [expect.objectContaining({
          title: expect.stringContaining('All Time')
        })]
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Test error');
      const spy = jest.spyOn(handler as any, 'getTaskMetrics');
      spy.mockRejectedValue(error);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Failed to fetch task statistics: Test error'
      });

      // Cleanup
      spy.mockRestore();
    });
  });
});