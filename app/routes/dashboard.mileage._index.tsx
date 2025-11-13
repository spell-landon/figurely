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
  Form,
  useNavigation,
} from '@remix-run/react';
import { Plus, Search, Trash2, Edit, Car } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { requireAuth } from '~/lib/auth.server';
import { formatCurrency } from '~/lib/utils';

export const meta: MetaFunction = () => {
  return [
    { title: 'Mileage Tracking - Ledgerly' },
    { name: 'description', content: 'Track business miles for tax deductions' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  const { data: mileage, error } = await supabase
    .from('mileage')
    .select('*')
    .eq('user_id', session.user.id)
    .order('date', { ascending: false });

  if (error) {
    throw new Error('Failed to load mileage records');
  }

  return json({ mileage: mileage || [] }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent');
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
  const { mileage } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isDeleting = navigation.state === 'submitting';

  // Calculate totals
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
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
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

      {/* Stats */}
      <div className='grid gap-4 grid-cols-3'>
        <Card>
          <CardContent className='p-4 md:p-6 md:pt-6'>
            <div className='flex items-center gap-2 mb-2'>
              <Car className='h-4 w-4 text-muted-foreground' />
              <div className='text-sm font-medium text-muted-foreground'>
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
            <div className='text-sm font-medium text-muted-foreground mb-2'>
              Total Deduction
            </div>
            <div className='text-2xl font-bold md:text-3xl'>
              ${formatCurrency(totalDeduction)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4 md:p-6 md:pt-6'>
            <div className='text-sm font-medium text-muted-foreground mb-2'>
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
              No mileage records yet
            </h3>
            <p className='mt-2 text-center text-sm text-muted-foreground'>
              Start tracking your business miles for tax deductions
            </p>
            <Link to='/dashboard/mileage/new'>
              <Button className='mt-4'>
                <Plus className='mr-2 h-4 w-4' />
                Add Mileage
              </Button>
            </Link>
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
                    <Form method='post'>
                      <input type='hidden' name='intent' value='delete' />
                      <input type='hidden' name='id' value={record.id} />
                      <Button
                        type='submit'
                        variant='ghost'
                        size='sm'
                        disabled={isDeleting}>
                        <Trash2 className='h-4 w-4 mr-1' />
                        {isDeleting ? '...' : 'Delete'}
                      </Button>
                    </Form>
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
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Date
                      </th>
                      <th className='px-6 py-3 text-left text-sm font-medium'>
                        Purpose
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium'>
                        Miles
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium'>
                        Rate
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium'>
                        Deduction
                      </th>
                      <th className='px-6 py-3 text-right text-sm font-medium'>
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
                            <Form method='post'>
                              <input
                                type='hidden'
                                name='intent'
                                value='delete'
                              />
                              <input
                                type='hidden'
                                name='id'
                                value={record.id}
                              />
                              <Button
                                type='submit'
                                variant='ghost'
                                size='icon'
                                title='Delete'
                                disabled={isDeleting}>
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </Form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
