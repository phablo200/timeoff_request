import { ConfigService } from '../../config.service';
import { DatabaseService } from '../../persistence/database.service';
import { BalancesRepository } from '../balances/balances.repository';
import { TimeOffRequestsRepository } from '../timeoff-requests/timeoff-requests.repository';
import { TimeOffRequestsService } from '../timeoff-requests/timeoff-requests.service';
import { HcmClient } from './hcm.client';
import { OutboundSyncWorker } from './outbound-sync.worker';

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
    worker = new OutboundSyncWorker(requestsRepository, hcmClient, config);
  });

  it('moves APPROVED request to SYNCED on success', () => {
    balancesRepository.upsertAbsolute('e1', 'l1', 10);
    hcmClient.seedBalance('e1', 'l1', 10);

    const req = requestsService.create({ employeeId: 'e1', locationId: 'l1', days: 2 });
    requestsService.approve(req.id);

    const result = worker.processDueEvents();
    const updated = requestsService.findById(req.id);

    expect(result.processed).toBe(1);
    expect(updated.status).toBe('SYNCED');
  });

  it('retries transient failures then keeps request not synced', () => {
    balancesRepository.upsertAbsolute('e1', 'l1', 10);
    hcmClient.seedBalance('e1', 'l1', 10);
    hcmClient.setFailureMode('TRANSIENT');

    const req = requestsService.create({ employeeId: 'e1', locationId: 'l1', days: 2 });
    requestsService.approve(req.id);

    const result = worker.processDueEvents();
    const updated = requestsService.findById(req.id);

    expect(result.processed).toBe(0);
    expect(updated.status).toBe('APPROVED');
  });

  it('reverses request on functional failure', () => {
    balancesRepository.upsertAbsolute('e1', 'l1', 10);
    hcmClient.seedBalance('e1', 'l1', 10);
    hcmClient.setFailureMode('FUNCTIONAL');

    const req = requestsService.create({ employeeId: 'e1', locationId: 'l1', days: 2 });
    requestsService.approve(req.id);

    worker.processDueEvents();

    const updated = requestsService.findById(req.id);
    expect(updated.status).toBe('REVERSED');
    expect(balancesRepository.get('e1', 'l1')?.availableDays).toBe(10);
  });
});
