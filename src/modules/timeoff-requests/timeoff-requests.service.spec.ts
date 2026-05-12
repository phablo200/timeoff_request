import { BalancesRepository } from '../balances/balances.repository';
import { DatabaseService } from '../../persistence/database.service';
import { TimeOffRequestsRepository } from './timeoff-requests.repository';
import { TimeOffRequestsService } from './timeoff-requests.service';

describe('TimeOffRequestsService', () => {
  let service: TimeOffRequestsService;
  let requestsRepository: TimeOffRequestsRepository;
  let balancesRepository: BalancesRepository;
  let databaseService: DatabaseService;

  beforeEach(() => {
    process.env.DB_PATH = ':memory:';
    databaseService = new DatabaseService();
    requestsRepository = new TimeOffRequestsRepository(databaseService);
    balancesRepository = new BalancesRepository(databaseService);
    service = new TimeOffRequestsService(
      requestsRepository,
      balancesRepository,
      databaseService,
    );
  });

  it('should approve and atomically decrement balance + append ledger + create sync event', () => {
    balancesRepository.upsertAbsolute('emp-1', 'loc-1', 10);
    const request = service.create({
      employeeId: 'emp-1',
      locationId: 'loc-1',
      days: 3,
    });

    const approved = service.approve(request.id);
    const balance = balancesRepository.get('emp-1', 'loc-1');

    expect(approved.status).toBe('APPROVED');
    expect(balance?.availableDays).toBe(7);
    expect(
      requestsRepository.listSyncEventsByRequestId(request.id),
    ).toHaveLength(1);
  });

  it('should prevent overspend under concurrent approvals', async () => {
    balancesRepository.upsertAbsolute('emp-1', 'loc-1', 10);
    const first = service.create({
      employeeId: 'emp-1',
      locationId: 'loc-1',
      days: 7,
    });
    const second = service.create({
      employeeId: 'emp-1',
      locationId: 'loc-1',
      days: 7,
    });

    const results = await Promise.allSettled([
      Promise.resolve().then(() => service.approve(first.id)),
      Promise.resolve().then(() => service.approve(second.id)),
    ]);

    const approvedCount = results.filter(
      (result) =>
        result.status === 'fulfilled' && result.value.status === 'APPROVED',
    ).length;
    const rejectedCount = results.filter(
      (result) => result.status === 'rejected',
    ).length;

    expect(approvedCount).toBe(1);
    expect(rejectedCount).toBe(1);
    expect(balancesRepository.get('emp-1', 'loc-1')?.availableDays).toBe(3);
  });

  it('should return ILLEGAL_STATUS_TRANSITION when approving non-PENDING request', () => {
    balancesRepository.upsertAbsolute('emp-1', 'loc-1', 10);
    const request = service.create({
      employeeId: 'emp-1',
      locationId: 'loc-1',
      days: 1,
    });
    service.approve(request.id);

    expect(() => service.approve(request.id)).toThrow(
      'cannot transition from APPROVED to APPROVED',
    );
  });
});
