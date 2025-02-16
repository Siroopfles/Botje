import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  Role
} from 'discord.js';
import { CommandModule } from '../../commands/index.js';

// Define role-related constants
const ROLE_CHOICES = [
  { name: 'Task Manager', value: 'task-manager' },
  { name: 'Task Creator', value: 'task-creator' },
  { name: 'Task Assignee', value: 'task-assignee' }
] as const;

const ROLE_PERMISSIONS = {
  'task-manager': [
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ManageMessages
  ],
  'task-creator': [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages
  ],
  'task-assignee': [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages
  ]
} as const;

// Create command builder
const data = new SlashCommandBuilder()
  .setName('roles')
  .setDescription('Manage task-related roles')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addSubcommand(subcommand =>
    subcommand
      .setName('create')
      .setDescription('Create a task-related role')
      .addStringOption(option =>
        option
          .setName('type')
          .setDescription('Type of role to create')
          .setRequired(true)
          .addChoices(...ROLE_CHOICES)
      )
      .addStringOption(option =>
        option
          .setName('name')
          .setDescription('Custom name for the role (optional)')
          .setRequired(false)
          .setMaxLength(100)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('assign')
      .setDescription('Assign a task-related role to a user')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('Role to assign')
          .setRequired(true)
      )
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to assign the role to')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove a task-related role from a user')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('Role to remove')
          .setRequired(true)
      )
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to remove the role from')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List all task-related roles')
  );

// Create command instance
export const roles: CommandModule = {
  data,
  execute: async (interaction: ChatInputCommandInteraction) => {
    // Verify guild context
    if (!interaction.guild) {
      await interaction.editReply({
        content: '❌ This command can only be used in a server'
      });
      return;
    }

    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case 'create': {
          const type = interaction.options.getString('type', true);
          const customName = interaction.options.getString('name');
          const name = customName || type.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');

          const role = await interaction.guild.roles.create({
            name,
            permissions: ROLE_PERMISSIONS[type as keyof typeof ROLE_PERMISSIONS],
            reason: `Created by ${interaction.user.tag} using /roles create`
          });

          await interaction.editReply({
            content: `✅ Created role ${role} with ${type} permissions`
          });
          break;
        }

        case 'assign': {
          const roleOption = interaction.options.getRole('role', true);
          if (!(roleOption instanceof Role)) {
            throw new Error('Invalid role provided');
          }

          const user = interaction.options.getUser('user', true);
          const member = await interaction.guild.members.fetch(user.id);

          await member.roles.add(roleOption);

          await interaction.editReply({
            content: `✅ Assigned role ${roleOption} to ${user}`
          });
          break;
        }

        case 'remove': {
          const roleOption = interaction.options.getRole('role', true);
          if (!(roleOption instanceof Role)) {
            throw new Error('Invalid role provided');
          }

          const user = interaction.options.getUser('user', true);
          const member = await interaction.guild.members.fetch(user.id);

          await member.roles.remove(roleOption);

          await interaction.editReply({
            content: `✅ Removed role ${roleOption} from ${user}`
          });
          break;
        }

        case 'list': {
          const roleList = interaction.guild.roles.cache
            .filter(role => ROLE_CHOICES.some(choice => 
              role.name.toLowerCase().includes(choice.value)
            ))
            .map(role => `- ${role.name} (${role.members.size} members)`)
            .join('\n');

          await interaction.editReply({
            content: roleList ? `📋 Task-related roles:\n${roleList}` : '❌ No task-related roles found'
          });
          break;
        }

        default:
          await interaction.editReply({
            content: '❌ Unknown subcommand'
          });
      }
    } catch (error) {
      await interaction.editReply({
        content: `❌ Failed to manage roles: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
};

// Export command and types
export { roles as command };
export type RoleType = typeof ROLE_CHOICES[number]['value'];