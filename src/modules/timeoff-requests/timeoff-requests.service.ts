import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../db/database.service';
import { BalancesRepository } from '../balances/balances.repository';
import {
  assertHasBalance,
  assertPositiveDays,
} from '../../shared/domain/balance.policy';
import { DomainError } from '../../shared/domain/errors';
import { assertTransition } from '../../shared/domain/request-status.policy';
import { LedgerEntryType } from '../../shared/types/balance.types';
import { RequestStatus, TimeOffRequest } from '../../shared/types/request.types';
import {
  SyncDirection,
  SyncEvent,
  SyncStatus,
} from '../../shared/types/sync.types';
import { TimeOffRequestsRepository } from './timeoff-requests.repository';

interface CreateRequestInput {
  employeeId: string;
  locationId: string;
  days: number;
  reason?: string;
}

@Injectable()
export class TimeOffRequestsService {
  constructor(
    private readonly requestsRepository: TimeOffRequestsRepository,
    private readonly balancesRepository: BalancesRepository,
    private readonly databaseService: DatabaseService,
  ) {}

  create(input: CreateRequestInput): TimeOffRequest {
    assertPositiveDays(input.days);
    if (!input.employeeId || !input.locationId) {
      throw new DomainError(
        'INVALID_DIMENSIONS',
        'employeeId and locationId are required',
      );
    }

    const now = new Date().toISOString();
    const request: TimeOffRequest = {
      id: randomUUID(),
      employeeId: input.employeeId,
      locationId: input.locationId,
      days: input.days,
      reason: input.reason,
      status: RequestStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    return this.requestsRepository.create(request);
  }

  findById(id: string): TimeOffRequest {
    const request = this.requestsRepository.findById(id);
    if (!request) {
      throw new DomainError('REQUEST_NOT_FOUND', `request ${id} not found`);
    }
    return request;
  }

  listAll(): TimeOffRequest[] {
    return this.requestsRepository.listAll();
  }

  approve(id: string): TimeOffRequest {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const approved = this.databaseService.withTransaction(() => {
        const request = this.findById(id);
        assertTransition(request.status, RequestStatus.APPROVED);

        const currentBalance =
          this.balancesRepository.get(request.employeeId, request.locationId) ??
          this.balancesRepository.upsertAbsolute(
            request.employeeId,
            request.locationId,
            0,
          );

        assertHasBalance(currentBalance.availableDays, request.days);

        const consumed = this.balancesRepository.consumeWithVersion(
          request.employeeId,
          request.locationId,
          request.days,
          currentBalance.version,
        );

        if (!consumed) {
          return undefined;
        }

        const updatedRequest: TimeOffRequest = {
          ...request,
          status: RequestStatus.APPROVED,
          updatedAt: new Date().toISOString(),
        };
        this.requestsRepository.save(updatedRequest);

        this.balancesRepository.insertLedgerEntry({
          id: randomUUID(),
          balanceKey: `${updatedRequest.employeeId}::${updatedRequest.locationId}`,
          type: LedgerEntryType.RESERVATION,
          days: updatedRequest.days,
          requestId: updatedRequest.id,
          source: 'LOCAL_APPROVAL',
          createdAt: new Date().toISOString(),
        });

        const syncEvent: SyncEvent = {
          id: randomUUID(),
          direction: SyncDirection.OUTBOUND,
          externalEventId: `approve:${updatedRequest.id}`,
          payloadHash: JSON.stringify({
            employeeId: updatedRequest.employeeId,
            locationId: updatedRequest.locationId,
            days: updatedRequest.days,
          }),
          status: SyncStatus.QUEUED,
          createdAt: new Date().toISOString(),
        };

        this.requestsRepository.createSyncEvent({
          ...syncEvent,
          requestId: updatedRequest.id,
        });
        return updatedRequest;
      });

      if (approved) {
        return approved;
      }
    }

    throw new DomainError(
      'CONFLICT',
      'failed to approve after optimistic retries',
    );
  }

  reject(id: string): TimeOffRequest {
    const request = this.findById(id);
    assertTransition(request.status, RequestStatus.REJECTED);
    const updated = {
      ...request,
      status: RequestStatus.REJECTED,
      updatedAt: new Date().toISOString(),
    };
    return this.requestsRepository.save(updated);
  }

  cancel(id: string): TimeOffRequest {
    const request = this.findById(id);
    assertTransition(request.status, RequestStatus.CANCELLED);
    const updated = {
      ...request,
      status: RequestStatus.CANCELLED,
      updatedAt: new Date().toISOString(),
    };
    return this.requestsRepository.save(updated);
  }
}
