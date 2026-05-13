import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly sums = new Map<string, number>();
  private readonly counts = new Map<string, number>();

  inc(name: string, by = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + by);
  }

  observe(name: string, value: number): void {
    this.sums.set(name, (this.sums.get(name) ?? 0) + value);
    this.counts.set(name, (this.counts.get(name) ?? 0) + 1);
  }

  toPrometheus(): string {
    const lines: string[] = [];

    for (const [name, value] of this.counters.entries()) {
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    }

    for (const [name, sum] of this.sums.entries()) {
      lines.push(`# TYPE ${name} summary`);
      lines.push(`${name}_sum ${sum}`);
      lines.push(`${name}_count ${this.counts.get(name) ?? 0}`);
    }

    return lines.join('\n') + (lines.length ? '\n' : '');
  }
}
