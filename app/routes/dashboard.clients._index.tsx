import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { Plus, Eye, Edit, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
} from '~/components/ui/card';
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

export const meta: MetaFunction = () => {
  return [
    { title: 'Clients - Ledgerly' },
    { name: 'description', content: 'Manage your clients' },
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

  // Build base query
  let clientsQuery = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

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

  return json(
    {
      clients: clients || [],
      totalCount: count || 0,
      currentPage: page,
      itemsPerPage: limit,
    },
    { headers }
  );
}

export default function ClientsIndex() {
  const { clients, totalCount, currentPage, itemsPerPage } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  return (
    <div className='container mx-auto space-y-4 p-4 md:space-y-6 md:p-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4'>
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

      {/* Search */}
      <Card>
        <CardContent className='p-4 md:pt-6'>
          <SearchInput
            placeholder='Search clients by name, email, phone...'
            preserveParams={['limit']}
          />
        </CardContent>
      </Card>

      {/* Clients List */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <div className='flex h-20 w-20 items-center justify-center rounded-full bg-muted'>
              <Plus className='h-10 w-10 text-muted-foreground' />
            </div>
            <h3 className='mt-4 text-lg font-semibold'>
              {searchParams.get('q') ? 'No clients found' : 'No clients yet'}
            </h3>
            <p className='mt-2 text-center text-sm text-muted-foreground'>
              {searchParams.get('q')
                ? 'Try adjusting your search'
                : 'Get started by adding your first client'}
            </p>
            {!searchParams.get('q') && (
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
                      <Badge variant='default' className='ml-2'>
                        Active
                      </Badge>
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
            <CardContent className='p-0'>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='border-b bg-muted/50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Name
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Contact Person
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Email
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Phone
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Location
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Status
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium'>
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
                          <Badge variant='default'>Active</Badge>
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
              preserveParams={['q']}
            />
          )}
        </>
      )}
    </div>
  );
}
