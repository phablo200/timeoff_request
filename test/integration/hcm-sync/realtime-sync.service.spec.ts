import { DatabaseService } from '../../../src/db/database.service';
import { BalancesRepository } from '../../../src/modules/balances/balances.repository';
import { RealtimeSyncService } from '../../../src/modules/hcm-sync/realtime-sync.service';

describe('RealtimeSyncService', () => {
  let service: RealtimeSyncService;

  beforeEach(() => {
    process.env.DB_PATH = ':memory:';
    const db = new DatabaseService();
    service = new RealtimeSyncService(new BalancesRepository(db));
  });

  it('should process realtime absolute balance update once', () => {
    const result = service.processBalanceUpdate({
      externalEventId: 'evt-1',
      employeeId: 'emp-1',
      locationId: 'loc-1',
      updateType: 'ABSOLUTE',
      days: 15,
    });

    expect(result.deduped).toBe(false);
    expect(result.balance).toBeDefined();
    expect(result.balance?.availableDays).toBe(15);
  });

  it('should dedupe duplicate realtime event by externalEventId+payloadHash', () => {
    service.processBalanceUpdate({
      externalEventId: 'evt-1',
      employeeId: 'emp-1',
      locationId: 'loc-1',
      updateType: 'ABSOLUTE',
      days: 15,
    });

    const duplicated = service.processBalanceUpdate({
      externalEventId: 'evt-1',
      employeeId: 'emp-1',
      locationId: 'loc-1',
      updateType: 'ABSOLUTE',
      days: 15,
    });

    expect(duplicated.deduped).toBe(true);
    expect(duplicated.balance?.availableDays).toBe(15);
  });
});
