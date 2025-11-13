import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, Link } from "@remix-run/react";
import { Save, ArrowLeft } from "lucide-react";
import { useRef } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { FieldLabel } from "~/components/ui/field-label";
import { Textarea } from "~/components/ui/textarea";
import { FormSaveBar } from "~/components/ui/form-save-bar";
import { useFormDirtyState } from "~/hooks/useFormDirtyState";
import { useNavigationBlocker } from "~/hooks/useNavigationBlocker";
import { requireAuth } from "~/lib/auth.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `Edit Mileage - Ledgerly` },
    { name: "description", content: "Edit mileage record" },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const { id } = params;

  if (!id) {
    throw new Response("Mileage ID required", { status: 400 });
  }

  const { data: mileage, error } = await supabase
    .from("mileage")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !mileage) {
    throw new Response("Mileage record not found", { status: 404 });
  }

  return json({ mileage }, { headers });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const { id } = params;
  const formData = await request.formData();

  if (!id) {
    throw new Response("Mileage ID required", { status: 400 });
  }

  const mileageData = {
    date: formData.get("date") as string,
    purpose: formData.get("purpose") as string,
    miles: parseFloat(formData.get("miles") as string || "0"),
    rate_per_mile: parseFloat(formData.get("rate_per_mile") as string || "0.67"),
    notes: formData.get("notes") as string || null,
  };

  if (!mileageData.date || !mileageData.purpose || !mileageData.miles) {
    return json(
      { error: "Date, purpose, and miles are required" },
      { status: 400, headers }
    );
  }

  const { error } = await supabase
    .from("mileage")
    .update(mileageData)
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    return json({ error: error.message }, { status: 400, headers });
  }

  return redirect(`/dashboard/mileage`, { headers });
}

export default function EditMileage() {
  const { mileage } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

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
        <Link to="/dashboard/mileage">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Edit Mileage</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Update mileage record
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
            <CardTitle>Mileage Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="date" label="Date" required />
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={mileage.date}
                  required
                  disabled={isSubmitting}
                  className="min-w-0"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="miles" label="Miles Driven" required />
                <Input
                  id="miles"
                  name="miles"
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={mileage.miles}
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Total miles for this business trip
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel htmlFor="purpose" label="Business Purpose" required />
                <Input
                  id="purpose"
                  name="purpose"
                  defaultValue={mileage.purpose}
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Describe the business reason for this trip
                </p>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="rate_per_mile" label="Rate per Mile" />
                <Input
                  id="rate_per_mile"
                  name="rate_per_mile"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={mileage.rate_per_mile}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  IRS standard rate: $0.67/mile (2024)
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel htmlFor="notes" label="Notes" />
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={mileage.notes || ""}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </Form>
      </div>
    </>
  );
}
