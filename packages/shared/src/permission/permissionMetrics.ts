import { Permission } from '../types/permission.js';

interface PermissionMetric {
    timestamp: number;
    userId: string;
    serverId: string;
    permission: Permission;
    duration: number;
    cacheHit: boolean;
    granted: boolean;
}

class PermissionMetrics {
    private static instance: PermissionMetrics;
    private metrics: PermissionMetric[] = [];
    private readonly maxMetrics = 1000; // Keep last 1000 checks
    private cacheHits = 0;
    private cacheMisses = 0;

    private constructor() {}

    public static getInstance(): PermissionMetrics {
        if (!PermissionMetrics.instance) {
            PermissionMetrics.instance = new PermissionMetrics();
        }
        return PermissionMetrics.instance;
    }

    public recordCheck(metric: PermissionMetric): void {
        this.metrics.push(metric);
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }
        if (metric.cacheHit) {
            this.cacheHits++;
        } else {
            this.cacheMisses++;
        }
    }

    public getStats() {
        const now = Date.now();
        const last5Minutes = this.metrics.filter(m => (now - m.timestamp) < 5 * 60 * 1000);

        return {
            totalChecks: this.metrics.length,
            cacheHitRate: this.cacheHits / (this.cacheHits + this.cacheMisses),
            averageCheckDuration: this.calculateAverageDuration(last5Minutes),
            checksPerMinute: (last5Minutes.length / 5),
            permissionDistribution: this.calculatePermissionDistribution(last5Minutes),
            grantRate: this.calculateGrantRate(last5Minutes)
        };
    }

    private calculateAverageDuration(metrics: PermissionMetric[]): number {
        if (metrics.length === 0) return 0;
        const total = metrics.reduce((sum, m) => sum + m.duration, 0);
        return total / metrics.length;
    }

    private calculatePermissionDistribution(metrics: PermissionMetric[]): Record<Permission, number> {
        const distribution: Partial<Record<Permission, number>> = {};
        metrics.forEach(m => {
            distribution[m.permission] = (distribution[m.permission] || 0) + 1;
        });
        return distribution as Record<Permission, number>;
    }

    private calculateGrantRate(metrics: PermissionMetric[]): number {
        if (metrics.length === 0) return 0;
        const granted = metrics.filter(m => m.granted).length;
        return granted / metrics.length;
    }

    public clear(): void {
        this.metrics = [];
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }
}

export const permissionMetrics = PermissionMetrics.getInstance();