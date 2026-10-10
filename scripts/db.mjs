// Start/stop the project-local PostgreSQL cluster (data lives in ./.pgdata, port 5433).
// Usage: npm run db:start | npm run db:stop
// Requires PostgreSQL binaries. Set PG_BIN if they are not on PATH or in the default Windows location.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const data = path.join(root, ".pgdata");
const exe = process.platform === "win32" ? ".exe" : "";

function binDir() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  for (const v of [18, 17, 16, 15, 14]) {
    const p = `C:\\Program Files\\PostgreSQL\\${v}\\bin`;
    if (existsSync(p)) return p;
  }
  return ""; // fall back to PATH
}

const bin = (name) => (binDir() ? path.join(binDir(), name + exe) : name);
const run = (name, args) => {
  const r = spawnSync(bin(name), args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const cmd = process.argv[2];
if (cmd === "start") {
  if (!existsSync(data)) {
    run("initdb", ["-D", data, "-U", "dgap", "--auth=trust", "-E", "UTF8", "--locale=C"]);
  }
  run("pg_ctl", ["-D", data, "-o", "-p 5433 -c listen_addresses=127.0.0.1", "-l", path.join(data, "server.log"), "start"]);
  for (const db of ["dgap_dev", "dgap_test"]) {
    spawnSync(bin("psql"), ["-h", "127.0.0.1", "-p", "5433", "-U", "dgap", "-d", "postgres", "-c", `CREATE DATABASE ${db}`], { stdio: "ignore" });
  }
  console.log("Local PostgreSQL is running on 127.0.0.1:5433 (databases: dgap_dev, dgap_test).");
} else if (cmd === "stop") {
  run("pg_ctl", ["-D", data, "stop"]);
} else {
  console.error("Usage: node scripts/db.mjs start|stop");
  process.exit(1);
}
