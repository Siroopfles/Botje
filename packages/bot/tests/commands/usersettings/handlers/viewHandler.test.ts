import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ViewHandler } from '../../../../src/commands/usersettings/handlers/viewHandler.js';
import { setup, TestContext } from '../../../setup.js';
import { InteractionEditReplyOptions } from 'discord.js';

describe('ViewHandler', () => {
  const handler = new ViewHandler();
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setup();
  });

  const getReplyContent = (call: jest.Mock): string => {
    const reply = call.mock.calls[0][0] as InteractionEditReplyOptions;
    return reply.content as string;
  };

  it('should display default settings', async () => {
    // Arrange
    jest.spyOn(handler as any, 'getSettings').mockResolvedValue({
      taskCreated: true,
      taskAssigned: true,
      taskCompleted: true,
      taskDue: true,
      dailyDigest: true,
      weeklyDigest: true
    });

    // Act
    await handler.execute(ctx.command);

    // Assert
    const reply = getReplyContent(ctx.methods.editReply);
    expect(reply).toContain('⚙️ Your Notification Settings');
    expect(reply).toContain('✅ Task Created');
    expect(reply).toContain('✅ Task Assigned');
    expect(reply).toContain('✅ Task Completed');
    expect(reply).toContain('✅ Task Due');
    expect(reply).toContain('✅ Daily Digest');
    expect(reply).toContain('✅ Weekly Digest');
  });

  it('should show disabled settings with ❌', async () => {
    // Arrange
    jest.spyOn(handler as any, 'getSettings').mockResolvedValue({
      taskCreated: false,
      taskAssigned: true,
      taskCompleted: true,
      taskDue: true,
      dailyDigest: false,
      weeklyDigest: true
    });

    // Act
    await handler.execute(ctx.command);

    // Assert
    const reply = getReplyContent(ctx.methods.editReply);
    expect(reply).toContain('❌ Task Created');
    expect(reply).toContain('✅ Task Assigned');
    expect(reply).toContain('✅ Task Completed');
    expect(reply).toContain('✅ Task Due');
    expect(reply).toContain('❌ Daily Digest');
    expect(reply).toContain('✅ Weekly Digest');
  });

  it('should handle missing settings', async () => {
    // Arrange
    jest.spyOn(handler as any, 'getSettings').mockResolvedValue(null);

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ No settings found. Use `/usersettings notifications` to configure your settings.'
    });
  });

  it('should handle database errors', async () => {
    // Arrange
    jest.spyOn(handler as any, 'getSettings').mockRejectedValue(new Error('Database error'));

    // Act
    await handler.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Failed to fetch settings: Database error'
    });
  });

  it('should include command hints', async () => {
    // Arrange
    jest.spyOn(handler as any, 'getSettings').mockResolvedValue({
      taskCreated: true,
      taskAssigned: true,
      taskCompleted: true,
      taskDue: true,
      dailyDigest: true,
      weeklyDigest: true
    });

    // Act
    await handler.execute(ctx.command);

    // Assert
    const reply = getReplyContent(ctx.methods.editReply);
    expect(reply).toContain('Use `/usersettings notifications` to change your settings');
  });

  it('should format settings in a readable way', async () => {
    // Arrange
    jest.spyOn(handler as any, 'getSettings').mockResolvedValue({
      taskCreated: true,
      taskAssigned: true,
      taskCompleted: true,
      taskDue: true,
      dailyDigest: true,
      weeklyDigest: true
    });

    // Act
    await handler.execute(ctx.command);

    // Assert
    const reply = getReplyContent(ctx.methods.editReply);
    expect(reply).toMatch(/^⚙️ Your Notification Settings/);
    const lines = reply.split('\n');
    expect(lines.length).toBeGreaterThan(1);
    lines.slice(1).forEach(line => {
      expect(line).toMatch(/^[✅❌] [A-Za-z\s]+$/);
    });
  });
});