export const domainKeys = {
  households: (userId?: string) => ['households', userId] as const,
  cats: (householdId?: string) => ['cats', householdId] as const,
  feedings: (householdId?: string) => ['feedings', householdId] as const,
  schedules: (householdId?: string) => ['schedules', householdId] as const,
  weightLogs: (householdId?: string) => ['weight-logs', householdId] as const,
  weightGoals: (householdId?: string) => ['weight-goals', householdId] as const,
};
