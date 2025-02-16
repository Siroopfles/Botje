import { jest } from '@jest/globals';
import { 
  ChatInputCommandInteraction, 
  Client, 
  CommandInteractionOptionResolver, 
  Guild, 
  GuildMember, 
  User 
} from 'discord.js';

// Mock options interface
export interface MockOptions {
  getString: jest.Mock;
  getInteger: jest.Mock;
  getBoolean: jest.Mock;
  getUser: jest.Mock;
  getRole: jest.Mock;
  getNumber: jest.Mock;
  getSubcommand: jest.Mock;
  getSubcommandGroup: jest.Mock;
}

// Mock methods interface
export interface MockMethods {
  editReply: jest.Mock;
  followUp: jest.Mock;
  reply: jest.Mock;
  deferReply: jest.Mock;
}

// Mock entities interface
export interface MockEntities {
  user: User;
  guild: Guild;
  member: GuildMember;
}

// Test context interface
export interface TestContext {
  command: ChatInputCommandInteraction;
  options: MockOptions;
  methods: MockMethods;
  user: User;
  guild: Guild;
  member: GuildMember;
}

/**
 * Setup test context with mocked interaction
 */
export function setup(): TestContext {
  // Create mock options
  const options: MockOptions = {
    getString: jest.fn(),
    getInteger: jest.fn(),
    getBoolean: jest.fn(),
    getUser: jest.fn(),
    getRole: jest.fn(),
    getNumber: jest.fn(),
    getSubcommand: jest.fn(),
    getSubcommandGroup: jest.fn()
  };

  // Create mock methods
  const methods: MockMethods = {
    editReply: jest.fn(),
    followUp: jest.fn(),
    reply: jest.fn(),
    deferReply: jest.fn()
  };

  // Create mock user
  const user = {
    id: 'test-user',
    tag: 'test#0000',
    toString: () => '<@test-user>'
  } as unknown as User;

  // Create mock guild
  const guild = {
    id: 'test-guild',
    name: 'Test Guild',
    toString: () => 'Test Guild'
  } as unknown as Guild;

  // Create mock member
  const member = {
    id: user.id,
    user,
    guild,
    toString: () => user.toString()
  } as unknown as GuildMember;

  // Create mock interaction
  const command = {
    guild,
    user,
    member,
    options,
    ...methods
  } as unknown as ChatInputCommandInteraction;

  return { 
    command, 
    options, 
    methods,
    user,
    guild,
    member
  };
}
