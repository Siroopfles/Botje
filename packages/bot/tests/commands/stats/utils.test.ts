import { describe, it, expect } from '@jest/globals';
import { 
  formatError, 
  formatNumber, 
  formatPercentage, 
  createMetricsEmbed,
  createTaskMetricsEmbed,
  createUserMetricsEmbed,
  createPermissionMetricsEmbed
} from '../../../src/commands/stats/utils.js';

describe('Stats Utils', () => {
  describe('formatNumber', () => {
    it('should format numbers with thousands separators', () => {
      expect(formatNumber(1234)).toBe('1,234');
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages with default decimals', () => {
      expect(formatPercentage(75.5)).toBe('75.5%');
      expect(formatPercentage(100)).toBe('100.0%');
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should respect custom decimal places', () => {
      expect(formatPercentage(75.5678, 2)).toBe('75.57%');
      expect(formatPercentage(100, 0)).toBe('100%');
      expect(formatPercentage(33.333, 3)).toBe('33.333%');
    });
  });

  describe('formatError', () => {
    it('should extract message from Error objects', () => {
      expect(formatError(new Error('Test error'))).toBe('Test error');
    });

    it('should handle non-Error objects', () => {
      expect(formatError('string error')).toBe('An unknown error occurred');
      expect(formatError(undefined)).toBe('An unknown error occurred');
      expect(formatError(null)).toBe('An unknown error occurred');
    });
  });

  describe('createMetricsEmbed', () => {
    it('should create embed with title and metrics', () => {
      const embed = createMetricsEmbed('Test Metrics', {
        'Value 1': '100',
        'Value 2': '200'
      });

      expect(embed.data.title).toBe('Test Metrics');
      expect(embed.data.fields).toHaveLength(2);
      expect(embed.data.fields![0]).toEqual({
        name: 'Value 1',
        value: '100',
        inline: true
      });
    });

    it('should set correct color and timestamp', () => {
      const embed = createMetricsEmbed('Test', { 'Value': '100' });
      expect(embed.data.color).toBe(0x0099ff);
      expect(embed.data.timestamp).toBeDefined();
    });
  });

  describe('createTaskMetricsEmbed', () => {
    it('should format task metrics correctly', () => {
      const metrics = {
        totalTasks: 100,
        completedTasks: 75,
        averageCompletionTime: 2.5,
        tasksByStatus: {
          'Pending': 25,
          'In Progress': 50,
          'Completed': 25
        }
      };

      const embed = createTaskMetricsEmbed(metrics, 'This Week');
      expect(embed.data.title).toBe('📊 Task Statistics (This Week)');
      expect(embed.data.fields).toContainEqual({
        name: 'Tasks by Status',
        value: 'Pending: 25\nIn Progress: 50\nCompleted: 25',
        inline: true
      });
    });
  });

  describe('createUserMetricsEmbed', () => {
    it('should format user metrics correctly', () => {
      const metrics = {
        tasksCreated: 50,
        tasksCompleted: 40,
        tasksAssigned: 30,
        completionRate: 80,
        averageTaskTime: 3.5,
        lastActive: new Date('2024-02-16')
      };

      const embed = createUserMetricsEmbed(metrics, 'TestUser');
      expect(embed.data.title).toBe('📊 Statistics for TestUser');
      expect(embed.data.fields).toContainEqual({
        name: 'Completion Rate',
        value: '80.0%',
        inline: true
      });
    });
  });

  describe('createPermissionMetricsEmbed', () => {
    it('should format permission metrics correctly', () => {
      const metrics = {
        userCount: 100,
        managerCount: 5,
        viewerCount: 80,
        averagePermissions: 2.5,
        permissionDistribution: {
          'Manage': 0.05,
          'View': 0.8,
          'Create': 0.15
        }
      };

      const embed = createPermissionMetricsEmbed(metrics);
      expect(embed.data.title).toBe('📊 Permission Statistics');
      expect(embed.data.fields).toContainEqual({
        name: 'Permission Distribution',
        value: 'Manage: 0.1%\nView: 0.8%\nCreate: 0.2%',
        inline: true
      });
    });
  });
});