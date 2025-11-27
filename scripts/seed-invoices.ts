import { createClient } from '@supabase/supabase-js';
import type { Database } from '../app/lib/database.types';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Sample client names
const clients = [
  { name: 'Acme Corporation', email: 'billing@acme.com' },
  { name: 'Tech Innovations Inc', email: 'accounts@techinnovations.com' },
  { name: 'Global Solutions LLC', email: 'finance@globalsolutions.com' },
  { name: 'Creative Studios', email: 'payments@creativestudios.com' },
  { name: 'Digital Marketing Co', email: 'billing@digitalmarketing.com' },
  { name: 'StartUp Ventures', email: 'accounting@startupventures.com' },
  { name: 'Enterprise Systems', email: 'invoices@enterprisesystems.com' },
  { name: 'Cloud Services Ltd', email: 'billing@cloudservices.com' },
  { name: 'Design Agency', email: 'finance@designagency.com' },
  { name: 'Software Solutions', email: 'accounts@softwaresolutions.com' },
  { name: 'Marketing Pros', email: 'billing@marketingpros.com' },
  { name: 'Consulting Group', email: 'payments@consultinggroup.com' },
];

// Sample line item descriptions
const services = [
  { description: 'Website Development', rate: 125, quantity: 40 },
  { description: 'Mobile App Development', rate: 150, quantity: 80 },
  { description: 'UI/UX Design', rate: 100, quantity: 20 },
  { description: 'SEO Optimization', rate: 85, quantity: 10 },
  { description: 'Content Writing', rate: 75, quantity: 15 },
  { description: 'Brand Identity Design', rate: 110, quantity: 30 },
  { description: 'Social Media Management', rate: 65, quantity: 20 },
  { description: 'Consulting Services', rate: 175, quantity: 10 },
  { description: 'Technical Support', rate: 95, quantity: 5 },
  { description: 'Project Management', rate: 120, quantity: 25 },
];

const statuses: Array<'draft' | 'sent' | 'paid' | 'overdue'> = [
  'draft',
  'sent',
  'paid',
  'overdue',
];

const paymentMethods = [
  'check',
  'direct_deposit',
  'paypal',
  'venmo',
  'wire_transfer',
  null,
];

function randomDate(year: number): string {
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day).toISOString().split('T')[0];
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateLineItems(numItems: number = 3) {
  const items = [];
  for (let i = 0; i < numItems; i++) {
    const service = randomElement(services);
    const quantity = Math.floor(Math.random() * service.quantity) + 1;
    items.push({
      id: `item-${i}`,
      description: service.description,
      quantity,
      rate: service.rate,
      amount: quantity * service.rate,
    });
  }
  return items;
}

async function seedInvoices(userId: string) {
  const invoices = [];
  let invoiceCounter = 1;

  // Generate invoices across multiple years
  const years = [2022, 2023, 2024, 2025];

  for (const year of years) {
    // More invoices for recent years
    const numInvoices =
      year === 2025 ? 20 : year === 2024 ? 18 : year === 2023 ? 15 : 12;

    for (let i = 0; i < numInvoices; i++) {
      const client = randomElement(clients);
      const status = randomElement(statuses);
      const date = randomDate(year);
      const lineItems = generateLineItems(Math.floor(Math.random() * 3) + 1);
      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const total = subtotal;

      const invoice = {
        user_id: userId,
        invoice_name: `Invoice for ${client.name}`,
        invoice_number: `SEED-${String(invoiceCounter).padStart(4, '0')}`,
        date,
        terms: 'Net 30',
        status,
        from_name: 'Your Business Name',
        from_email: 'your@business.com',
        from_address: '123 Business St, Suite 100',
        from_phone: '(555) 123-4567',
        bill_to_name: client.name,
        bill_to_email: client.email,
        bill_to_address: `${Math.floor(Math.random() * 9999)} Main Street`,
        line_items: lineItems,
        subtotal,
        total,
        balance_due: status === 'paid' ? 0 : total,
        payment_method:
          status === 'paid'
            ? randomElement(paymentMethods.filter((m) => m !== null))
            : null,
        payment_date: status === 'paid' ? randomDate(year) : null,
        notes: i % 3 === 0 ? 'Thank you for your business!' : null,
      };

      invoices.push(invoice);
      invoiceCounter++;
    }
  }

  // Insert invoices in batches
  console.log(`Inserting ${invoices.length} invoices...`);

  const { data, error } = await supabase
    .from('invoices')
    .insert(invoices)
    .select();

  if (error) {
    console.error('Error inserting invoices:', error);
    throw error;
  }

  console.log(`✓ Successfully created ${data?.length || 0} invoices`);
  console.log(`  - 2022: 12 invoices`);
  console.log(`  - 2023: 15 invoices`);
  console.log(`  - 2024: 18 invoices`);
  console.log(`  - 2025: 20 invoices`);
  console.log(`  Total: ${invoices.length} invoices`);
}

async function main() {
  console.log('🌱 Seeding invoice data...\n');

  // Get the user ID from command line argument
  const userId = process.argv[2];

  if (!userId) {
    console.error('❌ Please provide a user ID as an argument');
    console.log('Usage: npm run seed-invoices <user-id>');
    process.exit(1);
  }

  console.log(`User ID: ${userId}\n`);

  await seedInvoices(userId);

  console.log('\n✅ Seeding complete!');
}

main().catch(console.error);
