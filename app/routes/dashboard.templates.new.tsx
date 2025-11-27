import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Form, useActionData, useNavigation, Link } from '@remix-run/react';
import { ArrowLeft } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { FieldLabel } from '~/components/ui/field-label';
import { Textarea } from '~/components/ui/textarea';
import { FormSaveBar } from '~/components/ui/form-save-bar';
import { useFormDirtyState } from '~/hooks/useFormDirtyState';
import { useNavigationBlocker } from '~/hooks/useNavigationBlocker';
import { requireAuth } from '~/lib/auth.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'New Line Item Template - Figurely' },
    { name: 'description', content: 'Create a new line item template' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, headers } = await requireAuth(request);
  return json({ user: session.user }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const formData = await request.formData();

  const templateData = {
    user_id: session.user.id,
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    rate: parseFloat(formData.get('rate') as string),
    quantity: parseFloat(formData.get('quantity') as string || '1'),
  };

  if (!templateData.name || !templateData.description || !templateData.rate) {
    return json(
      { error: 'Name, description, and rate are required' },
      { status: 400, headers }
    );
  }

  const { error } = await supabase
    .from('line_item_templates')
    .insert(templateData);

  if (error) {
    return json({ error: error.message }, { status: 400, headers });
  }

  return redirect('/dashboard/templates', { headers });
}

export default function NewTemplate() {
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

      <div className="container mx-auto space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">New Line Item Template</h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Create a reusable line item template
            </p>
          </div>
        </div>

        <Form method="post" className="space-y-6" ref={formRef}>
          {actionData?.error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {actionData.error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>
                Define the line item details that will be reused
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="name" label="Template Name" required />
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Consulting Services"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  A short name to identify this template
                </p>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="description" label="Description" required />
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detailed description of the service or item"
                  rows={3}
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  This will appear on the invoice
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor="rate" label="Rate" required />
                  <Input
                    id="rate"
                    name="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Price per unit
                  </p>
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="quantity" label="Default Quantity" />
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue="1"
                    placeholder="1"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default quantity when adding to invoice
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Form>
      </div>
    </>
  );
}
