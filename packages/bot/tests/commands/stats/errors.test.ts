import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
  ChatInputCommandInteraction, 
  PermissionsBitField,
  SlashCommandBuilder
} from 'discord.js';
import { PermissionService } from 'shared';
import { command } from '../../../src/commands/stats/index.js';
import { handlers } from '../../../src/commands/stats/handlers/index.js';
import { setup, TestContext } from '../../setup.js';

describe('Stats Error Handling', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setup();
    
    // Setup default permissions
    Object.defineProperty(ctx.command, 'memberPermissions', {
      value: new PermissionsBitField(['ManageGuild']),
      configurable: true
    });
  });

  describe('permission checks', () => {
    it('should handle missing guild context gracefully', async () => {
      // Arrange
      Object.defineProperty(ctx.command, 'guild', {
        value: null,
        configurable: true
      });

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('can only be used in a server')
      });
    });

    it('should handle insufficient permissions', async () => {
      // Arrange
      Object.defineProperty(ctx.command, 'memberPermissions', {
        value: new PermissionsBitField([]),
        configurable: true
      });

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('need the Manage Server permission')
      });
    });
  });

  describe('subcommand validation', () => {
    it('should handle invalid subcommand group', async () => {
      // Arrange
      ctx.options.getSubcommandGroup.mockReturnValue('invalid');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Unknown command')
      });
    });

    it('should handle invalid subcommand', async () => {
      // Arrange
      ctx.options.getSubcommand.mockReturnValue('invalid');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Unknown command')
      });
    });
  });

  describe('service errors', () => {
    it('should handle permission service errors', async () => {
      // Arrange
      const error = new Error('Permission service error');
      jest.spyOn(PermissionService, 'getStats').mockImplementation(() => {
        throw error;
      });

      ctx.options.getSubcommandGroup.mockReturnValue('permissions');
      ctx.options.getSubcommand.mockReturnValue('view');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Permission service error')
      });
    });

    it('should handle cache reset errors', async () => {
      // Arrange
      const error = new Error('Cache reset error');
      jest.spyOn(PermissionService, 'clearAllCache').mockImplementation(() => {
        throw error;
      });

      ctx.options.getSubcommandGroup.mockReturnValue('permissions');
      ctx.options.getSubcommand.mockReturnValue('reset');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Cache reset error')
      });
    });
  });

  describe('handler errors', () => {
    it('should handle task handler errors', async () => {
      // Arrange
      const error = new Error('Task handler error');
      jest.spyOn(handlers.tasks, 'execute').mockRejectedValue(error);

      ctx.options.getSubcommand.mockReturnValue('tasks');
      ctx.options.getString.mockReturnValue('day');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Task handler error')
      });
    });

    it('should handle user handler errors', async () => {
      // Arrange
      const error = new Error('User handler error');
      jest.spyOn(handlers.users, 'execute').mockRejectedValue(error);

      ctx.options.getSubcommand.mockReturnValue('users');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('User handler error')
      });
    });
  });

  describe('edge cases', () => {
    it('should handle undefined error messages', async () => {
      // Arrange
      jest.spyOn(handlers.tasks, 'execute').mockRejectedValue(undefined);
      ctx.options.getSubcommand.mockReturnValue('tasks');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Unknown error')
      });
    });

    it('should handle non-Error objects', async () => {
      // Arrange
      jest.spyOn(handlers.tasks, 'execute').mockRejectedValue('String error');
      ctx.options.getSubcommand.mockReturnValue('tasks');

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Unknown error')
      });
    });
  });
});