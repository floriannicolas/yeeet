import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '../database';

async function runMigration() {
  console.log('Running migrations...');
  
  await migrate(db, { migrationsFolder: 'drizzle' });
  
  console.log('Migrations completed!');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed!', err);
  process.exit(1);
}); 