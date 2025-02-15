import { jest } from '@jest/globals';
import type { 
  ChatInputCommandInteraction,
  Guild,
  GuildMember,
  Message,
  User,
  Collection,
  CommandInteractionOptionResolver,
  GuildMemberRoleManager,
  CacheType
} from 'discord.js';

// Define interfaces for our mock objects
interface MockOptions {
  getString: jest.Mock;
  getInteger: jest.Mock;
  getBoolean: jest.Mock;
  getUser: jest.Mock;
  getRole: jest.Mock;
  getNumber: jest.Mock;
  getSubcommand: jest.Mock;
}

interface MockMethods {
  reply: jest.Mock;
  editReply: jest.Mock;
  deferReply: jest.Mock;
  followUp: jest.Mock;
}

// Initialize base mock objects
const user = {
  id: '123456789',
  username: 'TestUser',
  discriminator: '0000',
  toString: () => '<@123456789>',
  valueOf: () => '123456789'
} as unknown as User;

const member = {
  id: '123456789',
  user,
  displayName: 'TestUser',
  roles: {
    cache: new Map()
  } as unknown as GuildMemberRoleManager
} as unknown as GuildMember;

const guild = {
  id: '987654321',
  name: 'Test Guild',
  members: {
    fetch: jest.fn().mockImplementation(() => Promise.resolve(member)),
    cache: new Map([[member.id, member]])
  }
} as unknown as Guild;

// Create interaction mock functions
const options: MockOptions = {
  getString: jest.fn().mockReturnValue(null),
  getInteger: jest.fn().mockReturnValue(null),
  getBoolean: jest.fn().mockReturnValue(null),
  getUser: jest.fn().mockReturnValue(null),
  getRole: jest.fn().mockReturnValue(null),
  getNumber: jest.fn().mockReturnValue(null),
  getSubcommand: jest.fn().mockReturnValue('')
};

const methods: MockMethods = {
  reply: jest.fn().mockImplementation(() => Promise.resolve({} as Message)),
  editReply: jest.fn().mockImplementation(() => Promise.resolve({} as Message)),
  deferReply: jest.fn().mockImplementation(() => Promise.resolve()),
  followUp: jest.fn().mockImplementation(() => Promise.resolve({} as Message))
};

// Create command interaction mock
const command = {
  guildId: guild.id,
  guild,
  member,
  user,
  ...methods,
  options: options as unknown as CommandInteractionOptionResolver
} as unknown as ChatInputCommandInteraction;

// Reset all mocks and set default responses
const reset = () => {
  jest.clearAllMocks();

  // Reset method responses
  Object.values(methods).forEach(mock => {
    mock.mockClear();
    if (mock === methods.deferReply) {
      mock.mockImplementation(() => Promise.resolve());
    } else {
      mock.mockImplementation(() => Promise.resolve({} as Message));
    }
  });

  // Reset option responses
  Object.values(options).forEach(mock => {
    mock.mockReset();
    mock.mockReturnValue(null);
  });

  // Reset guild methods
  (guild.members.fetch as jest.Mock)
    .mockImplementation(() => Promise.resolve(member));
};

// Test context type
interface TestContext {
  command: ChatInputCommandInteraction;
  options: MockOptions;
  methods: MockMethods;
  guild: Guild;
  member: GuildMember;
  user: User;
}

// Create test context
const createTestContext = (): TestContext => {
  reset();
  return {
    command,
    options,
    methods,
    guild,
    member,
    user
  };
};

// Exports
export {
  createTestContext as setup,
  command,
  options,
  methods,
  guild,
  member,
  user,
  reset
};

export type { TestContext, MockOptions, MockMethods };

// Re-export commonly used jest functions
export { describe, it, expect, jest, beforeEach } from '@jest/globals';
