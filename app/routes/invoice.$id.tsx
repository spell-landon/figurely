import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { createSupabaseServiceClient } from '~/lib/supabase.server';
import { formatCurrency, formatDate } from '~/lib/utils';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `Invoice ${data?.invoice.invoice_number || ''} - Figurely` },
    { name: 'description', content: 'View invoice' },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const supabase = createSupabaseServiceClient();
  const { id } = params;

  if (!id) {
    throw new Response('Invoice ID required', { status: 400 });
  }

  // Fetch invoice data using service role (bypasses RLS for public access)
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !invoice) {
    throw new Response('Invoice not found', { status: 404 });
  }

  return json({ invoice });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge variant='success'>Paid</Badge>;
    case 'sent':
      return <Badge variant='default'>Sent</Badge>;
    case 'draft':
      return <Badge variant='secondary'>Draft</Badge>;
    case 'overdue':
      return <Badge variant='destructive'>Overdue</Badge>;
    default:
      return <Badge variant='outline'>{status}</Badge>;
  }
}

export default function PublicInvoice() {
  const { invoice } = useLoaderData<typeof loader>();
  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900'>
      <div className='container mx-auto space-y-6 p-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div>
              <div className='flex items-center gap-3'>
                <h1 className='text-3xl font-bold'>{invoice.invoice_number}</h1>
                {getStatusBadge(invoice.status)}
              </div>
              <p className='text-muted-foreground'>{invoice.invoice_name}</p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Link
              to={`/invoice/${invoice.id}/pdf`}
              target='_blank'
              reloadDocument>
              <Button variant='outline' size='sm'>
                <Download className='mr-2 h-4 w-4' />
                Download PDF
              </Button>
            </Link>
            <Link to='https://figurely.co' target='_blank'>
              <Button variant='ghost' size='sm'>
                <ExternalLink className='mr-2 h-4 w-4' />
                Powered by Figurely
              </Button>
            </Link>
          </div>
        </div>

        {/* Invoice Preview */}
        <Card className='mx-auto max-w-4xl bg-white dark:bg-slate-900'>
          <CardContent className='p-8 md:p-8'>
            {/* Invoice Header */}
            <div className='mb-8 flex items-start justify-between'>
              <div>
                <h2 className='text-2xl font-bold'>INVOICE</h2>
                <p className='text-sm text-muted-foreground'>
                  {invoice.invoice_number}
                </p>
              </div>
              <div className='text-right'>
                <p className='text-sm font-medium'>Date</p>
                <p className='text-sm text-muted-foreground'>
                  {formatDate(invoice.date)}
                </p>
                {invoice.terms && (
                  <>
                    <p className='mt-2 text-sm font-medium'>Payment Terms</p>
                    <p className='text-sm text-muted-foreground capitalize'>
                      {invoice.terms.replace(/_/g, ' ')}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* From and Bill To */}
            <div className='mb-8 grid gap-8 md:grid-cols-2'>
              {/* From */}
              <div>
                <h3 className='mb-2 text-sm font-semibold uppercase text-muted-foreground'>
                  From
                </h3>
                <div className='space-y-1'>
                  {invoice.from_name && (
                    <p className='font-medium'>{invoice.from_name}</p>
                  )}
                  {invoice.from_address && (
                    <p className='text-sm text-muted-foreground'>
                      {invoice.from_address}
                    </p>
                  )}
                  {invoice.from_email && (
                    <p className='text-sm text-muted-foreground'>
                      {invoice.from_email}
                    </p>
                  )}
                  {invoice.from_phone && (
                    <p className='text-sm text-muted-foreground'>
                      {invoice.from_phone}
                    </p>
                  )}
                  {invoice.from_business_number && (
                    <p className='text-sm text-muted-foreground'>
                      Business #: {invoice.from_business_number}
                    </p>
                  )}
                  {invoice.from_website && (
                    <p className='text-sm text-muted-foreground'>
                      {invoice.from_website}
                    </p>
                  )}
                  {invoice.from_owner && (
                    <p className='text-sm text-muted-foreground'>
                      Owner: {invoice.from_owner}
                    </p>
                  )}
                </div>
              </div>

              {/* Bill To */}
              <div>
                <h3 className='mb-2 text-sm font-semibold uppercase text-muted-foreground'>
                  Bill To
                </h3>
                <div className='space-y-1'>
                  {invoice.bill_to_name && (
                    <p className='font-medium'>{invoice.bill_to_name}</p>
                  )}
                  {invoice.bill_to_address && (
                    <p className='text-sm text-muted-foreground'>
                      {invoice.bill_to_address}
                    </p>
                  )}
                  {invoice.bill_to_email && (
                    <p className='text-sm text-muted-foreground'>
                      {invoice.bill_to_email}
                    </p>
                  )}
                  {invoice.bill_to_phone && (
                    <p className='text-sm text-muted-foreground'>
                      Phone: {invoice.bill_to_phone}
                    </p>
                  )}
                  {invoice.bill_to_mobile && (
                    <p className='text-sm text-muted-foreground'>
                      Mobile: {invoice.bill_to_mobile}
                    </p>
                  )}
                  {invoice.bill_to_fax && (
                    <p className='text-sm text-muted-foreground'>
                      Fax: {invoice.bill_to_fax}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className='mb-8'>
              <div className='overflow-hidden rounded-lg border'>
                <table className='w-full'>
                  <thead className='bg-muted/50'>
                    <tr>
                      <th className='px-4 py-3 text-left text-sm font-semibold'>
                        Description
                      </th>
                      <th className='px-4 py-3 text-right text-sm font-semibold'>
                        Rate
                      </th>
                      <th className='px-4 py-3 text-right text-sm font-semibold'>
                        Qty
                      </th>
                      <th className='px-4 py-3 text-right text-sm font-semibold'>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {lineItems.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className='px-4 py-3'>
                          <div className='space-y-1'>
                            <div className='text-base font-semibold'>
                              {item.name || item.description}
                            </div>
                            {item.name && item.description && (
                              <div className='text-sm text-muted-foreground'>
                                {item.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className='px-4 py-3 text-right text-sm'>
                          ${formatCurrency(parseFloat(item.rate || 0))}
                        </td>
                        <td className='px-4 py-3 text-right text-sm'>
                          {parseFloat(item.quantity || 0).toFixed(2)}
                        </td>
                        <td className='px-4 py-3 text-right text-sm font-medium'>
                          ${formatCurrency(parseFloat(item.amount || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className='mb-8 flex justify-end'>
              <div className='w-full max-w-xs space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>Subtotal:</span>
                  <span className='font-medium'>
                    ${formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                <div className='flex justify-between border-t pt-2 text-lg font-semibold'>
                  <span>Total:</span>
                  <span>${formatCurrency(invoice.total)}</span>
                </div>
                <div className='flex justify-between text-lg font-semibold text-primary'>
                  <span>Balance Due:</span>
                  <span>${formatCurrency(invoice.balance_due)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className='border-t pt-6'>
                <h3 className='mb-2 text-sm font-semibold uppercase text-muted-foreground'>
                  Notes
                </h3>
                <p className='whitespace-pre-wrap text-sm text-muted-foreground'>
                  {invoice.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className='text-center text-sm text-muted-foreground'>
          <p>This invoice was generated using Figurely</p>
        </div>
      </div>
    </div>
  );
}
