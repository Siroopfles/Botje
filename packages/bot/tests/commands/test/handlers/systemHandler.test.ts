import { describe, it, expect, jest } from '@jest/globals';
import { ChatInputCommandInteraction } from 'discord.js';
import { SystemHandler } from '../../../../src/commands/test/handlers/systemHandler.js';
import { mockInteraction, mocks } from '../../../setup.js';

describe('SystemHandler', () => {
  const handler = new SystemHandler();

  describe('execute', () => {
    it('should handle ping subcommand', async () => {
      // Arrange
      mocks.functions.getSubcommand.mockReturnValue('ping');
      const initialTimestamp = Date.now();
      Object.defineProperty(mockInteraction, 'createdTimestamp', {
        value: initialTimestamp,
        configurable: true
      });

      // Act
      await handler.execute(mockInteraction);

      // Assert
      expect(mocks.functions.deferReply).toHaveBeenCalled();
      expect(mocks.functions.editReply).toHaveBeenCalledTimes(2);
      
      // First call should be "Pinging..."
      expect(mocks.functions.editReply).toHaveBeenNthCalledWith(1, 'Pinging...');
      
      // Second call should include latency
      const secondCallArg = mocks.functions.editReply.mock.calls[1][0];
      expect(typeof secondCallArg).toBe('string');
      expect(secondCallArg).toMatch(/^Pong! Latency: \d+ms$/);
    });

    it('should handle unknown subcommand', async () => {
      // Arrange
      mocks.functions.getSubcommand.mockReturnValue('unknown');

      // Act
      await handler.execute(mockInteraction);

      // Assert
      expect(mocks.functions.editReply).toHaveBeenCalledWith('❌ Unknown system test command');
    });
  });
});