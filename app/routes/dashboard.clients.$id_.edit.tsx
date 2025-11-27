import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@remix-run/react';
import { useRef } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select } from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { FormSaveBar } from '~/components/ui/form-save-bar';
import { useFormDirtyState } from '~/hooks/useFormDirtyState';
import { useNavigationBlocker } from '~/hooks/useNavigationBlocker';
import { requireAuth } from '~/lib/auth.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `Edit ${data?.client?.name || 'Client'} - Figurely` },
    { name: 'description', content: 'Edit client information' },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id!)
    .eq('user_id', session.user.id)
    .single();

  if (error || !client) {
    throw new Response('Client not found', { status: 404 });
  }

  return json({ client }, { headers });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session, supabase } = await requireAuth(request);

  const formData = await request.formData();

  const clientData = {
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
    status: formData.get('status') as string,
  };

  // Validation
  if (!clientData.name || clientData.name.trim() === '') {
    return json(
      { error: 'Client name is required', fields: clientData },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('clients')
    .update(clientData)
    .eq('id', params.id!)
    .eq('user_id', session.user.id);

  if (error) {
    return json(
      { error: 'Failed to update client', fields: clientData },
      { status: 500 }
    );
  }

  return redirect(`/dashboard/clients/${params.id}`);
}

export default function EditClient() {
  const { client } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  // Form state management
  const formRef = useRef<HTMLFormElement>(null);
  const { isDirty, resetDirty } = useFormDirtyState(formRef);
  const { blocker } = useNavigationBlocker(isDirty);

  // Save handler - trigger form submission
  const handleSave = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  // Discard handler - reset form to initial state
  const handleDiscard = () => {
    if (formRef.current) {
      formRef.current.reset();
      resetDirty();
    }
  };

  return (
    <>
      <FormSaveBar
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        onSave={handleSave}
        onDiscard={handleDiscard}
        blocker={blocker}
      />

      <div className='container mx-auto space-y-4 p-4 md:space-y-6 md:p-6'>
        {/* Header */}
        <div className='flex items-center gap-3 md:gap-4'>
        <Link to={`/dashboard/clients/${client.id}`}>
          <Button variant='ghost' size='icon'>
            <ArrowLeft className='h-5 w-5' />
          </Button>
        </Link>
        <div>
          <h1 className='text-xl font-bold md:text-3xl'>Edit Client</h1>
          <p className='text-xs text-muted-foreground md:text-base'>
            Update {client.name}'s information
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

      <Form method='post' ref={formRef}>
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
                    defaultValue={actionData?.fields?.name || client.name}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='contact_person'>Contact Person</Label>
                  <Input
                    id='contact_person'
                    name='contact_person'
                    placeholder='John Doe'
                    defaultValue={actionData?.fields?.contact_person || client.contact_person || ''}
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='status'>Client Status</Label>
                <Select
                  id='status'
                  name='status'
                  defaultValue={actionData?.fields?.status || client.status || 'active'}
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
                  defaultValue={actionData?.fields?.email || client.email || ''}
                />
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='tax_id'>Tax ID / Business Number</Label>
                  <Input
                    id='tax_id'
                    name='tax_id'
                    placeholder='123-45-6789'
                    defaultValue={actionData?.fields?.tax_id || client.tax_id || ''}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='website'>Website</Label>
                  <Input
                    id='website'
                    name='website'
                    type='url'
                    placeholder='https://acme.com'
                    defaultValue={actionData?.fields?.website || client.website || ''}
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
                    defaultValue={actionData?.fields?.phone || client.phone || ''}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='mobile'>Mobile</Label>
                  <Input
                    id='mobile'
                    name='mobile'
                    type='tel'
                    placeholder='(555) 987-6543'
                    defaultValue={actionData?.fields?.mobile || client.mobile || ''}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='fax'>Fax</Label>
                  <Input
                    id='fax'
                    name='fax'
                    type='tel'
                    placeholder='(555) 111-2222'
                    defaultValue={actionData?.fields?.fax || client.fax || ''}
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
                  defaultValue={actionData?.fields?.address || client.address || ''}
                />
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='city'>City</Label>
                  <Input
                    id='city'
                    name='city'
                    placeholder='New York'
                    defaultValue={actionData?.fields?.city || client.city || ''}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='state'>State / Province</Label>
                  <Input
                    id='state'
                    name='state'
                    placeholder='NY'
                    defaultValue={actionData?.fields?.state || client.state || ''}
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
                    defaultValue={actionData?.fields?.postal_code || client.postal_code || ''}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='country'>Country</Label>
                  <Input
                    id='country'
                    name='country'
                    placeholder='United States'
                    defaultValue={actionData?.fields?.country || client.country || ''}
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
                  defaultValue={actionData?.fields?.notes || client.notes || ''}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </Form>
      </div>
    </>
  );
}
