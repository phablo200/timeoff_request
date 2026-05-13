import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DomainErrorCode } from '../../filters/domain-error.filter';
import { BalancesRepository } from '../balances/balances.repository';
import { DomainError } from '../../shared/domain/errors';
import { LedgerEntryType } from '../../shared/types/balance.types';

export interface RealtimeBalanceEvent {
  externalEventId: string;
  employeeId: string;
  locationId: string;
  updateType: 'ABSOLUTE' | 'DELTA';
  days: number;
}

@Injectable()
export class RealtimeSyncService {
  constructor(private readonly balancesRepository: BalancesRepository) {}

  processBalanceUpdate(event: RealtimeBalanceEvent) {
    if (!event.externalEventId || !event.employeeId || !event.locationId) {
      throw new DomainError(
        DomainErrorCode.INVALID_DIMENSIONS,
        'invalid realtime event',
      );
    }

    const payloadHash = JSON.stringify(event);
    const dedupeResult = this.balancesRepository.recordInboundSyncEvent(
      event.externalEventId,
      payloadHash,
    );

    if (!dedupeResult.inserted) {
      return {
        deduped: true,
        balance: this.balancesRepository.get(
          event.employeeId,
          event.locationId,
        ),
      };
    }

    const balance =
      event.updateType === 'ABSOLUTE'
        ? this.balancesRepository.upsertAbsolute(
            event.employeeId,
            event.locationId,
            event.days,
          )
        : this.balancesRepository.applyDelta(
            event.employeeId,
            event.locationId,
            event.days,
          );

    this.balancesRepository.insertLedgerEntry({
      id: randomUUID(),
      balanceKey: `${event.employeeId}::${event.locationId}`,
      type:
        event.updateType === 'ABSOLUTE'
          ? LedgerEntryType.HCM_REALTIME_ABSOLUTE
          : LedgerEntryType.HCM_REALTIME_DELTA,
      days: event.days,
      source: 'HCM_REALTIME',
      createdAt: new Date().toISOString(),
    });

    return { deduped: false, balance };
  }
}
