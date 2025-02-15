import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotificationHandler } from '../../../../src/commands/test/handlers/notificationHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { InteractionEditReplyOptions } from 'discord.js';

describe('NotificationHandler', () => {
  const handler = new NotificationHandler();
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setup();
  });

  const getReplyContent = (call: jest.Mock): string => {
    const reply = call.mock.calls[0][0] as InteractionEditReplyOptions;
    return reply.content as string;
  };

  describe('send subcommand', () => {
    beforeEach(() => {
      ctx.options.getSubcommand.mockReturnValue('send');
    });

    it('should handle sending test notification', async () => {
      // Arrange
      const testUser = {
        ...ctx.user,
        id: '999888777',
        toString: () => '<@999888777>'
      };

      ctx.options.getUser.mockReturnValue(testUser);
      ctx.options.getString.mockReturnValue('Test notification message');

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('✅ Test notification sent to')
      });
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining(testUser.toString())
      });
    });

    it('should handle missing user', async () => {
      // Arrange
      ctx.options.getUser.mockReturnValue(null);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ User is required'
      });
    });

    it('should handle missing message', async () => {
      // Arrange
      ctx.options.getUser.mockReturnValue(ctx.user);
      ctx.options.getString.mockReturnValue(null);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Message is required'
      });
    });
  });

  describe('message subcommand', () => {
    beforeEach(() => {
      ctx.options.getSubcommand.mockReturnValue('message');
    });

    it('should handle sending direct message', async () => {
      // Arrange
      const message = 'Test direct message';
      ctx.options.getString.mockReturnValue(message);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('✅ Direct message sent')
      });
    });

    it('should handle missing message', async () => {
      // Arrange
      ctx.options.getString.mockReturnValue(null);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Message is required'
      });
    });
  });

  describe('channel subcommand', () => {
    beforeEach(() => {
      ctx.options.getSubcommand.mockReturnValue('channel');
    });

    it('should handle sending channel announcement', async () => {
      // Arrange
      const message = 'Test channel announcement';
      ctx.options.getString.mockReturnValue(message);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('✅ Channel announcement sent')
      });
    });

    it('should handle missing message', async () => {
      // Arrange
      ctx.options.getString.mockReturnValue(null);

      // Act
      await handler.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ Message is required'
      });
    });
  });

  it('should handle invalid subcommand', async () => {
    // Arrange
    ctx.options.getSubcommand.mockReturnValue('invalid');

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Invalid subcommand'
    });
  });

  it('should handle error during message send', async () => {
    // Arrange
    ctx.options.getSubcommand.mockReturnValue('send');
    ctx.options.getUser.mockReturnValue(ctx.user);
    ctx.options.getString.mockReturnValue('Test message');
    
    // Mock followUp to simulate error
    ctx.methods.followUp.mockRejectedValue(new Error('Failed to send message'));

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('❌ Failed to send notification')
    });
  });
});