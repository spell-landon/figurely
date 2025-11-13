import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Save, Building2, FileText, Mail } from "lucide-react";
import { useRef } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { FieldLabel } from "~/components/ui/field-label";
import { Textarea } from "~/components/ui/textarea";
import { FormSaveBar } from "~/components/ui/form-save-bar";
import { useFormDirtyState } from "~/hooks/useFormDirtyState";
import { useNavigationBlocker } from "~/hooks/useNavigationBlocker";
import { requireAuth } from "~/lib/auth.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Settings - Ledgerly" },
    { name: "description", content: "Manage your business settings" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  // Get business settings
  const { data: businessSettings } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  return json({
    businessSettings,
    user: session.user,
  }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const formData = await request.formData();

  const settingsData = {
    user_id: session.user.id,
    business_name: formData.get("businessName") as string || null,
    business_email: formData.get("businessEmail") as string || null,
    business_phone: formData.get("businessPhone") as string || null,
    business_address: formData.get("businessAddress") as string || null,
    business_website: formData.get("businessWebsite") as string || null,
    business_number: formData.get("businessNumber") as string || null,
    business_owner: formData.get("businessOwner") as string || null,
    default_invoice_note: formData.get("defaultInvoiceNote") as string || null,
    default_email_subject: formData.get("defaultEmailSubject") as string || null,
    default_email_message: formData.get("defaultEmailMessage") as string || null,
    email_signature: formData.get("emailSignature") as string || null,
  };

  // Check if settings already exist
  const { data: existing } = await supabase
    .from("business_settings")
    .select("id")
    .eq("user_id", session.user.id)
    .single();

  if (existing) {
    // Update existing settings
    const { error } = await supabase
      .from("business_settings")
      .update(settingsData)
      .eq("user_id", session.user.id);

    if (error) {
      return json({ error: error.message }, { status: 400, headers });
    }
  } else {
    // Insert new settings
    const { error } = await supabase
      .from("business_settings")
      .insert(settingsData);

    if (error) {
      return json({ error: error.message }, { status: 400, headers });
    }
  }

  return json({ success: true }, { headers });
}

export default function Settings() {
  const { businessSettings } = useLoaderData<typeof loader>();
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

      <div className="container mx-auto space-y-4 p-4 md:space-y-6 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your business information and preferences
          </p>
        </div>
      </div>

      <Form method="post" className="space-y-6" ref={formRef}>
        {/* Success Message */}
        {actionData?.success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
            Settings saved successfully!
          </div>
        )}

        {/* Error Message */}
        {actionData?.error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {actionData.error}
          </div>
        )}

        {/* Business Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Business Information</CardTitle>
            </div>
            <CardDescription>
              This information will be pre-filled when creating new invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="businessName" label="Business Name" required />
              <Input
                id="businessName"
                name="businessName"
                placeholder="Acme Inc."
                defaultValue={businessSettings?.business_name || ""}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="businessEmail" label="Business Email" required />
              <Input
                id="businessEmail"
                name="businessEmail"
                type="email"
                placeholder="contact@acme.com"
                defaultValue={businessSettings?.business_email || ""}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="businessPhone" label="Business Phone" required />
              <Input
                id="businessPhone"
                name="businessPhone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                defaultValue={businessSettings?.business_phone || ""}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="businessWebsite" label="Website" required />
              <Input
                id="businessWebsite"
                name="businessWebsite"
                type="url"
                placeholder="https://acme.com"
                defaultValue={businessSettings?.business_website || ""}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <FieldLabel htmlFor="businessAddress" label="Business Address" required />
              <Input
                id="businessAddress"
                name="businessAddress"
                placeholder="123 Main St, City, State 12345"
                defaultValue={businessSettings?.business_address || ""}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="businessNumber" label="Business Number" required />
              <Input
                id="businessNumber"
                name="businessNumber"
                placeholder="Tax ID / Registration Number"
                defaultValue={businessSettings?.business_number || ""}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="businessOwner" label="Owner Name" required />
              <Input
                id="businessOwner"
                name="businessOwner"
                placeholder="John Doe"
                defaultValue={businessSettings?.business_owner || ""}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Defaults */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Invoice Defaults</CardTitle>
            </div>
            <CardDescription>
              Default settings that will be applied to new invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="defaultInvoiceNote" label="Default Invoice Note" required />
              <Textarea
                id="defaultInvoiceNote"
                name="defaultInvoiceNote"
                placeholder="Payment is requested via Direct Deposit (using the account information provided) or via Zelle to the provided email address. Thank you!"
                rows={4}
                defaultValue={businessSettings?.default_invoice_note || ""}
              />
              <p className="text-xs text-muted-foreground">
                This note will appear at the bottom of your invoices by default
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Email Settings</CardTitle>
            </div>
            <CardDescription>
              Customize the email messages sent with your invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="defaultEmailSubject" label="Default Email Subject" required />
              <Input
                id="defaultEmailSubject"
                name="defaultEmailSubject"
                placeholder="Invoice {invoice_number}"
                defaultValue={businessSettings?.default_email_subject || ""}
              />
              <p className="text-xs text-muted-foreground">
                Use &#123;invoice_number&#125; as a placeholder for the invoice number
              </p>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="defaultEmailMessage" label="Default Email Message" required />
              <Textarea
                id="defaultEmailMessage"
                name="defaultEmailMessage"
                placeholder="Please find attached your invoice. If you have any questions, feel free to reach out."
                rows={4}
                defaultValue={businessSettings?.default_email_message || ""}
              />
              <p className="text-xs text-muted-foreground">
                This message will be included in the body of invoice emails
              </p>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="emailSignature" label="Email Signature" required />
              <Textarea
                id="emailSignature"
                name="emailSignature"
                placeholder="Best regards,&#10;Your Name&#10;Company Name"
                rows={3}
                defaultValue={businessSettings?.email_signature || ""}
              />
              <p className="text-xs text-muted-foreground">
                Optional signature to append to your invoice emails
              </p>
            </div>
          </CardContent>
        </Card>
      </Form>
      </div>
    </>
  );
}
