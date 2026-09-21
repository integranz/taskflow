import pg from "pg";

const DATE_OID = 1082;
pg.types.setTypeParser(DATE_OID, (value) => value);

export function createPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl });
}

export type Pool = pg.Pool;
