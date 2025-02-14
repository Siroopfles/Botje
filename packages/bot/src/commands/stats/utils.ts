import { EmbedBuilder } from 'discord.js';
import { PermissionService } from 'shared';
import { MetricsResult } from './types.js';

export function createMetricsEmbed(stats: ReturnType<typeof PermissionService.getStats>) {
    const { metrics, cache } = stats;

    // Format cache stats
    const cacheStats = `**Cache Stats:**
• Role Entries: ${cache.roleEntries}
• Permission Entries: ${cache.permissionEntries}`;

    // Format metrics
    const metricStats = `**Permission Metrics (Last 5 Minutes):**
• Total Checks: ${metrics.totalChecks}
• Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%
• Average Check Duration: ${metrics.averageCheckDuration.toFixed(2)}ms
• Checks Per Minute: ${metrics.checksPerMinute.toFixed(1)}
• Grant Rate: ${(metrics.grantRate * 100).toFixed(1)}%`;

    // Format permission distribution
    const permissionDist = Object.entries(metrics.permissionDistribution)
        .sort(([, a], [, b]) => b - a) // Sort by frequency
        .slice(0, 5) // Top 5 most checked permissions
        .map(([perm, count]) => `• ${perm}: ${count} checks`)
        .join('\n');

    const permissionStats = `**Top 5 Checked Permissions:**
${permissionDist}`;

    return new EmbedBuilder()
        .setTitle('📊 Permission System Statistics')
        .setDescription(`${cacheStats}\n\n${metricStats}\n\n${permissionStats}`)
        .setColor(0x00ff00)
        .setFooter({ text: 'Stats are from the last 5 minutes of activity' })
        .setTimestamp();
}

export function formatError(error: Error): string {
    return `❌ Error retrieving stats: ${error.message}`;
}