import { ConfigService } from '../../../src/config/config.service';
import { DatabaseService } from '../../../src/db/database.service';
import { BalancesRepository } from '../../../src/modules/balances/balances.repository';
import { AppLogger } from '../../../src/modules/observability/app-logger.service';
import { MetricsService } from '../../../src/modules/observability/metrics.service';
import { TimeOffRequestsRepository } from '../../../src/modules/timeoff-requests/timeoff-requests.repository';
import { TimeOffRequestsService } from '../../../src/modules/timeoff-requests/timeoff-requests.service';
import { HcmClient } from '../../../src/modules/hcm-sync/hcm.client';
import { OutboundSyncWorker } from '../../../src/modules/hcm-sync/outbound-sync.worker';

describe('OutboundSyncWorker', () => {
  let databaseService: DatabaseService;
  let requestsRepository: TimeOffRequestsRepository;
  let balancesRepository: BalancesRepository;
  let requestsService: TimeOffRequestsService;
  let hcmClient: HcmClient;
  let worker: OutboundSyncWorker;

  beforeEach(() => {
    process.env.DB_PATH = ':memory:';
    const config = new ConfigService();
    databaseService = new DatabaseService(config);
    requestsRepository = new TimeOffRequestsRepository(databaseService);
    balancesRepository = new BalancesRepository(databaseService);
    requestsService = new TimeOffRequestsService(
      requestsRepository,
      balancesRepository,
      databaseService,
    );
    hcmClient = new HcmClient();
    worker = new OutboundSyncWorker(
      requestsRepository,
      hcmClient,
      config,
      new MetricsService(),
      new AppLogger(),
    );
  });

  it('moves APPROVED request to SYNCED on success', async () => {
    balancesRepository.upsertAbsolute('e1', 'l1', 10);
    await hcmClient.seedBalance('e1', 'l1', 10);

    const req = requestsService.create({
      employeeId: 'e1',
      locationId: 'l1',
      days: 2,
    });
    requestsService.approve(req.id);

    const result = await worker.processDueEvents();
    const updated = requestsService.findById(req.id);

    expect(result.processed).toBe(1);
    expect(updated.status).toBe('SYNCED');
  });

  it('retries transient failures then keeps request not synced', async () => {
    balancesRepository.upsertAbsolute('e1', 'l1', 10);
    await hcmClient.seedBalance('e1', 'l1', 10);
    await hcmClient.setFailureMode('TRANSIENT');

    const req = requestsService.create({
      employeeId: 'e1',
      locationId: 'l1',
      days: 2,
    });
    requestsService.approve(req.id);

    const result = await worker.processDueEvents();
    const updated = requestsService.findById(req.id);

    expect(result.processed).toBe(0);
    expect(updated.status).toBe('APPROVED');
  });

  it('reverses request on functional failure', async () => {
    balancesRepository.upsertAbsolute('e1', 'l1', 10);
    await hcmClient.seedBalance('e1', 'l1', 10);
    await hcmClient.setFailureMode('FUNCTIONAL');

    const req = requestsService.create({
      employeeId: 'e1',
      locationId: 'l1',
      days: 2,
    });
    requestsService.approve(req.id);

    await worker.processDueEvents();

    const updated = requestsService.findById(req.id);
    expect(updated.status).toBe('REVERSED');
    expect(balancesRepository.get('e1', 'l1')?.availableDays).toBe(10);
  });
});
