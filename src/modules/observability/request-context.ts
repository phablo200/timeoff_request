import { AsyncLocalStorage } from 'async_hooks';

export interface RequestTraceContext {
  correlationId: string;
  requestId: string;
  externalEventId?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestTraceContext>();

export class RequestContext {
  static run<T>(context: RequestTraceContext, fn: () => T): T {
    return requestContextStorage.run(context, fn);
  }

  static get(): RequestTraceContext | undefined {
    return requestContextStorage.getStore();
  }

  static setExternalEventId(externalEventId: string): void {
    const current = requestContextStorage.getStore();
    if (!current) return;

    requestContextStorage.enterWith({
      ...current,
      externalEventId,
    });
  }
}
