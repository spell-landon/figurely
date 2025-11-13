import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Save, Home, Calculator } from "lucide-react";
import { useRef } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { FieldLabel } from "~/components/ui/field-label";
import { FormSaveBar } from "~/components/ui/form-save-bar";
import { useFormDirtyState } from "~/hooks/useFormDirtyState";
import { useNavigationBlocker } from "~/hooks/useNavigationBlocker";
import { requireAuth } from "~/lib/auth.server";
import { formatCurrency } from "~/lib/utils";

export const meta: MetaFunction = () => {
  return [
    { title: "Household Settings - Ledgerly" },
    { name: "description", content: "Configure business use percentages for household expenses" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  // Get existing household settings
  const { data: settings, error } = await supabase
    .from("household_settings")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  return json({ settings: settings || null }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const formData = await request.formData();

  const settingsData = {
    user_id: session.user.id,
    rent_business_percentage: parseFloat(formData.get("rent_business_percentage") as string || "0"),
    utilities_business_percentage: parseFloat(formData.get("utilities_business_percentage") as string || "0"),
    internet_business_percentage: parseFloat(formData.get("internet_business_percentage") as string || "0"),
    monthly_rent: formData.get("monthly_rent") ? parseFloat(formData.get("monthly_rent") as string) : null,
    monthly_utilities: formData.get("monthly_utilities") ? parseFloat(formData.get("monthly_utilities") as string) : null,
    monthly_internet: formData.get("monthly_internet") ? parseFloat(formData.get("monthly_internet") as string) : null,
    total_home_square_feet: formData.get("total_home_square_feet") ? parseInt(formData.get("total_home_square_feet") as string) : null,
    office_square_feet: formData.get("office_square_feet") ? parseInt(formData.get("office_square_feet") as string) : null,
  };

  // Check if settings exist
  const { data: existing } = await supabase
    .from("household_settings")
    .select("id")
    .eq("user_id", session.user.id)
    .single();

  let error;
  if (existing) {
    // Update
    ({ error } = await supabase
      .from("household_settings")
      .update(settingsData)
      .eq("user_id", session.user.id));
  } else {
    // Insert
    ({ error } = await supabase
      .from("household_settings")
      .insert(settingsData));
  }

  if (error) {
    return json({ error: error.message }, { status: 400, headers });
  }

  return json({ success: true, message: "Household settings saved successfully" }, { headers });
}

export default function HouseholdSettings() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Calculate square footage percentage
  const squareFootagePercentage =
    settings?.total_home_square_feet && settings?.office_square_feet
      ? ((settings.office_square_feet / settings.total_home_square_feet) * 100).toFixed(1)
      : null;

  // Calculate estimated monthly deductions
  const estimatedRent = settings?.monthly_rent && settings?.rent_business_percentage
    ? (settings.monthly_rent * settings.rent_business_percentage / 100)
    : 0;
  const estimatedUtilities = settings?.monthly_utilities && settings?.utilities_business_percentage
    ? (settings.monthly_utilities * settings.utilities_business_percentage / 100)
    : 0;
  const estimatedInternet = settings?.monthly_internet && settings?.internet_business_percentage
    ? (settings.monthly_internet * settings.internet_business_percentage / 100)
    : 0;
  const totalEstimatedDeduction = estimatedRent + estimatedUtilities + estimatedInternet;

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
        {/* Success/Error Messages */}
        {actionData?.success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
          {actionData.message}
        </div>
      )}
      {actionData?.error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {actionData.error}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Household Settings</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Configure business use percentages for home office expenses
        </p>
      </div>

      <Form method="post" className="space-y-6" ref={formRef}>
        {/* Home Office Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              <CardTitle>Home Office Details</CardTitle>
            </div>
            <CardDescription>
              Calculate business use percentage based on square footage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="total_home_square_feet" label="Total Home Square Feet" />
                <Input
                  id="total_home_square_feet"
                  name="total_home_square_feet"
                  type="number"
                  min="0"
                  defaultValue={settings?.total_home_square_feet || ""}
                  placeholder="2000"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Total square footage of your entire home
                </p>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="office_square_feet" label="Office Square Feet" />
                <Input
                  id="office_square_feet"
                  name="office_square_feet"
                  type="number"
                  min="0"
                  defaultValue={settings?.office_square_feet || ""}
                  placeholder="200"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Square footage dedicated to your home office
                </p>
              </div>
            </div>

            {squareFootagePercentage && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium">Calculated Business Use:</p>
                <p className="text-2xl font-bold text-primary">{squareFootagePercentage}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on office space vs. total home size
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Use Percentages */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              <CardTitle>Business Use Percentages</CardTitle>
            </div>
            <CardDescription>
              Set the percentage of each expense used for business purposes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="rent_business_percentage" label="Rent/Mortgage %" />
                <div className="flex items-center gap-2">
                  <Input
                    id="rent_business_percentage"
                    name="rent_business_percentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    defaultValue={settings?.rent_business_percentage || 0}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Typically matches your office square footage percentage
                </p>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="utilities_business_percentage" label="Utilities %" />
                <div className="flex items-center gap-2">
                  <Input
                    id="utilities_business_percentage"
                    name="utilities_business_percentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    defaultValue={settings?.utilities_business_percentage || 0}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Percentage of electricity, gas, water used for business
                </p>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="internet_business_percentage" label="Internet %" />
                <div className="flex items-center gap-2">
                  <Input
                    id="internet_business_percentage"
                    name="internet_business_percentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    defaultValue={settings?.internet_business_percentage || 0}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Can often be 100% if primarily used for business
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Amounts (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Amounts (Optional)</CardTitle>
            <CardDescription>
              Enter typical monthly amounts to estimate deductions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <FieldLabel htmlFor="monthly_rent" label="Monthly Rent/Mortgage" />
                <Input
                  id="monthly_rent"
                  name="monthly_rent"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={settings?.monthly_rent || ""}
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="monthly_utilities" label="Monthly Utilities" />
                <Input
                  id="monthly_utilities"
                  name="monthly_utilities"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={settings?.monthly_utilities || ""}
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="monthly_internet" label="Monthly Internet" />
                <Input
                  id="monthly_internet"
                  name="monthly_internet"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={settings?.monthly_internet || ""}
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {totalEstimatedDeduction > 0 && (
              <div className="rounded-lg bg-primary/10 p-4 mt-4">
                <p className="text-sm font-medium">Estimated Monthly Deduction:</p>
                <p className="text-3xl font-bold text-primary">${formatCurrency(totalEstimatedDeduction)}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>Rent: ${formatCurrency(estimatedRent)}</p>
                  <p>Utilities: ${formatCurrency(estimatedUtilities)}</p>
                  <p>Internet: ${formatCurrency(estimatedInternet)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Annual estimate: ${formatCurrency(totalEstimatedDeduction * 12)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </Form>
      </div>
    </>
  );
}
