import { createClient } from '@supabase/supabase-js';
import type { Database } from '../app/lib/database.types';
import * as readline from 'readline';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function cleanInvoices(userId: string, pattern?: string) {
  // First, count the invoices that will be deleted
  let countQuery = supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (pattern) {
    countQuery = countQuery.ilike('invoice_number', `${pattern}%`);
  }

  const { count } = await countQuery;

  if (!count || count === 0) {
    console.log('✓ No invoices found to delete.');
    return;
  }

  console.log(`\n⚠️  Found ${count} invoice(s) that will be deleted.`);

  if (pattern) {
    console.log(`   Pattern: Invoice numbers starting with "${pattern}"`);
  } else {
    console.log(`   All invoices for user: ${userId}`);
  }

  const answer = await askQuestion('\nAre you sure you want to delete these invoices? (yes/no): ');

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Deletion cancelled.');
    return;
  }

  // Delete the invoices
  let deleteQuery = supabase
    .from('invoices')
    .delete()
    .eq('user_id', userId);

  if (pattern) {
    deleteQuery = deleteQuery.ilike('invoice_number', `${pattern}%`);
  }

  const { error } = await deleteQuery;

  if (error) {
    console.error('Error deleting invoices:', error);
    throw error;
  }

  console.log(`\n✅ Successfully deleted ${count} invoice(s)!`);
}

async function main() {
  console.log('🗑️  Invoice Cleanup Script\n');

  // Get the user ID from command line argument
  const userId = process.argv[2];

  if (!userId) {
    console.error('❌ Please provide a user ID as an argument');
    console.log('\nUsage: npm run clean-invoices <user-id> [pattern]');
    console.log('\nExamples:');
    console.log('  npm run clean-invoices <user-id>           # Delete all invoices');
    console.log('  npm run clean-invoices <user-id> INV-      # Delete invoices starting with "INV-"');
    process.exit(1);
  }

  // Optional pattern argument
  const pattern = process.argv[3];

  console.log(`User ID: ${userId}`);
  if (pattern) {
    console.log(`Pattern: ${pattern}`);
  }

  await cleanInvoices(userId, pattern);
}

main().catch(console.error);
