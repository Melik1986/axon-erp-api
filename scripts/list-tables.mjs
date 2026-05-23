import Database from "better-sqlite3";

const db = new Database("db.sqlite");
const rows = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all();
console.log(rows.map((r) => r.name).join("\n"));
