"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const migrator_1 = require("drizzle-orm/node-postgres/migrator");
const database_1 = require("../database");
async function runMigration() {
    console.log('Running migrations...');
    await (0, migrator_1.migrate)(database_1.db, { migrationsFolder: 'drizzle' });
    console.log('Migrations completed!');
    process.exit(0);
}
runMigration().catch((err) => {
    console.error('Migration failed!', err);
    process.exit(1);
});
