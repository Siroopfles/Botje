import { describe, it, expect } from '@jest/globals';
import { 
  SlashCommandBuilder, 
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
  ApplicationCommandOptionType
} from 'discord.js';
import { command } from '../../../src/commands/stats/index.js';

describe('Stats Command Registration', () => {
  describe('command definition', () => {
    const builder = command.data as SlashCommandBuilder;

    it('should match snapshot', () => {
      expect(builder.toJSON()).toMatchSnapshot();
    });

    it('should have correct base properties', () => {
      expect(builder.name).toBe('stats');
      expect(builder.description).toBeDefined();
      expect(builder.description.length).toBeGreaterThan(0);
    });

    it('should require guild context', () => {
      expect(builder.dm_permission).toBeFalsy();
      expect(builder.default_member_permissions).toBeDefined();
    });

    describe('subcommands', () => {
      it('should have permission management group', () => {
        const permissionGroup = builder.options.find(
          opt => opt.toJSON().name === 'permissions'
        ) as SlashCommandSubcommandGroupBuilder;
        
        expect(permissionGroup).toBeDefined();
        const subcommands = permissionGroup.options as SlashCommandSubcommandBuilder[];
        expect(subcommands).toHaveLength(2);
        
        const subcommandNames = subcommands.map(opt => opt.toJSON().name);
        expect(subcommandNames).toContain('view');
        expect(subcommandNames).toContain('reset');
      });

      it('should have task statistics options', () => {
        const taskCommand = builder.options.find(
          opt => opt.toJSON().name === 'tasks'
        ) as SlashCommandSubcommandBuilder;
        
        expect(taskCommand).toBeDefined();
        
        const periodOption = taskCommand.options.find(
          opt => opt.toJSON().name === 'period'
        ) as SlashCommandStringOption;

        expect(periodOption?.required).toBeFalsy();
        expect(periodOption?.choices).toHaveLength(4);
      });

      it('should have user statistics options', () => {
        const userCommand = builder.options.find(
          opt => opt.toJSON().name === 'users'
        ) as SlashCommandSubcommandBuilder;
        
        expect(userCommand).toBeDefined();
        
        const targetOption = userCommand.options.find(
          opt => opt.toJSON().name === 'target'
        ) as SlashCommandUserOption;

        expect(targetOption?.required).toBeFalsy();
      });
    });

    describe('option validation', () => {
      it('should have valid period choices', () => {
        const taskCommand = builder.options.find(
          opt => opt.toJSON().name === 'tasks'
        ) as SlashCommandSubcommandBuilder;

        const periodOption = taskCommand.options.find(
          opt => opt.toJSON().name === 'period'
        ) as SlashCommandStringOption;

        const choices = periodOption.choices?.map(c => ({
          name: c.name,
          value: c.value
        }));

        expect(choices).toEqual([
          { name: 'Today', value: 'day' },
          { name: 'This Week', value: 'week' },
          { name: 'This Month', value: 'month' },
          { name: 'All Time', value: 'all' }
        ]);
      });

      it('should have correct option types', () => {
        const userCommand = builder.options.find(
          opt => opt.toJSON().name === 'users'
        ) as SlashCommandSubcommandBuilder;

        const targetOption = userCommand.options.find(
          opt => opt.toJSON().name === 'target'
        ) as SlashCommandUserOption;

        expect(targetOption?.type).toBe(ApplicationCommandOptionType.User);
      });
    });
  });

  describe('handler registration', () => {
    it('should have execute method', () => {
      expect(command.execute).toBeDefined();
      expect(typeof command.execute).toBe('function');
    });
  });
});