declare module 'better-sqlite3' {
  namespace Database {
    interface RunResult {
      changes: number;
      lastInsertRowid: number | bigint;
    }

    interface Statement<
      BindParameters extends unknown[] = unknown[],
      Result = unknown,
    > {
      run(...params: BindParameters): RunResult;
      get(...params: BindParameters): Result | undefined;
      all(...params: BindParameters): Result[];
    }

    interface Transaction<T> {
      (): T;
    }

    interface Database {
      prepare<BindParameters extends unknown[] = unknown[], Result = unknown>(
        sql: string,
      ): Statement<BindParameters, Result>;
      transaction<T>(fn: () => T): Transaction<T>;
      exec(sql: string): this;
      pragma(source: string): unknown;
      close(): void;
    }
  }

  class Database implements Database.Database {
    constructor(filename: string, options?: Record<string, unknown>);
    prepare<BindParameters extends unknown[] = unknown[], Result = unknown>(
      sql: string,
    ): Database.Statement<BindParameters, Result>;
    transaction<T>(fn: () => T): Database.Transaction<T>;
    exec(sql: string): this;
    pragma(source: string): unknown;
    close(): void;
  }

  export = Database;
}
