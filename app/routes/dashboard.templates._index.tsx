import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import {
  useLoaderData,
  Link,
  Form,
  useNavigation,
  useSearchParams,
} from '@remix-run/react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
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
  templateColumnMap,
} from '~/lib/sorting';
import {
  encodeViewState,
  decodeViewState,
  extractViewState,
} from '~/lib/views';
import { SortMenu } from '~/components/sort-menu';
import { SavedViewsMenu } from '~/components/saved-views-menu';

export const meta: MetaFunction = () => {
  return [
    { title: 'Line Item Templates - Figurely' },
    { name: 'description', content: 'Manage your line item templates' },
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
  const sortParams = parseSortParams(searchParams, 'created_at', 'desc');

  // Build base query
  let templatesQuery = supabase
    .from('line_item_templates')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id);

  // Apply sorting
  templatesQuery = applySupabaseSorting(
    templatesQuery,
    sortParams.sortBy || 'created_at',
    sortParams.sortOrder,
    templateColumnMap
  );

  // Apply search if provided
  if (query) {
    const searchQuery = buildSupabaseSearchQuery(query, [
      'name',
      'description',
    ]);
    templatesQuery = templatesQuery.or(searchQuery);
  }

  // Apply pagination
  templatesQuery = templatesQuery.range(from, to);

  const { data: templates, error, count } = await templatesQuery;

  if (error) {
    console.error('Error loading templates:', error);
  }

  // Fetch saved views for this table
  const { data: savedViews } = await supabase
    .from('saved_views')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('table_name', 'line_item_templates')
    .order('created_at', { ascending: false });

  return json(
    {
      templates: templates || [],
      totalCount: count || 0,
      currentPage: page,
      itemsPerPage: limit,
      sortParams,
      filterParams: { search: query || undefined },
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

  // Delete template
  if (intent === 'delete') {
    const id = formData.get('id') as string;

    const { error } = await supabase
      .from('line_item_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      return json({ error: error.message }, { status: 400, headers });
    }

    return json(
      { success: true, message: 'Template deleted successfully' },
      { headers }
    );
  }

  return json({ error: 'Invalid action' }, { status: 400, headers });
}

export default function Templates() {
  const {
    templates,
    totalCount,
    currentPage,
    itemsPerPage,
    sortParams,
    filterParams,
    savedViews,
  } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const [searchParams] = useSearchParams();

  // Sortable columns
  const sortableColumns = [
    { value: 'name', label: 'Name' },
    { value: 'description', label: 'Description' },
    { value: 'rate', label: 'Rate' },
    { value: 'quantity', label: 'Quantity' },
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
            <h1 className='text-3xl font-bold'>Line Item Templates</h1>
            <p className='text-muted-foreground'>
              Create reusable line items for faster invoicing
            </p>
          </div>
          <Link to='/dashboard/templates/new'>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              New Template
            </Button>
          </Link>
        </div>

        {/* Toolbar */}
        <div className='flex items-center gap-2'>
          <div className='flex-1'>
            <SearchInput
              placeholder='Search templates...'
              preserveParams={['limit', 'sort', 'order']}
            />
          </div>
          <SortMenu
            sortableColumns={sortableColumns}
            currentSortBy={sortParams.sortBy}
            currentSortOrder={sortParams.sortOrder}
            defaultSortBy='created_at'
            defaultSortOrder='desc'
          />
          <SavedViewsMenu
            views={decodedViews}
            currentViewState={currentViewState}
            tableName='line_item_templates'
          />
        </div>
      </div>

      {/* Template List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <p className='text-center text-muted-foreground'>
              {searchParams.get('q')
                ? 'No templates found matching your search.'
                : 'No line item templates yet. Create one to get started!'}
            </p>
            {!searchParams.get('q') && (
              <Link to='/dashboard/templates/new' className='mt-4'>
                <Button>
                  <Plus className='mr-2 h-4 w-4' />
                  Create Your First Template
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile View */}
          <div className='space-y-4 md:hidden'>
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className='text-base'>{template.name}</CardTitle>
                  <CardDescription className='text-sm'>
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <div className='grid grid-cols-2 gap-2 text-sm'>
                    <div>
                      <p className='text-xs text-muted-foreground'>Rate</p>
                      <p className='font-medium'>
                        ${formatCurrency(template.rate)}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground'>Quantity</p>
                      <p className='font-medium'>{template.quantity}</p>
                    </div>
                  </div>
                  <div className='flex gap-2 pt-2 border-t'>
                    <Link
                      to={`/dashboard/templates/${template.id}/edit`}
                      className='flex-1'>
                      <Button size='sm' variant='ghost' className='w-full'>
                        <Edit className='mr-1 h-3 w-3' />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      className='flex-1'
                      disabled={isSubmitting}
                      onClick={() => {
                        setTemplateToDelete(template);
                        setDeleteDialogOpen(true);
                      }}>
                      <Trash2 className='mr-1 h-3 w-3' />
                      Delete
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
                        Name
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Description
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Rate
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium text-muted-foreground'>
                        Qty
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium text-muted-foreground'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {templates.map((template) => (
                      <tr key={template.id} className='hover:bg-muted/50'>
                        <td className='px-6 py-4 text-sm font-medium'>
                          {template.name}
                        </td>
                        <td className='px-6 py-4 text-sm text-muted-foreground'>
                          {template.description}
                        </td>
                        <td className='px-6 py-4 text-sm'>
                          ${formatCurrency(template.rate)}
                        </td>
                        <td className='px-6 py-4 text-sm'>
                          {template.quantity}
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            <Link
                              to={`/dashboard/templates/${template.id}/edit`}>
                              <Button variant='ghost' size='icon' title='Edit'>
                                <Edit className='h-4 w-4' />
                              </Button>
                            </Link>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              title='Delete'
                              disabled={isSubmitting}
                              onClick={() => {
                                setTemplateToDelete(template);
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
              basePath='/dashboard/templates'
              preserveParams={['q', 'sort', 'order']}
            />
          )}
        </>
      )}

      {/* Hidden form for delete submission */}
      <Form method='post' ref={deleteFormRef} style={{ display: 'none' }}>
        <input type='hidden' name='intent' value='delete' />
        <input type='hidden' name='id' value={templateToDelete?.id || ''} />
      </Form>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          deleteFormRef.current?.requestSubmit();
          setDeleteDialogOpen(false);
        }}
        title='Delete Template'
        description={`Are you sure you want to delete the template "${templateToDelete?.name}"? This action cannot be undone.`}
        confirmText='Delete'
        cancelText='Cancel'
        variant='danger'
        isLoading={isSubmitting}
      />
    </div>
  );
}
