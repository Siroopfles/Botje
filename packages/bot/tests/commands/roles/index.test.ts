import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
  Role, 
  GuildMember, 
  Collection, 
  PermissionsBitField,
  GuildMemberRoleManager
} from 'discord.js';
import { command } from '../../../src/commands/roles/index.js';
import { setup, TestContext } from '../../setup.js';

describe('Roles Command', () => {
  let ctx: TestContext;

  // Create base mock role factory
  const createMockRole = (name: string) => ({
    name,
    id: name.toLowerCase().replace(/\s+/g, '-'),
    toString: () => `<@&${name.toLowerCase().replace(/\s+/g, '-')}>`,
    members: new Collection<string, GuildMember>(),
    position: 1,
    permissions: new PermissionsBitField(),
    color: 0,
    hoist: false,
    managed: false,
    mentionable: true,
    guild: null,
    createdAt: new Date(),
    createdTimestamp: Date.now(),
    editable: true
  }) as unknown as Role;

  beforeEach(() => {
    ctx = setup();

    // Create mock functions with proper types
    const createRole = jest.fn().mockImplementation(async (options: any) => 
      createMockRole(options.name)
    );

    // Create mock role manager functions
    const roleAdd = jest.fn().mockImplementation(() => Promise.resolve());
    const roleRemove = jest.fn().mockImplementation(() => Promise.resolve());

    // Create mock role manager
    const mockRoleManager = {
      add: roleAdd,
      remove: roleRemove
    } as unknown as GuildMemberRoleManager;

    // Create mock member
    const mockMember = {
      roles: mockRoleManager
    } as unknown as GuildMember;

    // Create mock fetch function
    const fetchMember = jest.fn().mockImplementation(() => Promise.resolve(mockMember));

    // Create roles cache
    const rolesCache = new Collection<string, Role>();

    // Create mock guild with proper types
    const mockGuild = {
      roles: {
        create: createRole,
        cache: rolesCache
      },
      members: {
        fetch: fetchMember
      }
    };

    // Assign mock guild to command context
    Object.defineProperty(ctx.command, 'guild', {
      value: mockGuild,
      configurable: true
    });
  });

  describe('create subcommand', () => {
    beforeEach(() => {
      ctx.options.getSubcommand.mockReturnValue('create');
    });

    it('should create a role with default name', async () => {
      // Arrange
      ctx.options.getString.mockImplementation((name) => {
        if (name === 'type') return 'task-manager';
        if (name === 'name') return null;
        return '';
      });

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.command.guild?.roles.create).toHaveBeenCalledWith({
        name: 'Task Manager',
        permissions: expect.any(Array),
        reason: expect.stringContaining('Created by')
      });
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('✅ Created role')
      });
    });

    it('should create a role with custom name', async () => {
      // Arrange
      ctx.options.getString.mockImplementation((name) => {
        if (name === 'type') return 'task-manager';
        if (name === 'name') return 'Custom Name';
        return '';
      });

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.command.guild?.roles.create).toHaveBeenCalledWith({
        name: 'Custom Name',
        permissions: expect.any(Array),
        reason: expect.stringContaining('Created by')
      });
    });
  });

  describe('assign subcommand', () => {
    beforeEach(() => {
      ctx.options.getSubcommand.mockReturnValue('assign');
    });

    it('should assign a role to a user', async () => {
      // Arrange
      const mockRole = createMockRole('Task Manager');
      const mockUser = { id: '123', tag: 'user#1234', toString: () => '@user' };

      ctx.options.getRole.mockReturnValue(mockRole);
      ctx.options.getUser.mockReturnValue(mockUser);

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.command.guild?.members.fetch).toHaveBeenCalledWith(mockUser.id);
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('✅ Assigned role')
      });
    });
  });

  describe('remove subcommand', () => {
    beforeEach(() => {
      ctx.options.getSubcommand.mockReturnValue('remove');
    });

    it('should remove a role from a user', async () => {
      // Arrange
      const mockRole = createMockRole('Task Manager');
      const mockUser = { id: '123', tag: 'user#1234', toString: () => '@user' };

      ctx.options.getRole.mockReturnValue(mockRole);
      ctx.options.getUser.mockReturnValue(mockUser);

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.command.guild?.members.fetch).toHaveBeenCalledWith(mockUser.id);
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('✅ Removed role')
      });
    });
  });

  describe('list subcommand', () => {
    beforeEach(() => {
      ctx.options.getSubcommand.mockReturnValue('list');
    });

    it('should list task-related roles', async () => {
      // Arrange
      const mockRoles = [
        createMockRole('Task Manager'),
        createMockRole('Task Creator')
      ];

      const roleCollection = new Collection<string, Role>();
      mockRoles.forEach(role => roleCollection.set(role.id, role));

      Object.defineProperty(ctx.command.guild?.roles, 'cache', {
        value: roleCollection,
        configurable: true
      });

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('📋 Task-related roles')
      });
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Task Manager (0 members)')
      });
    });

    it('should handle no roles found', async () => {
      // Arrange
      Object.defineProperty(ctx.command.guild?.roles, 'cache', {
        value: new Collection<string, Role>(),
        configurable: true
      });

      // Act
      await command.execute(ctx.command);

      // Assert
      expect(ctx.methods.editReply).toHaveBeenCalledWith({
        content: '❌ No task-related roles found'
      });
    });
  });

  it('should require guild context', async () => {
    // Arrange
    Object.defineProperty(ctx.command, 'guild', {
      value: null,
      configurable: true
    });

    // Act
    await command.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ This command can only be used in a server'
    });
  });

  it('should handle unknown subcommands', async () => {
    // Arrange
    ctx.options.getSubcommand.mockReturnValue('invalid');

    // Act
    await command.execute(ctx.command);

    // Assert
    expect(ctx.methods.editReply).toHaveBeenCalledWith({
      content: '❌ Unknown subcommand'
    });
  });
});