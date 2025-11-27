import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { Plus, Eye, Trash2, Download, Link2, RefreshCcw } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { requireAuth } from '~/lib/auth.server';
import { formatCurrency, formatCategory, formatDate } from '~/lib/utils';
import { Pagination } from '~/components/pagination';
import { SearchInput } from '~/components/search-input';
import { parsePaginationParams, getSupabaseRange } from '~/lib/pagination';
import { parseSearchParams, buildSupabaseSearchQuery } from '~/lib/search';
import {
  parseSortParams,
  applySupabaseSorting,
  expenseColumnMap,
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

export const meta: MetaFunction = () => {
  return [
    { title: 'Expenses - Ledgerly' },
    { name: 'description', content: 'Manage your expenses' },
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
  let expensesQuery = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id);

  // Apply sorting
  expensesQuery = applySupabaseSorting(
    expensesQuery,
    sortParams.sortBy || 'date',
    sortParams.sortOrder,
    expenseColumnMap
  );

  // Apply filters (category and date range)
  expensesQuery = applySupabaseFilters(expensesQuery, filterParams, {
    categoryColumn: 'category',
    dateColumn: 'date',
  });

  // Apply search if provided
  if (query) {
    const searchQuery = buildSupabaseSearchQuery(query, [
      'description',
      'merchant',
      'category',
    ]);
    expensesQuery = expensesQuery.or(searchQuery);
  }

  // Apply pagination
  expensesQuery = expensesQuery.range(from, to);

  const { data: expenses, error, count } = await expensesQuery;

  if (error) {
    throw new Error('Failed to load expenses');
  }

  // Fetch saved views for this table
  const { data: savedViews } = await supabase
    .from('saved_views')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('table_name', 'expenses')
    .order('created_at', { ascending: false });

  return json(
    {
      expenses: expenses || [],
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

function getCategoryBadge(category: string) {
  const colors: Record<string, string> = {
    travel: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    meals:
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    office:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    equipment:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    software: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };

  const color = colors[category?.toLowerCase()] || colors.other;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {formatCategory(category)}
    </span>
  );
}

export default function ExpensesIndex() {
  const {
    expenses,
    totalCount,
    currentPage,
    itemsPerPage,
    sortParams,
    filterParams,
    savedViews,
  } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  // Category filter options
  const categoryOptions = [
    { value: 'travel', label: 'Travel' },
    { value: 'meals', label: 'Meals' },
    { value: 'office', label: 'Office' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'software', label: 'Software' },
    { value: 'other', label: 'Other' },
  ];

  // Sortable columns
  const sortableColumns = [
    { value: 'date', label: 'Date' },
    { value: 'description', label: 'Description' },
    { value: 'merchant', label: 'Merchant' },
    { value: 'category', label: 'Category' },
    { value: 'amount', label: 'Amount' },
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

  return (
    <div className='container mx-auto space-y-4 p-4 md:space-y-6 md:p-6'>
      {/* Header */}
      <div className='flex flex-col gap-4'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-xl font-bold md:text-3xl'>Expenses</h1>
            <p className='text-xs text-muted-foreground md:text-base'>
              Track and manage your business expenses
            </p>
          </div>
          <Link to='/dashboard/expenses/new'>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              New Expense
            </Button>
          </Link>
        </div>

        {/* Toolbar */}
        <div className='flex items-center gap-2'>
          <div className='flex-1'>
            <SearchInput
              placeholder='Search expenses...'
              preserveParams={[
                'limit',
                'category',
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
            categoryOptions={categoryOptions}
            showDateRange={true}
            showSearch={false}
            searchPlaceholder='Search expenses by description, merchant, category...'
          />
          <SavedViewsMenu
            views={decodedViews}
            currentViewState={currentViewState}
            tableName='expenses'
          />
        </div>
      </div>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <div className='flex h-20 w-20 items-center justify-center rounded-full bg-muted'>
              <Plus className='h-10 w-10 text-muted-foreground' />
            </div>
            <h3 className='mt-4 text-lg font-semibold'>
              {filterParams.search ||
              filterParams.category ||
              filterParams.dateRange
                ? 'No expenses found'
                : 'No expenses yet'}
            </h3>
            <p className='mt-2 text-center text-sm text-muted-foreground'>
              {filterParams.search ||
              filterParams.category ||
              filterParams.dateRange
                ? 'Try adjusting your filters or search'
                : 'Get started by tracking your first expense'}
            </p>
            {!filterParams.search &&
              !filterParams.category &&
              !filterParams.dateRange && (
                <Link to='/dashboard/expenses/new'>
                  <Button className='mt-4'>
                    <Plus className='mr-2 h-4 w-4' />
                    Add Expense
                  </Button>
                </Link>
              )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className='flex flex-col gap-3 md:hidden'>
            {expenses.map((expense) => (
              <Link
                key={expense.id}
                to={`/dashboard/expenses/${expense.id}`}
                className='block'>
                <Card className='transition-shadow hover:shadow-md'>
                  <CardContent className='p-4'>
                    <div className='mb-3'>
                      <p className='text-base font-semibold text-primary'>
                        {expense.description}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {expense.merchant}
                      </p>
                    </div>
                    <div className='mb-3 flex items-center gap-2'>
                      {getCategoryBadge(expense.category)}
                      {(expense.is_return || expense.original_expense_id) && (
                        <span className='flex items-center gap-1 text-xs text-muted-foreground' title='Linked expense'>
                          <Link2 className='h-3 w-3' />
                          {expense.is_return && <RefreshCcw className='h-3 w-3' />}
                        </span>
                      )}
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                      <div>
                        <p className='text-xs text-muted-foreground'>Amount</p>
                        <p className='text-base font-bold'>
                          ${formatCurrency(expense.total)}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-xs text-muted-foreground'>Date</p>
                        <p className='text-sm'>
                          {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <div className='mt-3 flex items-center gap-2 border-t pt-3'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = `/dashboard/expenses/${expense.id}`;
                        }}>
                        <Eye className='mr-1 h-4 w-4' />
                        View
                      </Button>
                      {expense.receipt_url && (
                        <a
                          href={expense.receipt_url}
                          target='_blank'
                          rel='noopener noreferrer'>
                          <Button variant='ghost' size='sm'>
                            <Download className='mr-1 h-4 w-4' />
                            Receipt
                          </Button>
                        </a>
                      )}
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
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Date
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Description
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Merchant
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Category
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Amount
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium text-muted-foreground'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className='transition-colors hover:bg-muted/50'>
                        <td className='px-6 py-4 text-sm'>
                          {formatDate(expense.date)}
                        </td>
                        <td className='px-6 py-4'>
                          <Link
                            to={`/dashboard/expenses/${expense.id}`}
                            className='font-medium text-primary hover:underline'>
                            {expense.description}
                          </Link>
                        </td>
                        <td className='px-6 py-4 text-sm'>
                          {expense.merchant}
                        </td>
                        <td className='px-6 py-4'>
                          <div className='flex items-center gap-2'>
                            {getCategoryBadge(expense.category)}
                            {(expense.is_return || expense.original_expense_id) && (
                              <span className='flex items-center gap-1 text-muted-foreground' title='Linked expense'>
                                <Link2 className='h-3 w-3' />
                                {expense.is_return && <RefreshCcw className='h-3 w-3' />}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className='px-6 py-4 text-sm font-medium'>
                          ${formatCurrency(expense.total)}
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            <Link to={`/dashboard/expenses/${expense.id}`}>
                              <Button variant='ghost' size='icon' title='View'>
                                <Eye className='h-4 w-4' />
                              </Button>
                            </Link>
                            {expense.receipt_url && (
                              <a
                                href={expense.receipt_url}
                                target='_blank'
                                rel='noopener noreferrer'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  title='Download Receipt'>
                                  <Download className='h-4 w-4' />
                                </Button>
                              </a>
                            )}
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
              basePath='/dashboard/expenses'
              preserveParams={[
                'q',
                'category',
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
