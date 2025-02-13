import { RotationConfig, RotationMember, RotationResult, RotationService, RotationStrategy } from './types.js';

export class RoundRobinRotationService implements RotationService {
    private assignmentHistory: Map<string, Date[]> = new Map();

    getNextAssignment(config: RotationConfig): RotationResult {
        const { members, startDate, skipWeekends = false } = config;

        if (members.length === 0) {
            throw new Error('No members available for rotation');
        }

        // Sort members by last assignment date
        const sortedMembers = [...members].sort((a, b) => {
            const aDate = a.lastAssignmentDate?.getTime() ?? 0;
            const bDate = b.lastAssignmentDate?.getTime() ?? 0;
            return aDate - bDate;
        });

        // Get next member
        const nextMember = sortedMembers[0];
        let nextDate = new Date(startDate);

        // Adjust date if needed to skip weekends
        if (skipWeekends) {
            const day = nextDate.getDay();
            if (day === 0) { // Sunday
                nextDate.setDate(nextDate.getDate() + 1);
            } else if (day === 6) { // Saturday
                nextDate.setDate(nextDate.getDate() + 2);
            }
        }

        return {
            memberId: nextMember.id,
            nextDate,
            strategy: RotationStrategy.ROUND_ROBIN
        };
    }

    updateMemberHistory(memberId: string, assignmentDate: Date): void {
        const history = this.assignmentHistory.get(memberId) ?? [];
        history.push(assignmentDate);
        this.assignmentHistory.set(memberId, history);
    }

    getAssignmentHistory(memberId: string): Date[] {
        return this.assignmentHistory.get(memberId) ?? [];
    }
}

// Factory function to create rotation service based on strategy
export function createRotationService(strategy: RotationStrategy): RotationService {
    switch (strategy) {
        case RotationStrategy.ROUND_ROBIN:
            return new RoundRobinRotationService();
        case RotationStrategy.LOAD_BALANCED:
        case RotationStrategy.AVAILABILITY:
        case RotationStrategy.WEIGHTED_RANDOM:
            // TODO: Implement other strategies
            throw new Error(`Strategy ${strategy} not implemented yet`);
        default:
            throw new Error(`Unknown rotation strategy: ${strategy}`);
    }
}