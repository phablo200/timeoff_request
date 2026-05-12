export interface IdempotencyRecord {
  key: string;
  fingerprint: string;
  responseBody: unknown;
  statusCode: number;
  createdAt: string;
}
