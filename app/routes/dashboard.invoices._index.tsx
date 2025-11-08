import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { Plus, Eye, Edit, Download } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { requireAuth } from '~/lib/auth.server';
import { formatCurrency } from '~/lib/utils';
import { Pagination } from '~/components/pagination';
import { SearchInput } from '~/components/search-input';
import { parsePaginationParams, getSupabaseRange } from '~/lib/pagination';
import { parseSearchParams, buildSupabaseSearchQuery } from '~/lib/search';
import { cn } from '~/lib/utils';

export const meta: MetaFunction = () => {
  return [
    { title: 'Invoices - Ledgerly' },
    { name: 'description', content: 'Manage your invoices' },
  ];
};

type InvoiceStatus = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  // Parse pagination params
  const { page, limit } = parsePaginationParams(searchParams);
  const { from, to } = getSupabaseRange(page, limit);

  // Parse search params
  const { query } = parseSearchParams(searchParams);

  // Parse status filter
  const status = (searchParams.get('status') || 'all') as InvoiceStatus;

  // Build base query
  let invoicesQuery = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  // Apply status filter
  if (status !== 'all') {
    invoicesQuery = invoicesQuery.eq('status', status);
  }

  // Apply search if provided
  if (query) {
    const searchQuery = buildSupabaseSearchQuery(query, [
      'invoice_number',
      'bill_to_name',
      'bill_to_email',
      'notes',
    ]);
    invoicesQuery = invoicesQuery.or(searchQuery);
  }

  // Apply pagination
  invoicesQuery = invoicesQuery.range(from, to);

  const { data: invoices, error, count } = await invoicesQuery;

  if (error) {
    throw new Error('Failed to load invoices');
  }

  // Get counts for each status (for badges)
  const [allCount, draftCount, sentCount, paidCount, overdueCount] =
    await Promise.all([
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'draft'),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'sent'),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'paid'),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'overdue'),
    ]);

  return json(
    {
      invoices: invoices || [],
      totalCount: count || 0,
      currentPage: page,
      itemsPerPage: limit,
      statusCounts: {
        all: allCount.count || 0,
        draft: draftCount.count || 0,
        sent: sentCount.count || 0,
        paid: paidCount.count || 0,
        overdue: overdueCount.count || 0,
      },
      currentStatus: status,
    },
    { headers }
  );
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

function formatPaymentMethod(method: string | null) {
  if (!method) return '—';

  const methodMap: Record<string, string> = {
    check: 'Check',
    cash: 'Cash',
    direct_deposit: 'Direct Deposit',
    paypal: 'PayPal',
    venmo: 'Venmo',
    zelle: 'Zelle',
    wire_transfer: 'Wire Transfer',
    other: 'Other',
  };

  return methodMap[method] || method;
}

export default function InvoicesIndex() {
  const {
    invoices,
    totalCount,
    currentPage,
    itemsPerPage,
    statusCounts,
    currentStatus,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilters: Array<{
    value: InvoiceStatus;
    label: string;
    count: number;
  }> = [
    { value: 'all', label: 'All', count: statusCounts.all },
    { value: 'draft', label: 'Draft', count: statusCounts.draft },
    { value: 'sent', label: 'Sent', count: statusCounts.sent },
    { value: 'paid', label: 'Paid', count: statusCounts.paid },
    { value: 'overdue', label: 'Overdue', count: statusCounts.overdue },
  ];

  const handleStatusFilter = (status: InvoiceStatus) => {
    const params = new URLSearchParams(searchParams);

    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }

    // Reset to page 1 when filtering
    params.delete('page');

    setSearchParams(params);
  };

  return (
    <div className='container mx-auto space-y-4 p-4 md:space-y-6 md:p-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4'>
        <div>
          <h1 className='text-xl font-bold md:text-3xl'>Invoices</h1>
          <p className='text-xs text-muted-foreground md:text-base'>
            Create and manage your invoices
          </p>
        </div>
        <Link to='/dashboard/invoices/new'>
          <Button>
            <Plus className='mr-2 h-4 w-4' />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <Card>
        <CardContent className='p-4 md:p-6'>
          <div className='flex flex-wrap gap-2'>
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={currentStatus === filter.value ? 'default' : 'outline'}
                size='sm'
                onClick={() => handleStatusFilter(filter.value)}
                className='relative'>
                {filter.label}
                {filter.count > 0 && (
                  <span
                    className={cn(
                      'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold',
                      currentStatus === filter.value
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}>
                    {filter.count}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className='p-4 md:pt-6'>
          <SearchInput
            placeholder='Search invoices by number, client, email...'
            preserveParams={['limit', 'status']}
          />
        </CardContent>
      </Card>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <div className='flex h-20 w-20 items-center justify-center rounded-full bg-muted'>
              <Plus className='h-10 w-10 text-muted-foreground' />
            </div>
            <h3 className='mt-4 text-lg font-semibold'>
              {searchParams.get('q') || currentStatus !== 'all'
                ? 'No invoices found'
                : 'No invoices yet'}
            </h3>
            <p className='mt-2 text-center text-sm text-muted-foreground'>
              {searchParams.get('q') || currentStatus !== 'all'
                ? 'Try adjusting your filters or search'
                : 'Get started by creating your first invoice'}
            </p>
            {!searchParams.get('q') && currentStatus === 'all' && (
              <Link to='/dashboard/invoices/new'>
                <Button className='mt-4'>
                  <Plus className='mr-2 h-4 w-4' />
                  Create Invoice
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className='flex flex-col gap-3 md:hidden'>
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                to={`/dashboard/invoices/${invoice.id}`}
                className='block'>
                <Card className='transition-shadow hover:shadow-md'>
                  <CardContent className='p-4'>
                    <div className='mb-3 flex items-start justify-between'>
                      <div>
                        <p className='text-base font-semibold text-primary'>
                          {invoice.invoice_number}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {invoice.bill_to_name || 'No client'}
                        </p>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      <div>
                        <p className='text-xs text-muted-foreground'>Amount</p>
                        <p className='text-base font-bold'>
                          ${formatCurrency(invoice.total)}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-xs text-muted-foreground'>Date</p>
                        <p className='text-sm'>
                          {new Date(invoice.date).toLocaleDateString()}
                        </p>
                      </div>
                      {invoice.payment_method && (
                        <div className='col-span-2'>
                          <p className='text-xs text-muted-foreground'>
                            Payment
                          </p>
                          <p className='text-sm font-medium'>
                            {formatPaymentMethod(invoice.payment_method)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className='mt-3 flex items-center gap-2 border-t pt-3'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = `/dashboard/invoices/${invoice.id}`;
                        }}>
                        <Eye className='mr-1 h-4 w-4' />
                        View
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = `/dashboard/invoices/${invoice.id}/edit`;
                        }}>
                        <Edit className='mr-1 h-4 w-4' />
                        Edit
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(
                            `/dashboard/invoices/${invoice.id}/pdf`,
                            '_blank'
                          );
                        }}>
                        <Download className='mr-1 h-4 w-4' />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className='hidden md:block'>
            <CardContent className='p-0 md:p-0'>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='border-b bg-muted/50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Invoice #
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Client
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Date
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Amount
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Status
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Payment
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className='transition-colors hover:bg-muted/50'>
                        <td className='px-6 py-4'>
                          <Link
                            to={`/dashboard/invoices/${invoice.id}`}
                            className='font-medium text-primary hover:underline'>
                            {invoice.invoice_number}
                          </Link>
                        </td>
                        <td className='px-6 py-4 text-sm'>
                          {invoice.bill_to_name || '—'}
                        </td>
                        <td className='px-6 py-4 text-sm'>
                          {new Date(invoice.date).toLocaleDateString()}
                        </td>
                        <td className='px-6 py-4 text-sm font-medium'>
                          ${formatCurrency(invoice.total)}
                        </td>
                        <td className='px-6 py-4'>
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className='px-6 py-4 text-sm'>
                          {formatPaymentMethod(invoice.payment_method)}
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            <Link to={`/dashboard/invoices/${invoice.id}`}>
                              <Button variant='ghost' size='icon' title='View'>
                                <Eye className='h-4 w-4' />
                              </Button>
                            </Link>
                            <Link to={`/dashboard/invoices/${invoice.id}/edit`}>
                              <Button variant='ghost' size='icon' title='Edit'>
                                <Edit className='h-4 w-4' />
                              </Button>
                            </Link>
                            <Link
                              to={`/dashboard/invoices/${invoice.id}/pdf`}
                              target='_blank'
                              reloadDocument>
                              <Button
                                variant='ghost'
                                size='icon'
                                title='Download PDF'>
                                <Download className='h-4 w-4' />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalCount > itemsPerPage && (
            <Pagination
              totalItems={totalCount}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              basePath='/dashboard/invoices'
              preserveParams={['q', 'status']}
            />
          )}
        </>
      )}
    </div>
  );
}
