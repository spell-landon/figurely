import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Form, useActionData, useNavigation, Link } from "@remix-run/react";
import { Save, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { FieldLabel } from "~/components/ui/field-label";
import { Textarea } from "~/components/ui/textarea";
import { requireAuth } from "~/lib/auth.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Add Mileage - Ledgerly" },
    { name: "description", content: "Add new mileage record" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, headers } = await requireAuth(request);
  return json({ user: session.user }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const formData = await request.formData();

  const mileageData = {
    user_id: session.user.id,
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

  const { data, error } = await supabase
    .from("mileage")
    .insert(mileageData)
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, { status: 400, headers });
  }

  return redirect(`/dashboard/mileage`, { headers });
}

export default function NewMileage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const today = new Date().toISOString().split("T")[0];
  const IRS_STANDARD_RATE = 0.67; // 2024 IRS standard mileage rate

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Link to="/dashboard/mileage">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Add Mileage</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Track business miles driven
          </p>
        </div>
      </div>

      <Form method="post" className="space-y-6">
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
                  defaultValue={today}
                  required
                  disabled={isSubmitting}
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
                  placeholder="0.0"
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
                  placeholder="e.g., Client meeting, Site visit, Business errand"
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
                  defaultValue={IRS_STANDARD_RATE}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  IRS standard rate: ${IRS_STANDARD_RATE}/mile (2024)
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel htmlFor="notes" label="Notes" />
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Additional details about the trip..."
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Link to="/dashboard/mileage">
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Mileage"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
