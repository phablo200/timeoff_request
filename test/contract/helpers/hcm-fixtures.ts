export const CONTRACT_EMPLOYEE_ID = 'emp-contract';
export const CONTRACT_LOCATION_ID = 'loc-contract';

export function consumePayload(overrides?: Partial<{
  employeeId: string;
  locationId: string;
  days: number;
}>): { employeeId: string; locationId: string; days: number } {
  return {
    employeeId: overrides?.employeeId ?? CONTRACT_EMPLOYEE_ID,
    locationId: overrides?.locationId ?? CONTRACT_LOCATION_ID,
    days: overrides?.days ?? 1,
  };
}
