import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  Link,
} from '@remix-run/react';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { FieldLabel } from '~/components/ui/field-label';
import { Select } from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { requireAuth } from '~/lib/auth.server';
import { formatCurrency } from '~/lib/utils';
import { useState, useRef } from 'react';
import { FormSaveBar } from '~/components/ui/form-save-bar';
import { useFormDirtyState } from '~/hooks/useFormDirtyState';
import { useNavigationBlocker } from '~/hooks/useNavigationBlocker';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `Edit Invoice ${data?.invoice.invoice_number || ''} - Figurely` },
    { name: 'description', content: 'Edit invoice' },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const { id } = params;

  if (!id) {
    throw new Response('Invoice ID required', { status: 400 });
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single();

  if (error || !invoice) {
    throw new Response('Invoice not found', { status: 404 });
  }

  // Get active clients for dropdown (lead, prospect, active, on_hold)
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', session.user.id)
    .in('status', ['lead', 'prospect', 'active', 'on_hold'])
    .order('name', { ascending: true });

  return json(
    {
      invoice,
      clients: clients || [],
      user: session.user,
    },
    { headers }
  );
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const { id } = params;
  const formData = await request.formData();

  if (!id) {
    throw new Response('Invoice ID required', { status: 400 });
  }

  // Parse form data
  const terms = formData.get('terms') as string;
  const customTerms = formData.get('customTerms') as string;

  const invoiceData = {
    invoice_name: formData.get('invoiceName') as string,
    invoice_number: formData.get('invoiceNumber') as string,
    date: formData.get('date') as string,
    terms: terms === 'custom' && customTerms ? customTerms : terms,
    status: formData.get('status') as string,

    // From fields
    from_name: (formData.get('fromName') as string) || null,
    from_email: (formData.get('fromEmail') as string) || null,
    from_address: (formData.get('fromAddress') as string) || null,
    from_phone: (formData.get('fromPhone') as string) || null,
    from_business_number:
      (formData.get('fromBusinessNumber') as string) || null,
    from_website: (formData.get('fromWebsite') as string) || null,
    from_owner: (formData.get('fromOwner') as string) || null,

    // Bill To fields
    bill_to_name: (formData.get('billToName') as string) || null,
    bill_to_email: (formData.get('billToEmail') as string) || null,
    bill_to_address: (formData.get('billToAddress') as string) || null,
    bill_to_phone: (formData.get('billToPhone') as string) || null,
    bill_to_mobile: (formData.get('billToMobile') as string) || null,
    bill_to_fax: (formData.get('billToFax') as string) || null,

    // Line items (parsed from JSON)
    line_items: JSON.parse((formData.get('lineItems') as string) || '[]'),

    // Financial fields
    subtotal: parseFloat((formData.get('subtotal') as string) || '0'),
    total: parseFloat((formData.get('total') as string) || '0'),
    balance_due: parseFloat((formData.get('balanceDue') as string) || '0'),

    // Notes
    notes: (formData.get('notes') as string) || null,
  };

  const { error } = await supabase
    .from('invoices')
    .update(invoiceData)
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) {
    return json({ error: error.message }, { status: 400, headers });
  }

  return redirect(`/dashboard/invoices/${id}`, { headers });
}

export default function EditInvoice() {
  const { invoice, clients } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  // Initialize line items from the loaded invoice
  const initialLineItems =
    Array.isArray(invoice.line_items) && invoice.line_items.length > 0
      ? invoice.line_items
      : [{ name: '', description: '', rate: '', quantity: '1', amount: '' }];

  // Check if current terms is a custom value (not in predefined options)
  const predefinedTerms = [
    'none',
    'on_receipt',
    '1_day',
    '2_days',
    '3_days',
    '5_days',
    '7_days',
    '14_days',
    '30_days',
  ];
  const isCustomTerms =
    invoice.terms && !predefinedTerms.includes(invoice.terms);

  const [lineItems, setLineItems] = useState(initialLineItems);
  const [showCustomTerms, setShowCustomTerms] = useState(isCustomTerms);

  // Form state management - track lineItems as dependency for controlled state
  const formRef = useRef<HTMLFormElement>(null);
  const { isDirty, resetDirty } = useFormDirtyState(formRef, [lineItems]);
  const { blocker } = useNavigationBlocker(isDirty);

  // Save handler - trigger form submission
  const handleSave = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  // Discard handler - reset form and line items to initial state
  const handleDiscard = () => {
    if (formRef.current) {
      formRef.current.reset();
      setLineItems(initialLineItems);
      setShowCustomTerms(isCustomTerms);
      resetDirty();
    }
  };

  // State for Bill To fields (initialized from invoice)
  const [billToName, setBillToName] = useState(invoice.bill_to_name || '');
  const [billToEmail, setBillToEmail] = useState(invoice.bill_to_email || '');
  const [billToAddress, setBillToAddress] = useState(
    invoice.bill_to_address || ''
  );
  const [billToPhone, setBillToPhone] = useState(invoice.bill_to_phone || '');
  const [billToMobile, setBillToMobile] = useState(
    invoice.bill_to_mobile || ''
  );
  const [billToFax, setBillToFax] = useState(invoice.bill_to_fax || '');

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { name: '', description: '', rate: '', quantity: '1', amount: '' },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Calculate amount if rate or quantity changes
    if (field === 'rate' || field === 'quantity') {
      const rate = parseFloat(updated[index].rate || '0');
      const quantity = parseFloat(updated[index].quantity || '1');
      updated[index].amount = (rate * quantity).toFixed(2);
    }

    setLineItems(updated);
  };

  const selectClient = (clientId: string) => {
    if (!clientId) {
      // Clear selection
      setBillToName('');
      setBillToEmail('');
      setBillToAddress('');
      setBillToPhone('');
      setBillToMobile('');
      setBillToFax('');
      return;
    }

    const client = clients.find((c: any) => c.id === clientId);
    if (client) {
      setBillToName(client.name || '');
      setBillToEmail(client.email || '');
      setBillToPhone(client.phone || '');
      setBillToMobile(client.mobile || '');
      setBillToFax(client.fax || '');

      // Format address from multiple fields
      const addressParts = [
        client.address,
        client.city,
        client.state,
        client.postal_code,
      ].filter(Boolean);
      setBillToAddress(addressParts.join(', '));
    }
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + parseFloat(item.amount || '0');
  }, 0);
  const total = subtotal;
  const balanceDue = total;

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
        <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Link to={`/dashboard/invoices/${invoice.id}`}>
            <Button variant='ghost' size='icon'>
              <ArrowLeft className='h-4 w-4' />
            </Button>
          </Link>
          <div>
            <h1 className='text-3xl font-bold'>Edit Invoice</h1>
            <p className='text-muted-foreground'>Update your invoice details</p>
          </div>
        </div>
      </div>

      <Form method='post' ref={formRef}>
        {actionData?.error && (
          <div className='rounded-md bg-destructive/15 p-3 text-sm text-destructive mb-6'>
            {actionData.error}
          </div>
        )}

        <div className='grid gap-6 lg:grid-cols-3'>
          {/* Main Content - Left Column */}
          <div className='space-y-6 lg:col-span-2'>
            {/* From Section */}
        <Card>
          <CardHeader>
            <CardTitle>From</CardTitle>
            <CardDescription>Your business information</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <FieldLabel htmlFor='fromName' label='Name' required />
              <Input
                id='fromName'
                name='fromName'
                defaultValue={invoice.from_name || ''}
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel htmlFor='fromEmail' label='Email' required />
              <Input
                id='fromEmail'
                name='fromEmail'
                type='email'
                defaultValue={invoice.from_email || ''}
              />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <FieldLabel htmlFor='fromAddress' label='Address' required />
              <Input
                id='fromAddress'
                name='fromAddress'
                defaultValue={invoice.from_address || ''}
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel htmlFor='fromPhone' label='Phone' required />
              <Input
                id='fromPhone'
                name='fromPhone'
                defaultValue={invoice.from_phone || ''}
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel
                htmlFor='fromBusinessNumber'
                label='Business Number'
                required
              />
              <Input
                id='fromBusinessNumber'
                name='fromBusinessNumber'
                defaultValue={invoice.from_business_number || ''}
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel htmlFor='fromWebsite' label='Website' required />
              <Input
                id='fromWebsite'
                name='fromWebsite'
                defaultValue={invoice.from_website || ''}
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel htmlFor='fromOwner' label='Owner' required />
              <Input
                id='fromOwner'
                name='fromOwner'
                defaultValue={invoice.from_owner || ''}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bill To Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
            <CardDescription>Client information</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2'>
            {clients.length > 0 && (
              <div className='space-y-2 md:col-span-2'>
                <FieldLabel htmlFor='clientSelect' label='Select Client' />
                <Select
                  id='clientSelect'
                  onChange={(e) => selectClient(e.target.value)}
                  defaultValue=''>
                  <option value=''>Select a client...</option>
                  {clients.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                  <option value=''>─── Clear Selection ───</option>
                </Select>
              </div>
            )}
            <div className='space-y-2'>
              <FieldLabel htmlFor='billToName' label='Name' required />
              <Input
                id='billToName'
                name='billToName'
                value={billToName}
                onChange={(e) => setBillToName(e.target.value)}
                required
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel htmlFor='billToEmail' label='Email' required />
              <Input
                id='billToEmail'
                name='billToEmail'
                type='email'
                value={billToEmail}
                onChange={(e) => setBillToEmail(e.target.value)}
              />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <FieldLabel htmlFor='billToAddress' label='Address' required />
              <Input
                id='billToAddress'
                name='billToAddress'
                value={billToAddress}
                onChange={(e) => setBillToAddress(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel htmlFor='billToPhone' label='Phone' required />
              <Input
                id='billToPhone'
                name='billToPhone'
                value={billToPhone}
                onChange={(e) => setBillToPhone(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel htmlFor='billToMobile' label='Mobile' required />
              <Input
                id='billToMobile'
                name='billToMobile'
                value={billToMobile}
                onChange={(e) => setBillToMobile(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel htmlFor='billToFax' label='Fax' required />
              <Input
                id='billToFax'
                name='billToFax'
                value={billToFax}
                onChange={(e) => setBillToFax(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Line Items</CardTitle>
                <CardDescription>Add items or services</CardDescription>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={addLineItem}>
                <Plus className='mr-2 h-4 w-4' />
                Add Line Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {lineItems.map((item, index) => (
              <div
                key={index}
                className='rounded-lg border p-4 space-y-4'>
                {/* Top Row: Name and Delete */}
                <div className='flex items-start gap-4'>
                  <div className='flex-1 space-y-2'>
                    <Label className='font-semibold'>Name</Label>
                    <Input
                      value={item.name || ''}
                      onChange={(e) =>
                        updateLineItem(index, 'name', e.target.value)
                      }
                      placeholder='Item or service name'
                      className='text-base font-medium'
                    />
                  </div>
                  <div className='pt-7'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                      className='h-10 w-10'>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>

                {/* Description Row */}
                <div className='space-y-2'>
                  <Label className='text-sm'>Description (optional)</Label>
                  <Input
                    value={item.description || ''}
                    onChange={(e) =>
                      updateLineItem(index, 'description', e.target.value)
                    }
                    placeholder='Additional details about the item'
                    className='text-sm'
                  />
                </div>

                {/* Bottom Row: Rate, Quantity, Amount */}
                <div className='grid gap-4 sm:grid-cols-3'>
                  <div className='space-y-2'>
                    <Label>Rate</Label>
                    <Input
                      type='number'
                      step='0.01'
                      value={item.rate}
                      onChange={(e) =>
                        updateLineItem(index, 'rate', e.target.value)
                      }
                      placeholder='0.00'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Quantity</Label>
                    <Input
                      type='number'
                      step='0.01'
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(index, 'quantity', e.target.value)
                      }
                      placeholder='1'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Amount</Label>
                    <Input value={item.amount} readOnly className='bg-muted' />
                  </div>
                </div>
              </div>
            ))}

            {/* Hidden input for line items - key forces re-render when state changes */}
            <input
              key={JSON.stringify(lineItems)}
              type='hidden'
              name='lineItems'
              value={JSON.stringify(lineItems)}
            />
          </CardContent>
        </Card>
          </div>

          {/* Summary & Notes - Right Column */}
          <div className='space-y-6 lg:sticky lg:top-4 lg:self-start'>
            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <FieldLabel htmlFor='invoiceName' label='Invoice Name' required />
                  <Input
                    id='invoiceName'
                    name='invoiceName'
                    placeholder='e.g., Website Development - Client Name'
                    defaultValue={invoice.invoice_name}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <FieldLabel
                    htmlFor='invoiceNumber'
                    label='Invoice Number'
                    required
                  />
                  <Input
                    id='invoiceNumber'
                    name='invoiceNumber'
                    defaultValue={invoice.invoice_number}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <FieldLabel htmlFor='date' label='Date' required />
                  <Input
                    id='date'
                    name='date'
                    type='date'
                    defaultValue={invoice.date}
                    required
                    className='min-w-0'
                  />
                </div>
                <div className='space-y-2'>
                  <FieldLabel htmlFor='terms' label='Terms' required />
                  <Select
                    id='terms'
                    name='terms'
                    defaultValue={isCustomTerms ? 'custom' : invoice.terms}
                    required
                    onChange={(e) =>
                      setShowCustomTerms(e.target.value === 'custom')
                    }>
                    <option value='none'>No Terms</option>
                    <option value='on_receipt'>On Receipt</option>
                    <option value='1_day'>Next Day</option>
                    <option value='2_days'>2 Days</option>
                    <option value='3_days'>3 Days</option>
                    <option value='5_days'>5 Days</option>
                    <option value='7_days'>7 Days</option>
                    <option value='14_days'>14 Days</option>
                    <option value='30_days'>30 Days</option>
                    <option value='custom'>Custom</option>
                  </Select>
                  {showCustomTerms && (
                    <div className='mt-2'>
                      <Input
                        id='customTerms'
                        name='customTerms'
                        placeholder='Enter custom payment terms (e.g., Net 45, Due upon completion, etc.)'
                        defaultValue={isCustomTerms ? invoice.terms : ''}
                        required={showCustomTerms}
                      />
                    </div>
                  )}
                </div>
                <div className='space-y-2'>
                  <FieldLabel htmlFor='status' label='Status' required />
                  <Select
                    id='status'
                    name='status'
                    defaultValue={invoice.status}
                    required>
                    <option value='draft'>Draft</option>
                    <option value='sent'>Sent</option>
                    <option value='paid'>Paid</option>
                    <option value='overdue'>Overdue</option>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Subtotal:</span>
              <span className='font-medium'>${formatCurrency(subtotal)}</span>
            </div>
            <div className='flex justify-between border-t pt-3 text-lg font-semibold'>
              <span>Total:</span>
              <span>${formatCurrency(total)}</span>
            </div>
            <div className='flex justify-between text-lg font-semibold text-primary'>
              <span>Balance Due:</span>
              <span>${formatCurrency(balanceDue)}</span>
            </div>

            {/* Hidden inputs for totals */}
            <input type='hidden' name='subtotal' value={subtotal} />
            <input type='hidden' name='total' value={total} />
            <input type='hidden' name='balanceDue' value={balanceDue} />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>
              Additional information or payment instructions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              name='notes'
              placeholder='Payment is requested via Direct Deposit (using the account information provided) or via Zelle to the provided email address. Thank you!'
              rows={4}
              defaultValue={invoice.notes || ''}
            />
          </CardContent>
        </Card>
          </div>
        </div>
      </Form>
      </div>
    </>
  );
}
