import { Injectable } from '@nestjs/common';
import { BalancesRepository } from './balances.repository';

@Injectable()
export class BalancesService {
  constructor(private readonly balancesRepository: BalancesRepository) {}

  getBalance(employeeId: string, locationId: string) {
    return (
      this.balancesRepository.get(employeeId, locationId) ??
      this.balancesRepository.upsertAbsolute(employeeId, locationId, 0)
    );
  }
}
