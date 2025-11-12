import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@remix-run/react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select } from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { requireAuth } from '~/lib/auth.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'New Client - Ledgerly' },
    { name: 'description', content: 'Add a new client' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { headers } = await requireAuth(request);
  return json({}, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase } = await requireAuth(request);

  const formData = await request.formData();

  const clientData = {
    user_id: session.user.id,
    name: formData.get('name') as string,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    mobile: formData.get('mobile') as string || null,
    fax: formData.get('fax') as string || null,
    website: formData.get('website') as string || null,
    address: formData.get('address') as string || null,
    city: formData.get('city') as string || null,
    state: formData.get('state') as string || null,
    postal_code: formData.get('postal_code') as string || null,
    country: formData.get('country') as string || null,
    contact_person: formData.get('contact_person') as string || null,
    tax_id: formData.get('tax_id') as string || null,
    notes: formData.get('notes') as string || null,
    status: (formData.get('status') as string) || 'active',
    is_active: true,
  };

  // Validation
  if (!clientData.name || clientData.name.trim() === '') {
    return json(
      { error: 'Client name is required', fields: clientData },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(clientData)
    .select()
    .single();

  if (error) {
    return json(
      { error: 'Failed to create client', fields: clientData },
      { status: 500 }
    );
  }

  return redirect(`/dashboard/clients/${data.id}`);
}

export default function NewClient() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className='container mx-auto space-y-4 p-4 md:space-y-6 md:p-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Link to='/dashboard/clients'>
          <Button variant='ghost' size='icon'>
            <ArrowLeft className='h-5 w-5' />
          </Button>
        </Link>
        <div>
          <h1 className='text-xl font-bold md:text-3xl'>New Client</h1>
          <p className='text-xs text-muted-foreground md:text-base'>
            Add a new client to your system
          </p>
        </div>
      </div>

      {actionData?.error && (
        <Card className='border-destructive'>
          <CardContent className='p-4'>
            <p className='text-sm text-destructive'>{actionData.error}</p>
          </CardContent>
        </Card>
      )}

      <Form method='post'>
        <div className='grid gap-4 md:gap-6'>
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Client or company details</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>
                    Client Name <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='name'
                    name='name'
                    placeholder='Acme Corporation'
                    required
                    defaultValue={actionData?.fields?.name}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='contact_person'>Contact Person</Label>
                  <Input
                    id='contact_person'
                    name='contact_person'
                    placeholder='John Doe'
                    defaultValue={actionData?.fields?.contact_person || ''}
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='status'>Client Status</Label>
                <Select
                  id='status'
                  name='status'
                  defaultValue={actionData?.fields?.status || 'active'}
                >
                  <option value='lead'>Lead</option>
                  <option value='prospect'>Prospect</option>
                  <option value='active'>Active</option>
                  <option value='on_hold'>On Hold</option>
                  <option value='inactive'>Inactive</option>
                  <option value='archived'>Archived</option>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  placeholder='contact@acme.com'
                  defaultValue={actionData?.fields?.email || ''}
                />
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='tax_id'>Tax ID / Business Number</Label>
                  <Input
                    id='tax_id'
                    name='tax_id'
                    placeholder='123-45-6789'
                    defaultValue={actionData?.fields?.tax_id || ''}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='website'>Website</Label>
                  <Input
                    id='website'
                    name='website'
                    type='url'
                    placeholder='https://acme.com'
                    defaultValue={actionData?.fields?.website || ''}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Phone numbers and contact details</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-3'>
                <div className='space-y-2'>
                  <Label htmlFor='phone'>Phone</Label>
                  <Input
                    id='phone'
                    name='phone'
                    type='tel'
                    placeholder='(555) 123-4567'
                    defaultValue={actionData?.fields?.phone || ''}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='mobile'>Mobile</Label>
                  <Input
                    id='mobile'
                    name='mobile'
                    type='tel'
                    placeholder='(555) 987-6543'
                    defaultValue={actionData?.fields?.mobile || ''}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='fax'>Fax</Label>
                  <Input
                    id='fax'
                    name='fax'
                    type='tel'
                    placeholder='(555) 111-2222'
                    defaultValue={actionData?.fields?.fax || ''}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>Physical location details</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='address'>Street Address</Label>
                <Input
                  id='address'
                  name='address'
                  placeholder='123 Main Street'
                  defaultValue={actionData?.fields?.address || ''}
                />
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='city'>City</Label>
                  <Input
                    id='city'
                    name='city'
                    placeholder='New York'
                    defaultValue={actionData?.fields?.city || ''}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='state'>State / Province</Label>
                  <Input
                    id='state'
                    name='state'
                    placeholder='NY'
                    defaultValue={actionData?.fields?.state || ''}
                  />
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='postal_code'>Postal Code</Label>
                  <Input
                    id='postal_code'
                    name='postal_code'
                    placeholder='10001'
                    defaultValue={actionData?.fields?.postal_code || ''}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='country'>Country</Label>
                  <Input
                    id='country'
                    name='country'
                    placeholder='United States'
                    defaultValue={actionData?.fields?.country || ''}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>Any additional information about this client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                <Label htmlFor='notes'>Notes</Label>
                <Textarea
                  id='notes'
                  name='notes'
                  placeholder='Special requirements, preferences, etc.'
                  rows={4}
                  defaultValue={actionData?.fields?.notes || ''}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className='flex flex-col gap-3 md:flex-row md:justify-end'>
            <Link to='/dashboard/clients' className='md:order-1'>
              <Button type='button' variant='outline' className='w-full md:w-auto'>
                Cancel
              </Button>
            </Link>
            <Button type='submit' disabled={isSubmitting} className='w-full md:order-2 md:w-auto'>
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
