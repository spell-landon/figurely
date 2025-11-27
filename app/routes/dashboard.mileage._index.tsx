import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import {
  Link,
  useLoaderData,
  useActionData,
  useSearchParams,
  Form,
  useNavigation,
} from '@remix-run/react';
import { Plus, Search, Trash2, Edit, Car } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { ConfirmDialog } from '~/components/ui/confirm-dialog';
import { requireAuth } from '~/lib/auth.server';
import { formatCurrency } from '~/lib/utils';
import { Pagination } from '~/components/pagination';
import { SearchInput } from '~/components/search-input';
import { parsePaginationParams, getSupabaseRange } from '~/lib/pagination';
import { parseSearchParams, buildSupabaseSearchQuery } from '~/lib/search';
import {
  parseSortParams,
  applySupabaseSorting,
  mileageColumnMap,
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
    { title: 'Mileage Tracking - Figurely' },
    { name: 'description', content: 'Track business miles for tax deductions' },
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
  let mileageQuery = supabase
    .from('mileage')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id);

  // Apply sorting
  mileageQuery = applySupabaseSorting(
    mileageQuery,
    sortParams.sortBy || 'date',
    sortParams.sortOrder,
    mileageColumnMap
  );

  // Apply filters (date range only)
  mileageQuery = applySupabaseFilters(mileageQuery, filterParams, {
    dateColumn: 'date',
  });

  // Apply search if provided
  if (query) {
    const searchQuery = buildSupabaseSearchQuery(query, ['purpose', 'notes']);
    mileageQuery = mileageQuery.or(searchQuery);
  }

  // Apply pagination
  mileageQuery = mileageQuery.range(from, to);

  const { data: mileage, error, count } = await mileageQuery;

  if (error) {
    throw new Error('Failed to load mileage records');
  }

  // Fetch saved views for this table
  const { data: savedViews } = await supabase
    .from('saved_views')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('table_name', 'mileage')
    .order('created_at', { ascending: false });

  return json(
    {
      mileage: mileage || [],
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

  const id = formData.get('id');
  if (intent === 'delete' && id) {
    const { error } = await supabase
      .from('mileage')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      return json({ error: error.message }, { status: 400, headers });
    }

    return json(
      { success: true, message: 'Mileage record deleted successfully' },
      { headers }
    );
  }

  return json({ error: 'Invalid action' }, { status: 400, headers });
}

export default function MileageIndex() {
  const {
    mileage,
    totalCount,
    currentPage,
    itemsPerPage,
    sortParams,
    filterParams,
    savedViews,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const isDeleting = navigation.state === 'submitting';
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  // Sortable columns
  const sortableColumns = [
    { value: 'date', label: 'Date' },
    { value: 'purpose', label: 'Purpose' },
    { value: 'miles', label: 'Miles' },
    { value: 'rate', label: 'Rate' },
    { value: 'deduction', label: 'Deduction' },
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

  // Calculate totals - Note: We're calculating from the current page only
  // To get all-time totals, we'd need a separate query
  const totalMiles = mileage.reduce(
    (sum, record) => sum + (record.miles || 0),
    0
  );
  const totalDeduction = mileage.reduce(
    (sum, record) => sum + (record.total || 0),
    0
  );

  // This month
  const now = new Date();
  const thisMonthMiles = mileage
    .filter((m) => {
      const mileageDate = new Date(m.date);
      return (
        mileageDate.getMonth() === now.getMonth() &&
        mileageDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, m) => sum + (m.miles || 0), 0);

  return (
    <div className='container mx-auto space-y-6 p-4 md:p-6'>
      {/* Success/Error Messages */}
      {actionData?.success && (
        <div className='rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300'>
          {actionData.message}
        </div>
      )}
      {actionData?.error && (
        <div className='rounded-md bg-destructive/15 p-3 text-sm text-destructive'>
          {actionData.error}
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col gap-4'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold md:text-3xl'>Mileage Tracking</h1>
            <p className='text-sm text-muted-foreground md:text-base'>
              Track business miles driven for tax deductions
            </p>
          </div>
          <Link to='/dashboard/mileage/new'>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              Add Mileage
            </Button>
          </Link>
        </div>

        {/* Toolbar */}
        <div className='flex items-center gap-2'>
          <div className='flex-1'>
            <SearchInput
              placeholder='Search mileage...'
              preserveParams={[
                'limit',
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
            showDateRange={true}
            showSearch={false}
            searchPlaceholder='Search mileage by purpose or notes...'
          />
          <SavedViewsMenu
            views={decodedViews}
            currentViewState={currentViewState}
            tableName='mileage'
          />
        </div>
      </div>

      {/* Stats */}
      <div className='grid gap-2 sm:gap-4 grid-cols-3'>
        <Card>
          <CardContent className='p-4 md:p-6 md:pt-6'>
            <div className='flex items-center gap-2 mb-2'>
              <Car className='h-4 w-4 text-muted-foreground' />
              <div className='text-xs sm:text-sm font-medium text-muted-foreground'>
                Total Miles
              </div>
            </div>
            <div className='text-2xl font-bold md:text-3xl'>
              {totalMiles.toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4 md:p-6 md:pt-6'>
            <div className='text-xs sm:text-sm font-medium text-muted-foreground mb-2'>
              Total Deduction
            </div>
            <div className='text-2xl font-bold md:text-3xl'>
              ${formatCurrency(totalDeduction)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4 md:p-6 md:pt-6'>
            <div className='text-xs sm:text-sm font-medium text-muted-foreground mb-2'>
              This Month
            </div>
            <div className='text-2xl font-bold md:text-3xl'>
              {thisMonthMiles.toFixed(1)} mi
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mileage List */}
      {mileage.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12 md:pt-6'>
            <div className='flex h-20 w-20 items-center justify-center rounded-full bg-muted'>
              <Car className='h-10 w-10 text-muted-foreground' />
            </div>
            <h3 className='mt-4 text-lg font-semibold'>
              {filterParams.search || filterParams.dateRange
                ? 'No mileage records found'
                : 'No mileage records yet'}
            </h3>
            <p className='mt-2 text-center text-sm text-muted-foreground'>
              {filterParams.search || filterParams.dateRange
                ? 'Try adjusting your filters or search'
                : 'Start tracking your business miles for tax deductions'}
            </p>
            {!filterParams.search && !filterParams.dateRange && (
              <Link to='/dashboard/mileage/new'>
                <Button className='mt-4'>
                  <Plus className='mr-2 h-4 w-4' />
                  Add Mileage
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className='flex flex-col gap-4 md:hidden'>
            {mileage.map((record) => (
              <Card key={record.id}>
                <CardContent className='p-4'>
                  <div className='flex items-start justify-between mb-3'>
                    <div className='flex-1'>
                      <p className='font-semibold text-lg'>{record.purpose}</p>
                      <p className='text-sm text-muted-foreground'>
                        {new Date(record.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='font-bold text-lg'>
                        {record.miles.toFixed(1)} mi
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        ${formatCurrency(record.total)}
                      </p>
                    </div>
                  </div>
                  {record.notes && (
                    <p className='text-sm text-muted-foreground mb-3'>
                      {record.notes}
                    </p>
                  )}
                  <div className='flex items-center gap-2 pt-3 border-t'>
                    <Link
                      to={`/dashboard/mileage/${record.id}`}
                      className='flex-1'>
                      <Button variant='ghost' size='sm' className='w-full'>
                        <Edit className='h-4 w-4 mr-1' />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      disabled={isDeleting}
                      onClick={() => {
                        setRecordToDelete(record);
                        setDeleteDialogOpen(true);
                      }}>
                      <Trash2 className='h-4 w-4 mr-1' />
                      {isDeleting ? '...' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                        Purpose
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium text-muted-foreground'>
                        Miles
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium text-muted-foreground'>
                        Rate
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium text-muted-foreground'>
                        Deduction
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium text-muted-foreground'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {mileage.map((record) => (
                      <tr
                        key={record.id}
                        className='hover:bg-muted/50 transition-colors'>
                        <td className='px-6 py-4 text-sm'>
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className='px-6 py-4'>
                          <div>
                            <p className='font-medium'>{record.purpose}</p>
                            {record.notes && (
                              <p className='text-sm text-muted-foreground'>
                                {record.notes}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className='px-6 py-4 text-right font-medium'>
                          {record.miles.toFixed(1)}
                        </td>
                        <td className='px-6 py-4 text-right text-sm text-muted-foreground'>
                          ${record.rate_per_mile.toFixed(2)}
                        </td>
                        <td className='px-6 py-4 text-right font-semibold'>
                          ${formatCurrency(record.total)}
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            <Link to={`/dashboard/mileage/${record.id}`}>
                              <Button variant='ghost' size='icon' title='Edit'>
                                <Edit className='h-4 w-4' />
                              </Button>
                            </Link>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              title='Delete'
                              disabled={isDeleting}
                              onClick={() => {
                                setRecordToDelete(record);
                                setDeleteDialogOpen(true);
                              }}>
                              <Trash2 className='h-4 w-4' />
                            </Button>
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
              basePath='/dashboard/mileage'
              preserveParams={[
                'q',
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

      {/* Hidden form for delete submission */}
      <Form method='post' ref={deleteFormRef} style={{ display: 'none' }}>
        <input type='hidden' name='intent' value='delete' />
        <input type='hidden' name='id' value={recordToDelete?.id || ''} />
      </Form>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          deleteFormRef.current?.requestSubmit();
          setDeleteDialogOpen(false);
        }}
        title='Delete Mileage Record'
        description={`Are you sure you want to delete the mileage record for "${recordToDelete?.purpose}"? This action cannot be undone.`}
        confirmText='Delete'
        cancelText='Cancel'
        variant='danger'
        isLoading={isDeleting}
      />
    </div>
  );
}
