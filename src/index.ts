import { createApp } from "./app.js";
import { migrate } from "./db/migrate.js";
import { createPgStore } from "./db/pg-store.js";
import { createPool } from "./db/pool.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = createPool(databaseUrl);
await migrate(pool);

const port = Number(process.env.PORT ?? 3000);
const server = createApp(createPgStore(pool));

server.listen(port, () => {
  console.log(`taskflow listening on :${port}`);
});
