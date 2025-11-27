import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { Plus, Eye, Edit, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { requireAuth } from '~/lib/auth.server';
import { Pagination } from '~/components/pagination';
import { SearchInput } from '~/components/search-input';
import {
  parsePaginationParams,
  getSupabaseRange,
  DEFAULT_PAGE_SIZE,
} from '~/lib/pagination';
import { parseSearchParams, buildSupabaseSearchQuery } from '~/lib/search';
import {
  parseSortParams,
  applySupabaseSorting,
  clientColumnMap,
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
    { title: 'Clients - Figurely' },
    { name: 'description', content: 'Manage your clients' },
  ];
};

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
    lead: { label: 'Lead', variant: 'secondary' },
    prospect: { label: 'Prospect', variant: 'outline' },
    active: { label: 'Active', variant: 'success' },
    on_hold: { label: 'On Hold', variant: 'secondary' },
    inactive: { label: 'Inactive', variant: 'destructive' },
    archived: { label: 'Archived', variant: 'outline' },
  };

  const config = statusConfig[status] || { label: 'Active', variant: 'default' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

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
  const sortParams = parseSortParams(searchParams, 'created_at', 'desc');

  // Parse filter params
  const filterParams = parseFilterParams(searchParams);

  // Build base query
  let clientsQuery = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id);

  // Apply sorting
  clientsQuery = applySupabaseSorting(
    clientsQuery,
    sortParams.sortBy || 'created_at',
    sortParams.sortOrder,
    clientColumnMap
  );

  // Apply filters (status only)
  clientsQuery = applySupabaseFilters(clientsQuery, filterParams, {
    statusColumn: 'status',
  });

  // Apply search if provided
  if (query) {
    const searchQuery = buildSupabaseSearchQuery(query, [
      'name',
      'email',
      'phone',
      'contact_person',
    ]);
    clientsQuery = clientsQuery.or(searchQuery);
  }

  // Apply pagination
  clientsQuery = clientsQuery.range(from, to);

  const { data: clients, error, count } = await clientsQuery;

  if (error) {
    throw new Error('Failed to load clients');
  }

  // Fetch saved views for this table
  const { data: savedViews } = await supabase
    .from('saved_views')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('table_name', 'clients')
    .order('created_at', { ascending: false });

  return json(
    {
      clients: clients || [],
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

export default function ClientsIndex() {
  const {
    clients,
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
    { value: 'lead', label: 'Lead' },
    { value: 'prospect', label: 'Prospect' },
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' },
  ];

  // Sortable columns
  const sortableColumns = [
    { value: 'name', label: 'Name' },
    { value: 'contact', label: 'Contact Person' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
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

  return (
    <div className='container mx-auto space-y-4 p-4 md:space-y-6 md:p-6'>
      {/* Header */}
      <div className='flex flex-col gap-4'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h1 className='text-xl font-bold md:text-3xl'>Clients</h1>
            <p className='text-xs text-muted-foreground md:text-base'>
              Manage your client information
            </p>
          </div>
          <Link to='/dashboard/clients/new'>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              New Client
            </Button>
          </Link>
        </div>

        {/* Toolbar */}
        <div className='flex items-center gap-2'>
          <div className='flex-1'>
            <SearchInput
              placeholder='Search clients...'
              preserveParams={['limit', 'status', 'sort', 'order']}
            />
          </div>
          <SortMenu
            sortableColumns={sortableColumns}
            currentSortBy={sortParams.sortBy}
            currentSortOrder={sortParams.sortOrder}
            defaultSortBy='created_at'
            defaultSortOrder='desc'
          />
          <FilterBar
            filters={filterParams}
            statusOptions={statusOptions}
            showDateRange={false}
            showSearch={false}
            searchPlaceholder='Search clients by name, email, phone...'
          />
          <SavedViewsMenu
            views={decodedViews}
            currentViewState={currentViewState}
            tableName='clients'
          />
        </div>
      </div>

      {/* Clients List */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <div className='flex h-20 w-20 items-center justify-center rounded-full bg-muted'>
              <Plus className='h-10 w-10 text-muted-foreground' />
            </div>
            <h3 className='mt-4 text-lg font-semibold'>
              {filterParams.search || filterParams.status
                ? 'No clients found'
                : 'No clients yet'}
            </h3>
            <p className='mt-2 text-center text-sm text-muted-foreground'>
              {filterParams.search || filterParams.status
                ? 'Try adjusting your filters or search'
                : 'Get started by adding your first client'}
            </p>
            {!filterParams.search && !filterParams.status && (
              <Link to='/dashboard/clients/new'>
                <Button className='mt-4'>
                  <Plus className='mr-2 h-4 w-4' />
                  Add Client
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className='flex flex-col gap-3 md:hidden'>
            {clients.map((client) => (
              <Link
                key={client.id}
                to={`/dashboard/clients/${client.id}`}
                className='block'>
                <Card className='transition-shadow hover:shadow-md'>
                  <CardContent className='p-4'>
                    <div className='mb-3 flex items-start justify-between'>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-base font-semibold text-primary'>
                          {client.name}
                        </p>
                        {client.contact_person && (
                          <p className='truncate text-xs text-muted-foreground'>
                            {client.contact_person}
                          </p>
                        )}
                      </div>
                      <div className='ml-2'>
                        {getStatusBadge(client.status)}
                      </div>
                    </div>
                    <div className='space-y-1.5'>
                      {client.email && (
                        <div className='flex items-center gap-2 text-xs'>
                          <Mail className='h-3 w-3 text-muted-foreground' />
                          <span className='truncate'>{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className='flex items-center gap-2 text-xs'>
                          <Phone className='h-3 w-3 text-muted-foreground' />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className='flex items-center gap-2 text-xs'>
                          <MapPin className='h-3 w-3 text-muted-foreground' />
                          <span className='truncate'>{client.address}</span>
                        </div>
                      )}
                    </div>
                    <div className='mt-3 flex items-center gap-2 border-t pt-3'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = `/dashboard/clients/${client.id}`;
                        }}>
                        <Eye className='mr-1 h-4 w-4' />
                        View
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = `/dashboard/clients/${client.id}/edit`;
                        }}>
                        <Edit className='mr-1 h-4 w-4' />
                        Edit
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
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Name
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Contact Person
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Email
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Phone
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Location
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Status
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium text-muted-foreground'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {clients.map((client) => (
                      <tr
                        key={client.id}
                        className='transition-colors hover:bg-muted/50'>
                        <td className='px-6 py-4'>
                          <Link
                            to={`/dashboard/clients/${client.id}`}
                            className='font-medium text-primary hover:underline'>
                            {client.name}
                          </Link>
                        </td>
                        <td className='px-6 py-4 text-sm'>
                          {client.contact_person || '—'}
                        </td>
                        <td className='px-6 py-4 text-sm'>
                          {client.email || '—'}
                        </td>
                        <td className='px-6 py-4 text-sm'>
                          {client.phone || '—'}
                        </td>
                        <td className='px-6 py-4 text-sm'>
                          {client.city && client.state
                            ? `${client.city}, ${client.state}`
                            : client.city || client.state || '—'}
                        </td>
                        <td className='px-6 py-4'>
                          {getStatusBadge(client.status)}
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            <Link to={`/dashboard/clients/${client.id}`}>
                              <Button variant='ghost' size='icon' title='View'>
                                <Eye className='h-4 w-4' />
                              </Button>
                            </Link>
                            <Link to={`/dashboard/clients/${client.id}/edit`}>
                              <Button variant='ghost' size='icon' title='Edit'>
                                <Edit className='h-4 w-4' />
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
              basePath='/dashboard/clients'
              preserveParams={['q', 'status', 'sort', 'order']}
            />
          )}
        </>
      )}
    </div>
  );
}
