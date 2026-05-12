import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TimeOffRequestsService } from './timeoff-requests.service';

interface CreateRequestDto {
  employeeId: string;
  locationId: string;
  days: number;
  reason?: string;
}

@Controller('timeoff-requests')
export class TimeOffRequestsController {
  constructor(private readonly requestsService: TimeOffRequestsService) {}

  @Post()
  create(@Body() body: CreateRequestDto) {
    return this.requestsService.create(body);
  }

  @Get()
  listAll() {
    return this.requestsService.listAll();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.requestsService.findById(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.requestsService.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.requestsService.reject(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.requestsService.cancel(id);
  }
}
