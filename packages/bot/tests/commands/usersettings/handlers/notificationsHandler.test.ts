import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotificationsHandler } from '../../../../src/commands/usersettings/handlers/notificationsHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { InteractionEditReplyOptions } from 'discord.js';

describe('NotificationsHandler', () => {
  const handler = new NotificationsHandler();
  let ctx: TestContext;

  const getReplyContent = (call: jest.Mock): string => {
    const reply = call.mock.calls[0][0] as InteractionEditReplyOptions;
    return reply.content as string;
  };

  beforeEach(() => {
    ctx = setup();
    
    // Mock the internal methods
    jest.spyOn(handler as any, 'getSettings').mockResolvedValue({
      taskCreated: true,
      taskAssigned: true,
      taskCompleted: true,
      taskDue: true,
      dailyDigest: true,
      weeklyDigest: true
    });
    
    jest.spyOn(handler as any, 'updateSettings').mockResolvedValue(true);
  });

  describe('enable subcommand', () => {
    beforeEach(() => {
      ctx.options.getSubcommand.mockReturnValue('enable');
    });

    it('should enable task created notifications', async () => {
      // Arrange
      ctx.options.getString.mockReturnValue('task-created');

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '✅ Task created notifications enabled'
      });
    });

    it('should enable task assigned notifications', async () => {
      // Arrange
      ctx.options.getString.mockReturnValue('task-assigned');

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '✅ Task assigned notifications enabled'
      });
    });
  });

  describe('disable subcommand', () => {
    beforeEach(() => {
      ctx.options.getSubcommand.mockReturnValue('disable');
    });

    it('should disable task completed notifications', async () => {
      // Arrange
      ctx.options.getString.mockReturnValue('task-completed');

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '✅ Task completed notifications disabled'
      });
    });

    it('should disable daily digest', async () => {
      // Arrange
      ctx.options.getString.mockReturnValue('daily-digest');

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '✅ Daily digest notifications disabled'
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing type parameter', async () => {
      // Arrange
      ctx.options.getSubcommand.mockReturnValue('enable');
      ctx.options.getString.mockReturnValue(null);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Notification type is required'
      });
    });

    it('should handle invalid notification type', async () => {
      // Arrange
      ctx.options.getSubcommand.mockReturnValue('enable');
      ctx.options.getString.mockReturnValue('invalid-type');

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Invalid notification type'
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      ctx.options.getSubcommand.mockReturnValue('enable');
      ctx.options.getString.mockReturnValue('task-created');
      (handler as any).updateSettings.mockRejectedValue(new Error('Database error'));

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Failed to update settings: Database error'
      });
    });
  });

  describe('settings state', () => {
    it('should handle already enabled notifications', async () => {
      // Arrange
      ctx.options.getSubcommand.mockReturnValue('enable');
      ctx.options.getString.mockReturnValue('task-created');
      (handler as any).getSettings.mockResolvedValue({
        taskCreated: true,
        taskAssigned: false
      });

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❓ Task created notifications are already enabled'
      });
    });

    it('should handle already disabled notifications', async () => {
      // Arrange
      ctx.options.getSubcommand.mockReturnValue('disable');
      ctx.options.getString.mockReturnValue('task-assigned');
      (handler as any).getSettings.mockResolvedValue({
        taskCreated: true,
        taskAssigned: false
      });

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❓ Task assigned notifications are already disabled'
      });
    });
  });
});