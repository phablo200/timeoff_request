import { DatabaseService } from '../../../src/db/database.service';
import { BalancesRepository } from '../../../src/modules/balances/balances.repository';
import { AppLogger } from '../../../src/modules/observability/app-logger.service';
import { AppLoggerRepository } from '../../../src/modules/observability/app-logger.repository';
import { MetricsService } from '../../../src/modules/observability/metrics.service';
import { TimeOffRequestsRepository } from '../../../src/modules/timeoff-requests/timeoff-requests.repository';
import { BatchSyncService } from '../../../src/modules/hcm-sync/batch-sync.service';
import { HcmClient } from '../../../src/modules/hcm-sync/hcm.client';

describe('BatchSyncService', () => {
  let service: BatchSyncService;
  let balancesRepository: BalancesRepository;
  let hcmClient: HcmClient;

  beforeEach(() => {
    process.env.DB_PATH = ':memory:';
    const db = new DatabaseService();
    balancesRepository = new BalancesRepository(db);
    hcmClient = new HcmClient();
    service = new BatchSyncService(
      db,
      balancesRepository,
      hcmClient,
      new TimeOffRequestsRepository(db),
      new MetricsService(),
      new AppLogger(new AppLoggerRepository(db)),
    );
  });

  it('ingests batch and returns inserted/updated/unchanged/rejected report', () => {
    balancesRepository.upsertAbsolute('e1', 'l1', 5);

    const report = service.ingestBatch({
      jobId: 'job-1',
      checksum: 'chk-1',
      balances: [
        { employeeId: 'e1', locationId: 'l1', days: 5 },
        { employeeId: 'e2', locationId: 'l2', days: 8 },
        { employeeId: 'e1', locationId: 'l1', days: 6 },
        { employeeId: '', locationId: 'l3', days: 2 },
      ],
    });

    expect(report).toEqual({
      inserted: 1,
      updated: 1,
      unchanged: 1,
      rejected: 1,
      deduped: false,
      resumed: false,
    });
  });

  it('dedupes same batch jobId + checksum', () => {
    service.ingestBatch({
      jobId: 'job-1',
      checksum: 'chk-1',
      balances: [{ employeeId: 'e1', locationId: 'l1', days: 5 }],
    });

    const second = service.ingestBatch({
      jobId: 'job-1',
      checksum: 'chk-1',
      balances: [{ employeeId: 'e1', locationId: 'l1', days: 9 }],
    });

    expect(second.deduped).toBe(true);
    expect(balancesRepository.get('e1', 'l1')?.availableDays).toBe(5);
  });

  it('reconciles one balance using HCM absolute value', async () => {
    balancesRepository.upsertAbsolute('e1', 'l1', 3);
    await hcmClient.seedBalance('e1', 'l1', 10);

    const result = await service.reconcileOne('e1', 'l1');

    expect(result.updated).toBe(true);
    expect(result.hcmDays).toBe(10);
    expect(balancesRepository.get('e1', 'l1')?.availableDays).toBe(10);
  });

  it('throws HCM_UNAVAILABLE when hcm is down', async () => {
    await hcmClient.setUnavailable(true);
    await expect(service.reconcileOne('e1', 'l1')).rejects.toThrow(
      'hcm unavailable',
    );
  });
});
