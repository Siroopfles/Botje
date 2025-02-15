import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SystemHandler } from '../../../../src/commands/test/handlers/systemHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { InteractionEditReplyOptions } from 'discord.js';

describe('SystemHandler', () => {
  const handler = new SystemHandler();
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setup();
  });

  const getReplyContent = (call: jest.Mock): string => {
    const reply = call.mock.calls[0][0] as InteractionEditReplyOptions;
    return reply.content as string;
  };

  it('should handle ping command', async () => {
    // Arrange
    ctx.options.getSubcommand.mockReturnValue('ping');

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.deferReply).toHaveBeenCalled();
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('🏓 Pong!')
    });
  });

  it('should handle info command', async () => {
    // Arrange
    ctx.options.getSubcommand.mockReturnValue('info');

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('ℹ️ System Information')
    });
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('Memory Usage')
    });
  });

  it('should handle stats command', async () => {
    // Arrange
    ctx.options.getSubcommand.mockReturnValue('stats');

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: expect.stringContaining('📊 Bot Statistics')
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

  it('should include memory usage in info command', async () => {
    // Arrange
    ctx.options.getSubcommand.mockReturnValue('info');

    // Act
    await handler.execute(ctx.command);

    // Assert
    const reply = getReplyContent(ctx.methods.editReply);
    expect(reply).toContain('Memory Usage');
    expect(reply).toMatch(/RSS: \d+ MB/);
    expect(reply).toMatch(/Heap: \d+ MB/);
  });

  it('should include uptime in info command', async () => {
    // Arrange
    ctx.options.getSubcommand.mockReturnValue('info');

    // Act
    await handler.execute(ctx.command);

    // Assert
    const reply = getReplyContent(ctx.methods.editReply);
    expect(reply).toContain('Uptime:');
    expect(reply).toMatch(/\d+h \d+m \d+s/);
  });

  it('should handle bot stats', async () => {
    // Arrange
    ctx.options.getSubcommand.mockReturnValue('stats');

    // Act
    await handler.execute(ctx.command);

    // Assert
    const reply = getReplyContent(ctx.methods.editReply);
    expect(reply).toContain('📊 Bot Statistics');
    expect(reply).toContain('Commands:');
    expect(reply).toContain('Users:');
    expect(reply).toContain('Servers:');
  });

  it('should format large numbers in stats', async () => {
    // Arrange
    ctx.options.getSubcommand.mockReturnValue('stats');

    // Act
    await handler.execute(ctx.command);

    // Assert
    const reply = getReplyContent(ctx.methods.editReply);
    expect(reply).toMatch(/\d{1,3}(,\d{3})*(\.\d+)?/); // Check for number formatting
  });
});