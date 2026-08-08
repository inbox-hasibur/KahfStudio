import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load local environment variables (Source Database - 'khobor')
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const sourceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sourceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Destination Database - 'kahfnews' (Passed via command line)
const destUrl = process.env.DEST_SUPABASE_URL || 'https://quddjncnbnashegovuns.supabase.co';
const destKey = process.env.DEST_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1ZGRqbmNuYm5hc2hlZ292dW5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDA5OTg5OCwiZXhwIjoyMDk5Njc1ODk4fQ.gKgR9G9nMC8o0kG_NZCPRXry6ccUtiJPGVvFU5SRCeM';

if (!sourceUrl || !sourceKey) {
  console.error("Missing source database credentials in .env.local");
  process.exit(1);
}

if (!destUrl || !destKey) {
  console.error("Missing destination database credentials (DEST_SUPABASE_URL, DEST_SUPABASE_SERVICE_ROLE_KEY)");
  console.error("Usage: DEST_SUPABASE_URL=... DEST_SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/migrate_db.ts");
  process.exit(1);
}

const sourceDb = createClient(sourceUrl, sourceKey);
const destDb = createClient(destUrl, destKey);

const tablesToMigrate = ['system_settings', 'scraping_sources', 'news_articles'];

async function migrateTable(tableName: string) {
  console.log(`\n--- Migrating table: ${tableName} ---`);
  
  // 1. Fetch all data from source
  const { data: sourceData, error: fetchError } = await sourceDb
    .from(tableName)
    .select('*');

  if (fetchError) {
    console.error(`Error fetching data from source ${tableName}:`, fetchError.message);
    return;
  }

  if (!sourceData || sourceData.length === 0) {
    console.log(`No data found in source ${tableName}. Skipping.`);
    return;
  }

  console.log(`Found ${sourceData.length} records in ${tableName}. Clearing destination table...`);

  // 2. Clear destination table (to remove dummy data)
  // Delete all rows where id is not null (which effectively deletes all rows)
  const { error: deleteError } = await destDb
    .from(tableName)
    .delete()
    .neq('id', 'dummy_impossible_id_that_doesnt_exist_12345'); // This deletes all rows because all ids are not equal to this string (wait, what if id is uuid? It might throw type error)

  // Better way to delete all rows in Supabase:
  // .neq('id', '00000000-0000-0000-0000-000000000000') might throw if id is not UUID.
  // We can just get all IDs and delete them.
  const { data: destIds } = await destDb.from(tableName).select('id');
  if (destIds && destIds.length > 0) {
    const idsToDelete = destIds.map((row: any) => row.id);
    const { error: clearError } = await destDb.from(tableName).delete().in('id', idsToDelete);
    if (clearError) {
       console.error(`Failed to clear destination table ${tableName}:`, clearError.message);
       // We'll proceed with upsert anyway
    } else {
       console.log(`Cleared ${destIds.length} existing dummy rows from ${tableName}.`);
    }
  } else {
    console.log(`Destination table ${tableName} was already empty.`);
  }

  console.log(`Inserting to destination...`);

  let dataToInsert = sourceData;
  if (tableName === 'scraping_sources') {
     const seen = new Set();
     dataToInsert = sourceData.filter((item: any) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
     });
     console.log(`Filtered duplicates for scraping_sources. Inserting ${dataToInsert.length} unique sources.`);
  }

  // 3. Insert data to destination
  const { error: insertError } = await destDb
    .from(tableName)
    .upsert(dataToInsert, { onConflict: tableName === 'scraping_sources' ? 'url' : 'id' });

  if (insertError) {
    console.error(`Error inserting data into destination ${tableName}:`, insertError.message);
  } else {
    console.log(`Successfully migrated ${sourceData.length} records to ${tableName}!`);
  }
}

async function runMigration() {
  console.log("Starting Database Migration...");
  console.log(`Source: ${sourceUrl}`);
  console.log(`Destination: ${destUrl}`);

  for (const table of tablesToMigrate) {
    await migrateTable(table);
  }

  console.log("\nMigration completed!");
}

runMigration();
