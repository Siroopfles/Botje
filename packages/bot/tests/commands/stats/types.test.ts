import { describe, it, expect } from '@jest/globals';
import {
  command,
  Period,
  StatsCommandHandler,
  TaskMetrics,
  UserMetrics,
  PermissionMetrics
} from '../../../src/commands/stats/index.js';
import { handlers } from '../../../src/commands/stats/handlers/index.js';

describe('Stats Types and Exports', () => {
  describe('command exports', () => {
    it('should export command with correct structure', () => {
      expect(command.data).toBeDefined();
      expect(command.execute).toBeDefined();
      expect(typeof command.execute).toBe('function');
    });
  });

  describe('handler exports', () => {
    const requiredHandlers = ['permission', 'tasks', 'users'];

    it('should export all required handlers', () => {
      requiredHandlers.forEach(handlerName => {
        expect(handlers).toHaveProperty(handlerName);
        expect(handlers[handlerName as keyof typeof handlers]).toBeDefined();
      });
    });

    it('should implement StatsCommandHandler interface', () => {
      Object.values(handlers).forEach(handler => {
        expect(handler.execute).toBeDefined();
        expect(typeof handler.execute).toBe('function');
      });
    });
  });

  describe('type exports', () => {
    it('should expose Period type with correct values', () => {
      // While we can't test types directly at runtime,
      // we can test our type usage in a value context
      const validPeriods: Period[] = ['day', 'week', 'month', 'all'];
      expect(validPeriods).toHaveLength(4);
    });

    describe('metrics interfaces', () => {
      it('should have TaskMetrics shape', () => {
        // Runtime validation of interface shape
        const metrics: TaskMetrics = {
          totalTasks: 0,
          completedTasks: 0,
          averageCompletionTime: 0,
          tasksByStatus: {}
        };
        expect(metrics).toBeDefined();
      });

      it('should have UserMetrics shape', () => {
        const metrics: UserMetrics = {
          tasksCreated: 0,
          tasksCompleted: 0,
          tasksAssigned: 0,
          completionRate: 0,
          averageTaskTime: 0,
          lastActive: new Date()
        };
        expect(metrics).toBeDefined();
      });

      it('should have PermissionMetrics shape', () => {
        const metrics: PermissionMetrics = {
          userCount: 0,
          managerCount: 0,
          viewerCount: 0,
          averagePermissions: 0,
          permissionDistribution: {}
        };
        expect(metrics).toBeDefined();
      });
    });
  });

  describe('type compatibility', () => {
    it('should allow valid period assignments', () => {
      const periods = {
        today: 'day' as Period,
        thisWeek: 'week' as Period,
        thisMonth: 'month' as Period,
        allTime: 'all' as Period
      };

      expect(Object.values(periods)).toHaveLength(4);
      expect(periods.today).toBe('day');
    });

    it('should allow handler implementation', () => {
      const mockHandler: StatsCommandHandler = {
        execute: async () => Promise.resolve()
      };

      expect(mockHandler.execute).toBeDefined();
      expect(typeof mockHandler.execute).toBe('function');
    });
  });
});