import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, Link } from "@remix-run/react";
import { Plus, Trash2, Save, Layers } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { FieldLabel } from "~/components/ui/field-label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { requireAuth } from "~/lib/auth.server";
import { formatCurrency } from "~/lib/utils";
import { useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Invoice - Ledgerly" },
    { name: "description", content: "Create a new invoice" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  // Get last invoice number to auto-increment
  const { data: lastInvoice } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let nextInvoiceNumber = "INV0001";
  if (lastInvoice?.invoice_number) {
    const match = lastInvoice.invoice_number.match(/INV(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10) + 1;
      nextInvoiceNumber = `INV${num.toString().padStart(4, "0")}`;
    }
  }

  // Get business settings for default values
  const { data: businessSettings } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  // Get line item templates
  const { data: templates } = await supabase
    .from("line_item_templates")
    .select("*")
    .eq("user_id", session.user.id)
    .order("name", { ascending: true });

  return json({
    nextInvoiceNumber,
    businessSettings,
    templates: templates || [],
    user: session.user,
  }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const formData = await request.formData();

  // Parse form data
  const terms = formData.get("terms") as string;
  const customTerms = formData.get("customTerms") as string;

  const invoiceData = {
    user_id: session.user.id,
    invoice_name: formData.get("invoiceName") as string,
    invoice_number: formData.get("invoiceNumber") as string,
    date: formData.get("date") as string,
    terms: terms === "custom" && customTerms ? customTerms : terms,
    status: "draft",

    // From fields
    from_name: formData.get("fromName") as string || null,
    from_email: formData.get("fromEmail") as string || null,
    from_address: formData.get("fromAddress") as string || null,
    from_phone: formData.get("fromPhone") as string || null,
    from_business_number: formData.get("fromBusinessNumber") as string || null,
    from_website: formData.get("fromWebsite") as string || null,
    from_owner: formData.get("fromOwner") as string || null,

    // Bill To fields
    bill_to_name: formData.get("billToName") as string || null,
    bill_to_email: formData.get("billToEmail") as string || null,
    bill_to_address: formData.get("billToAddress") as string || null,
    bill_to_phone: formData.get("billToPhone") as string || null,
    bill_to_mobile: formData.get("billToMobile") as string || null,
    bill_to_fax: formData.get("billToFax") as string || null,

    // Line items (parsed from JSON)
    line_items: JSON.parse(formData.get("lineItems") as string || "[]"),

    // Financial fields
    subtotal: parseFloat(formData.get("subtotal") as string || "0"),
    total: parseFloat(formData.get("total") as string || "0"),
    balance_due: parseFloat(formData.get("balanceDue") as string || "0"),

    // Notes
    notes: formData.get("notes") as string || null,
  };

  const { data, error } = await supabase
    .from("invoices")
    .insert(invoiceData)
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, { status: 400, headers });
  }

  return redirect(`/dashboard/invoices/${data.id}`, { headers });
}

export default function NewInvoice() {
  const { nextInvoiceNumber, businessSettings, templates } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [lineItems, setLineItems] = useState([
    { description: "", rate: "", quantity: "1", amount: "" }
  ]);
  const [showCustomTerms, setShowCustomTerms] = useState(false);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", rate: "", quantity: "1", amount: "" }]);
  };

  const addLineItemFromTemplate = (templateId: string) => {
    const template = templates.find((t: any) => t.id === templateId);
    if (template) {
      const amount = (parseFloat(template.rate) * parseFloat(template.quantity)).toFixed(2);
      setLineItems([
        ...lineItems,
        {
          description: template.description,
          rate: template.rate.toString(),
          quantity: template.quantity.toString(),
          amount: amount,
        }
      ]);
    }
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Calculate amount if rate or quantity changes
    if (field === "rate" || field === "quantity") {
      const rate = parseFloat(updated[index].rate || "0");
      const quantity = parseFloat(updated[index].quantity || "1");
      updated[index].amount = (rate * quantity).toFixed(2);
    }

    setLineItems(updated);
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + parseFloat(item.amount || "0");
  }, 0);
  const total = subtotal;
  const balanceDue = total;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create New Invoice</h1>
          <p className="text-muted-foreground">
            Fill in the details to create your invoice
          </p>
        </div>
      </div>

      <Form method="post" className="space-y-6">
        {actionData?.error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {actionData.error}
          </div>
        )}

        {/* Invoice Name */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="invoiceName" label="Invoice Name" required />
              <Input
                id="invoiceName"
                name="invoiceName"
                placeholder="e.g., Website Development - Client Name"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* From Section */}
        <Card>
          <CardHeader>
            <CardTitle>From</CardTitle>
            <CardDescription>Your business information</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="fromName" label="Name" required />
              <Input
                id="fromName"
                name="fromName"
                defaultValue={businessSettings?.business_name || ""}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="fromEmail" label="Email" required />
              <Input
                id="fromEmail"
                name="fromEmail"
                type="email"
                defaultValue={businessSettings?.business_email || ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel htmlFor="fromAddress" label="Address" required />
              <Input
                id="fromAddress"
                name="fromAddress"
                defaultValue={businessSettings?.business_address || ""}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="fromPhone" label="Phone" required />
              <Input
                id="fromPhone"
                name="fromPhone"
                defaultValue={businessSettings?.business_phone || ""}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="fromBusinessNumber" label="Business Number" required />
              <Input
                id="fromBusinessNumber"
                name="fromBusinessNumber"
                defaultValue={businessSettings?.business_number || ""}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="fromWebsite" label="Website" required />
              <Input
                id="fromWebsite"
                name="fromWebsite"
                defaultValue={businessSettings?.business_website || ""}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="fromOwner" label="Owner" required />
              <Input
                id="fromOwner"
                name="fromOwner"
                defaultValue={businessSettings?.business_owner || ""}
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
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="billToName" label="Name" required />
              <Input
                id="billToName"
                name="billToName"
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="billToEmail" label="Email" required />
              <Input
                id="billToEmail"
                name="billToEmail"
                type="email"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel htmlFor="billToAddress" label="Address" required />
              <Input
                id="billToAddress"
                name="billToAddress"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="billToPhone" label="Phone" required />
              <Input
                id="billToPhone"
                name="billToPhone"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="billToMobile" label="Mobile" required />
              <Input
                id="billToMobile"
                name="billToMobile"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="billToFax" label="Fax" required />
              <Input
                id="billToFax"
                name="billToFax"
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Number, Date, Terms */}
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <FieldLabel htmlFor="invoiceNumber" label="Invoice Number" required />
              <Input
                id="invoiceNumber"
                name="invoiceNumber"
                defaultValue={nextInvoiceNumber}
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="date" label="Date" required />
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={today}
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="terms" label="Terms" required />
              <Select
                id="terms"
                name="terms"
                required
                onChange={(e) => setShowCustomTerms(e.target.value === "custom")}
              >
                <option value="none">No Terms</option>
                <option value="on_receipt">On Receipt</option>
                <option value="1_day">Next Day</option>
                <option value="2_days">2 Days</option>
                <option value="3_days">3 Days</option>
                <option value="5_days">5 Days</option>
                <option value="7_days">7 Days</option>
                <option value="14_days">14 Days</option>
                <option value="30_days">30 Days</option>
                <option value="custom">Custom</option>
              </Select>
              {showCustomTerms && (
                <div className="mt-2">
                  <Input
                    id="customTerms"
                    name="customTerms"
                    placeholder="Enter custom payment terms (e.g., Net 45, Due upon completion, etc.)"
                    required={showCustomTerms}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Line Items</CardTitle>
                <CardDescription>Add items or services</CardDescription>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                {templates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="template-select" className="text-sm whitespace-nowrap">
                      From template:
                    </Label>
                    <Select
                      id="template-select"
                      onChange={(e) => {
                        if (e.target.value) {
                          addLineItemFromTemplate(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="w-48"
                    >
                      <option value="">Select...</option>
                      {templates.map((template: any) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                {templates.length === 0 && (
                  <Link to="/dashboard/templates">
                    <Button type="button" variant="outline" size="sm">
                      <Layers className="mr-2 h-4 w-4" />
                      Create Template
                    </Button>
                  </Link>
                )}
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Blank
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={index} className="grid gap-4 rounded-lg border p-4 md:grid-cols-12">
                <div className="md:col-span-5 space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(index, "description", e.target.value)}
                    placeholder="Item or service description"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => updateLineItem(index, "rate", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Amount</Label>
                  <Input
                    value={item.amount}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Hidden input for line items */}
            <input
              type="hidden"
              name="lineItems"
              value={JSON.stringify(lineItems)}
            />
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">${formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-lg font-semibold">
              <span>Total:</span>
              <span>${formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-primary">
              <span>Balance Due:</span>
              <span>${formatCurrency(balanceDue)}</span>
            </div>

            {/* Hidden inputs for totals */}
            <input type="hidden" name="subtotal" value={subtotal} />
            <input type="hidden" name="total" value={total} />
            <input type="hidden" name="balanceDue" value={balanceDue} />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Additional information or payment instructions</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              name="notes"
              placeholder="Payment is requested via Direct Deposit (using the account information provided) or via Zelle to the provided email address. Thank you!"
              rows={4}
              defaultValue={businessSettings?.default_invoice_note || ""}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
