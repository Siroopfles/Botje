import { describe, it, expect } from '@jest/globals';
import { EmbedBuilder } from 'discord.js';
import { 
  createMetricsEmbed, 
  createTaskMetricsEmbed, 
  createUserMetricsEmbed, 
  createPermissionMetricsEmbed 
} from '../../../src/commands/stats/utils.js';

describe('Stats Metrics Formatting', () => {
  describe('createMetricsEmbed', () => {
    it('should handle empty metrics', () => {
      const embed = createMetricsEmbed('Empty Stats', {});
      expect(embed).toBeInstanceOf(EmbedBuilder);
      expect(embed.data.fields).toHaveLength(0);
    });

    it('should handle string and number values', () => {
      const metrics: Record<string, string | number> = {
        'String Value': 'test',
        'Number Value': 100,
        'Zero': 0,
        'Decimal': 1.5
      };

      const embed = createMetricsEmbed('Test', metrics);
      expect(embed.data.fields).toHaveLength(4);
      expect(embed.data.fields![0].value).toBe('test');
      expect(embed.data.fields![1].value).toBe('100');
      expect(embed.data.fields![2].value).toBe('0');
      expect(embed.data.fields![3].value).toBe('1.5');
    });

    it('should format large numbers correctly', () => {
      const embed = createMetricsEmbed('Large Numbers', {
        'Big Number': 1234567890,
        'Decimal': 1234567.89
      });

      expect(embed.data.fields![0].value).toBe('1,234,567,890');
      expect(embed.data.fields![1].value).toBe('1,234,567.89');
    });
  });

  describe('createTaskMetricsEmbed', () => {
    it('should handle zero tasks', () => {
      const metrics = {
        totalTasks: 0,
        completedTasks: 0,
        averageCompletionTime: 0,
        tasksByStatus: {}
      };

      const embed = createTaskMetricsEmbed(metrics, 'All Time');
      expect(embed.data.fields).toBeDefined();
      expect(embed.data.fields!.some(f => f.value === '0')).toBe(true);
    });

    it('should handle missing status categories', () => {
      const metrics = {
        totalTasks: 10,
        completedTasks: 5,
        averageCompletionTime: 2.5,
        tasksByStatus: {}
      };

      const embed = createTaskMetricsEmbed(metrics, 'Week');
      const statusField = embed.data.fields!.find(f => f.name === 'Tasks by Status');
      expect(statusField?.value.trim()).toBe('No status information available');
    });

    it('should format task distribution correctly', () => {
      const metrics = {
        totalTasks: 100,
        completedTasks: 75,
        averageCompletionTime: 2.5,
        tasksByStatus: {
          'In Progress': 15,
          'Done': 75,
          'Blocked': 10
        }
      };

      const embed = createTaskMetricsEmbed(metrics, 'Month');
      const statusField = embed.data.fields!.find(f => f.name === 'Tasks by Status');
      expect(statusField?.value).toContain('In Progress: 15');
      expect(statusField?.value).toContain('Done: 75');
      expect(statusField?.value).toContain('Blocked: 10');
    });
  });

  describe('createUserMetricsEmbed', () => {
    it('should handle inactive user', () => {
      const metrics = {
        tasksCreated: 0,
        tasksCompleted: 0,
        tasksAssigned: 0,
        completionRate: 0,
        averageTaskTime: 0,
        lastActive: new Date(0) // Unix epoch
      };

      const embed = createUserMetricsEmbed(metrics, 'Inactive User');
      const fields = embed.data.fields!;
      
      expect(fields.find(f => f.name === 'Tasks Created')?.value).toBe('0');
      expect(fields.find(f => f.name === 'Tasks Completed')?.value).toBe('0');
      expect(fields.find(f => f.name === 'Completion Rate')?.value).toBe('0.0%');
      expect(fields.find(f => f.name === 'Last Active')?.value).toContain('1970');
    });

    it('should format completion rate correctly', () => {
      const metrics = {
        tasksCreated: 10,
        tasksCompleted: 7,
        tasksAssigned: 5,
        completionRate: 70,
        averageTaskTime: 2.5,
        lastActive: new Date()
      };

      const embed = createUserMetricsEmbed(metrics, 'Active User');
      const rateField = embed.data.fields!.find(f => f.name === 'Completion Rate');
      expect(rateField?.value).toBe('70.0%');
    });

    it('should handle long usernames', () => {
      const longName = 'A'.repeat(100);
      const embed = createUserMetricsEmbed({
        tasksCreated: 0,
        tasksCompleted: 0,
        tasksAssigned: 0,
        completionRate: 0,
        averageTaskTime: 0,
        lastActive: new Date()
      }, longName);

      expect(embed.data.title?.length).toBeLessThanOrEqual(256);
    });
  });

  describe('createPermissionMetricsEmbed', () => {
    it('should handle no permissions', () => {
      const metrics = {
        userCount: 0,
        managerCount: 0,
        viewerCount: 0,
        averagePermissions: 0,
        permissionDistribution: {}
      };

      const embed = createPermissionMetricsEmbed(metrics);
      const distributionField = embed.data.fields!.find(f => f.name === 'Permission Distribution');
      expect(distributionField?.value.trim()).toBe('No permissions configured');
    });

    it('should format permission percentages correctly', () => {
      const metrics = {
        userCount: 100,
        managerCount: 20,
        viewerCount: 80,
        averagePermissions: 2.5,
        permissionDistribution: {
          'Admin': 0.2,
          'Moderator': 0.3,
          'User': 0.5
        }
      };

      const embed = createPermissionMetricsEmbed(metrics);
      const distributionField = embed.data.fields!.find(f => f.name === 'Permission Distribution');
      expect(distributionField?.value).toContain('20.0%');
      expect(distributionField?.value).toContain('30.0%');
      expect(distributionField?.value).toContain('50.0%');
    });

    it('should handle decimal averages', () => {
      const metrics = {
        userCount: 3,
        managerCount: 1,
        viewerCount: 2,
        averagePermissions: 1.666666666,
        permissionDistribution: { 'User': 1 }
      };

      const embed = createPermissionMetricsEmbed(metrics);
      const avgField = embed.data.fields!.find(f => f.name === 'Average Permissions');
      expect(avgField?.value).toBe('1.7');
    });
  });
});