import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  SlashCommandStringOption, 
  SlashCommandUserOption,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  ApplicationCommandOptionType
} from 'discord.js';
import { command } from '../../../src/commands/stats/index.js';
import { Period } from '../../../src/commands/stats/types.js';

describe('Stats Command Options', () => {
  describe('period option', () => {
    let periodOption: SlashCommandStringOption;
    const builder = command.data as SlashCommandBuilder;

    beforeEach(() => {
      const tasksCommand = builder.options.find(
        opt => opt.toJSON().name === 'tasks'
      ) as SlashCommandSubcommandBuilder;

      periodOption = tasksCommand.options.find(
        opt => opt.toJSON().name === 'period'
      ) as SlashCommandStringOption;
    });

    it('should have correct base properties', () => {
      expect(periodOption.toJSON()).toMatchObject({
        name: 'period',
        description: expect.any(String),
        required: false,
        type: ApplicationCommandOptionType.String
      });
    });

    it('should have all valid period choices', () => {
      const validPeriods: Period[] = ['day', 'week', 'month', 'all'];
      const choiceValues = periodOption.choices?.map(c => c.value);

      expect(choiceValues).toHaveLength(validPeriods.length);
      validPeriods.forEach(period => {
        expect(choiceValues).toContain(period);
      });
    });

    it('should have user-friendly choice names', () => {
      const expectedNames: Record<Period, string> = {
        day: 'Today',
        week: 'This Week',
        month: 'This Month',
        all: 'All Time'
      };

      periodOption.choices?.forEach(choice => {
        const value = choice.value as Period;
        expect(choice.name).toBe(expectedNames[value]);
      });
    });
  });

  describe('target user option', () => {
    let targetOption: SlashCommandUserOption;
    const builder = command.data as SlashCommandBuilder;

    beforeEach(() => {
      const userCommand = builder.options.find(
        opt => opt.toJSON().name === 'users'
      ) as SlashCommandSubcommandBuilder;

      targetOption = userCommand.options.find(
        opt => opt.toJSON().name === 'target'
      ) as SlashCommandUserOption;
    });

    it('should have correct base properties', () => {
      expect(targetOption.toJSON()).toMatchObject({
        name: 'target',
        description: expect.any(String),
        required: false,
        type: ApplicationCommandOptionType.User
      });
    });

    it('should have helpful description', () => {
      expect(targetOption.description.toLowerCase()).toContain('defaults to yourself');
    });
  });

  describe('subcommand structure', () => {
    const builder = command.data as SlashCommandBuilder;

    it('should have mutually exclusive subcommands', () => {
      // Get all subcommands
      const subcommands = builder.options
        .filter(opt => opt.toJSON().type === ApplicationCommandOptionType.Subcommand)
        .map(opt => opt.toJSON().name);

      // Get subcommand group commands
      const groupCommands = builder.options
        .filter(opt => opt.toJSON().type === ApplicationCommandOptionType.SubcommandGroup)
        .flatMap(group => {
          const groupBuilder = group as SlashCommandSubcommandGroupBuilder;
          return groupBuilder.options.map(opt => opt.toJSON().name);
        });

      // Ensure no duplicates
      const allCommands = [...subcommands, ...groupCommands];
      const uniqueCommands = new Set(allCommands);

      expect(allCommands.length).toBe(uniqueCommands.size);
    });

    it('should have valid command structure', () => {
      const permissionGroup = builder.options.find(
        opt => opt.toJSON().name === 'permissions'
      ) as SlashCommandSubcommandGroupBuilder;

      expect(permissionGroup.toJSON().type).toBe(ApplicationCommandOptionType.SubcommandGroup);
      expect(permissionGroup.options).toBeDefined();
      expect(permissionGroup.options.length).toBeGreaterThan(0);

      const standaloneCommands = builder.options.filter(
        opt => opt.toJSON().type === ApplicationCommandOptionType.Subcommand
      );

      expect(standaloneCommands).toHaveLength(2); // tasks and users
    });

    it('should have required properties', () => {
      const allOptions = builder.options.flatMap(opt => {
        if (opt.toJSON().type === ApplicationCommandOptionType.SubcommandGroup) {
          const groupBuilder = opt as SlashCommandSubcommandGroupBuilder;
          return groupBuilder.options;
        }
        return [opt];
      });

      allOptions.forEach(opt => {
        const data = opt.toJSON();
        expect(data.name).toBeDefined();
        expect(data.description).toBeDefined();
        expect(data.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('command permissions', () => {
    const builder = command.data as SlashCommandBuilder;

    it('should require guild context', () => {
      expect(builder.dm_permission).toBe(false);
    });

    it('should require manage guild permission', () => {
      expect(builder.default_member_permissions).toBeDefined();
      expect(builder.default_member_permissions).toBe('8'); // ManageGuild = 8
    });
  });
});