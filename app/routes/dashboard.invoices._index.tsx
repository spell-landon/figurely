import {
  json,
  redirect,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { Plus, Eye, Edit, Download } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { requireAuth } from '~/lib/auth.server';
import { formatCurrency, formatDate, cn } from '~/lib/utils';
import { Pagination } from '~/components/pagination';
import { parsePaginationParams, getSupabaseRange } from '~/lib/pagination';
import { parseSearchParams, buildSupabaseSearchQuery } from '~/lib/search';
import {
  parseSortParams,
  applySupabaseSorting,
  invoiceColumnMap,
} from '~/lib/sorting';
import { parseFilterParams, applySupabaseFilters } from '~/lib/filtering';
import {
  encodeViewState,
  decodeViewState,
  extractViewState,
} from '~/lib/views';
import { FilterBar } from '~/components/filter-bar';
import { SortMenu } from '~/components/sort-menu';
import { SavedViewsMenu } from '~/components/saved-views-menu';
import { SearchInput } from '~/components/search-input';

export const meta: MetaFunction = () => {
  return [
    { title: 'Invoices - Ledgerly' },
    { name: 'description', content: 'Manage your invoices' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  // Parse pagination params
  const { page, limit } = parsePaginationParams(searchParams);
  const { from, to } = getSupabaseRange(page, limit);

  // Parse search params
  const { query } = parseSearchParams(searchParams);

  // Parse sorting params
  const sortParams = parseSortParams(searchParams, 'date', 'desc');

  // Parse filter params
  const filterParams = parseFilterParams(searchParams);

  // Build base query
  let invoicesQuery = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id);

  // Apply sorting
  invoicesQuery = applySupabaseSorting(
    invoicesQuery,
    sortParams.sortBy || 'date',
    sortParams.sortOrder,
    invoiceColumnMap
  );

  // Apply status filter from filterParams
  invoicesQuery = applySupabaseFilters(invoicesQuery, filterParams, {
    statusColumn: 'status',
    dateColumn: 'date',
  });

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

  // Fetch saved views for this table
  const { data: savedViews } = await supabase
    .from('saved_views')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('table_name', 'invoices')
    .order('created_at', { ascending: false });

  return json(
    {
      invoices: invoices || [],
      totalCount: count || 0,
      currentPage: page,
      itemsPerPage: limit,
      sortParams,
      filterParams: { ...filterParams, search: query || undefined },
      savedViews: savedViews || [],
    },
    { headers }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'save_view') {
    const viewName = formData.get('view_name') as string;
    const tableName = formData.get('table_name') as string;
    const viewState = formData.get('view_state') as string;

    const { error } = await supabase.from('saved_views').insert({
      user_id: session.user.id,
      name: viewName,
      table_name: tableName,
      view_state: JSON.parse(viewState),
    });

    if (error) {
      throw new Error('Failed to save view');
    }

    return json({ success: true }, { headers });
  }

  if (intent === 'delete_view') {
    const viewId = formData.get('view_id') as string;

    const { error } = await supabase
      .from('saved_views')
      .delete()
      .eq('id', viewId)
      .eq('user_id', session.user.id);

    if (error) {
      throw new Error('Failed to delete view');
    }

    return json({ success: true }, { headers });
  }

  return json({ error: 'Invalid intent' }, { status: 400, headers });
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
    sortParams,
    filterParams,
    savedViews,
  } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  // Status filter options
  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
  ];

  // Sortable columns
  const sortableColumns = [
    { value: 'invoice_number', label: 'Invoice #' },
    { value: 'client', label: 'Client' },
    { value: 'date', label: 'Date' },
    { value: 'amount', label: 'Amount' },
    { value: 'status', label: 'Status' },
  ];

  // Decode saved views
  const decodedViews = savedViews.map((view: any) => ({
    ...view,
    view_state:
      typeof view.view_state === 'string'
        ? decodeViewState(view.view_state)
        : view.view_state,
  }));

  // Extract current view state for saving
  const currentViewState = extractViewState(sortParams, filterParams);

  // Group invoices by year and calculate totals
  const invoicesByYear = invoices.reduce((acc, invoice) => {
    const year = new Date(invoice.date).getFullYear();
    if (!acc[year]) {
      acc[year] = { invoices: [], total: 0 };
    }
    acc[year].invoices.push(invoice);
    acc[year].total += invoice.total;
    return acc;
  }, {} as Record<number, { invoices: any[]; total: number }>);

  // Sort years in descending order
  const sortedYears = Object.keys(invoicesByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className='container mx-auto space-y-4 p-4 md:space-y-6 md:p-6'>
      {/* Header */}
      <div className='flex flex-col gap-4'>
        <div className='flex items-start justify-between gap-4'>
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

        {/* Toolbar */}
        <div className='flex items-center gap-2'>
          <div className='flex-1'>
            <SearchInput
              placeholder='Search invoices...'
              preserveParams={[
                'limit',
                'status',
                'sort',
                'order',
                'date_from',
                'date_to',
                'date_preset',
              ]}
            />
          </div>
          <SortMenu
            sortableColumns={sortableColumns}
            currentSortBy={sortParams.sortBy}
            currentSortOrder={sortParams.sortOrder}
            defaultSortBy='date'
            defaultSortOrder='desc'
          />
          <FilterBar
            filters={filterParams}
            statusOptions={statusOptions}
            showDateRange={true}
            showSearch={false}
            searchPlaceholder='Search invoices by number, client, email...'
          />
          <SavedViewsMenu
            views={decodedViews}
            currentViewState={currentViewState}
            tableName='invoices'
          />
        </div>
      </div>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <div className='flex h-20 w-20 items-center justify-center rounded-full bg-muted'>
              <Plus className='h-10 w-10 text-muted-foreground' />
            </div>
            <h3 className='mt-4 text-lg font-semibold'>
              {filterParams.search ||
              filterParams.status ||
              filterParams.dateRange
                ? 'No invoices found'
                : 'No invoices yet'}
            </h3>
            <p className='mt-2 text-center text-sm text-muted-foreground'>
              {filterParams.search ||
              filterParams.status ||
              filterParams.dateRange
                ? 'Try adjusting your filters or search'
                : 'Get started by creating your first invoice'}
            </p>
            {!filterParams.search &&
              !filterParams.status &&
              !filterParams.dateRange && (
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
          <div className='flex flex-col gap-4 md:hidden'>
            {sortedYears.map((year) => (
              <div key={year} className='space-y-2'>
                {/* Year Group Header */}
                <div className='flex items-center justify-between px-1 pb-2'>
                  <h3 className='text-lg font-semibold'>{year}</h3>
                  <div className='text-right'>
                    <p className='text-xs text-muted-foreground'>
                      Invoice Total
                    </p>
                    <p className='text-sm font-semibold'>
                      ${formatCurrency(invoicesByYear[year].total)}
                    </p>
                  </div>
                </div>

                {/* Year's Invoices */}
                {invoicesByYear[year].invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/dashboard/invoices/${invoice.id}`}
                    className='block'>
                    <Card className='transition-shadow hover:shadow-md'>
                      <CardContent className='p-3'>
                        {/* Line 1: Client and Amount */}
                        <div className='flex items-center justify-between mb-2'>
                          <p className='text-sm font-medium truncate flex-1 mr-2'>
                            {invoice.bill_to_name || 'No client'}
                          </p>
                          <p className='text-base font-bold whitespace-nowrap'>
                            ${formatCurrency(invoice.total)}
                          </p>
                        </div>

                        {/* Line 2: Invoice #, Status, and Date */}
                        <div className='flex items-center justify-between'>
                          <p className='text-xs text-muted-foreground'>
                            {invoice.invoice_number}
                          </p>
                          <div className='flex items-center gap-2'>
                            {getStatusBadge(invoice.status)}
                            <p className='text-xs text-muted-foreground whitespace-nowrap'>
                              {formatDate(invoice.date)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className='hidden md:block'>
            <CardContent className='p-0 md:p-0'>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='border-b bg-muted/50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Invoice #
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Client
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Date
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Amount
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Status
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Payment
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium text-muted-foreground'>
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
                          {formatDate(invoice.date)}
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
              preserveParams={[
                'q',
                'status',
                'sort',
                'order',
                'date_from',
                'date_to',
                'date_preset',
              ]}
            />
          )}
        </>
      )}
    </div>
  );
}
