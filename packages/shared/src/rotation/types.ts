export interface RotationMember {
    id: string;
    lastAssignmentDate?: Date;
    totalAssignments: number;
    availableWeekdays?: number[];  // 0-6, where 0 is Sunday
    excludedDates?: Date[];
}

export interface RotationConfig {
    strategy: RotationStrategy;
    members: RotationMember[];
    startDate: Date;
    skipWeekends?: boolean;
    balancingPeriod?: number;  // Number of days to consider for load balancing
}

export enum RotationStrategy {
    ROUND_ROBIN = 'ROUND_ROBIN',         // Simple rotation in order
    LOAD_BALANCED = 'LOAD_BALANCED',      // Based on total assignments
    AVAILABILITY = 'AVAILABILITY',        // Based on member availability
    WEIGHTED_RANDOM = 'WEIGHTED_RANDOM'   // Random with weighting based on history
}

export interface RotationResult {
    memberId: string;
    nextDate: Date;
    strategy: RotationStrategy;
}

export interface RotationService {
    getNextAssignment(config: RotationConfig): RotationResult;
    updateMemberHistory(memberId: string, assignmentDate: Date): void;
    getAssignmentHistory(memberId: string): Date[];
}