import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ServerSettingsHandler } from '../../../../src/commands/settings/handlers/serverSettingsHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { InteractionEditReplyOptions } from 'discord.js';

describe('ServerSettingsHandler', () => {
  const handler = new ServerSettingsHandler();
  let ctx: TestContext;

  const getReplyContent = (call: jest.Mock): string => {
    const reply = call.mock.calls[0][0] as InteractionEditReplyOptions;
    return reply.content as string;
  };

  beforeEach(() => {
    ctx = setup();
    
    // Mock internal methods
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

  describe('permissions', () => {
    it('should require guild context', async () => {
      // Arrange
      ctx.command.guildId = null;

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ This command can only be used in a server'
      });
    });

    it('should require manage server permission', async () => {
      // Arrange
      ctx.command.memberPermissions = null;

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ You need the Manage Server permission to use this command'
      });
    });
  });

  describe('view subcommand', () => {
    beforeEach(() => {
      ctx.options.getSubcommand.mockReturnValue('view');
    });

    it('should display current settings', async () => {
      // Act
      await handler.execute(ctx.command);

      // Assert
      const reply = getReplyContent(ctx.methods.editReply);
      expect(reply).toContain('⚙️ Server Notification Settings');
      expect(reply).toContain('✅ Task Created');
      expect(reply).toContain('✅ Task Assigned');
      expect(reply).toContain('✅ Task Completed');
      expect(reply).toContain('✅ Daily Digest');
    });

    it('should handle missing settings', async () => {
      // Arrange
      (handler as any).getSettings.mockResolvedValue(null);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ No server settings found. Use `/settings notifications` to configure settings.'
      });
    });
  });

  describe('notifications subcommand', () => {
    beforeEach(() => {
      ctx.options.getSubcommand.mockReturnValue('notifications');
    });

    it('should enable notification type', async () => {
      // Arrange
      ctx.options.getString.mockReturnValueOnce('enable');
      ctx.options.getString.mockReturnValueOnce('task-created');

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '✅ Task created notifications enabled for the server'
      });
    });

    it('should disable notification type', async () => {
      // Arrange
      ctx.options.getString.mockReturnValueOnce('disable');
      ctx.options.getString.mockReturnValueOnce('daily-digest');

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '✅ Daily digest notifications disabled for the server'
      });
    });

    it('should handle invalid action', async () => {
      // Arrange
      ctx.options.getString.mockReturnValueOnce('invalid');

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Invalid action. Use "enable" or "disable"'
      });
    });

    it('should handle invalid notification type', async () => {
      // Arrange
      ctx.options.getString.mockReturnValueOnce('enable');
      ctx.options.getString.mockReturnValueOnce('invalid-type');

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Invalid notification type'
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors in view', async () => {
      // Arrange
      ctx.options.getSubcommand.mockReturnValue('view');
      (handler as any).getSettings.mockRejectedValue(new Error('Database error'));

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Failed to fetch server settings: Database error'
      });
    });

    it('should handle database errors in update', async () => {
      // Arrange
      ctx.options.getSubcommand.mockReturnValue('notifications');
      ctx.options.getString.mockReturnValueOnce('enable');
      ctx.options.getString.mockReturnValueOnce('task-created');
      (handler as any).updateSettings.mockRejectedValue(new Error('Database error'));

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Failed to update server settings: Database error'
      });
    });
  });
});