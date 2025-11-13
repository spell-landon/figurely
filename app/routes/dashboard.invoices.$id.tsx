import { json, type LoaderFunctionArgs, type MetaFunction, type ActionFunctionArgs, redirect } from "@remix-run/node";
import { Link, useLoaderData, Form, useNavigation, useActionData, useSubmit } from "@remix-run/react";
import { ArrowLeft, Edit, Mail, Printer, Share2, Trash2, CheckCircle, Download, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Select } from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { FieldLabel } from "~/components/ui/field-label";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { requireAuth } from "~/lib/auth.server";
import { formatCurrency } from "~/lib/utils";
import { useState, useRef } from "react";
import { sendInvoiceEmail } from "~/lib/email.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `Invoice ${data?.invoice.invoice_number || ""} - Ledgerly` },
    { name: "description", content: "View invoice details" },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const { id } = params;

  if (!id) {
    throw new Response("Invoice ID required", { status: 400 });
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !invoice) {
    throw new Response("Invoice not found", { status: 404 });
  }

  return json({ invoice, user: session.user }, { headers });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (!id) {
    throw new Response("Invoice ID required", { status: 400 });
  }

  // Update Status
  if (intent === "update_status") {
    const newStatus = formData.get("status") as string;

    if (!["draft", "sent", "paid", "overdue"].includes(newStatus)) {
      return json({ error: "Invalid status" }, { status: 400, headers });
    }

    const { error } = await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      return json({ error: error.message }, { status: 400, headers });
    }

    const statusLabels: Record<string, string> = {
      draft: "Draft",
      sent: "Sent",
      paid: "Paid",
      overdue: "Overdue"
    };

    return json({ success: true, message: `Invoice status updated to ${statusLabels[newStatus]}` }, { headers });
  }

  // Delete Invoice
  if (intent === "delete") {
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      return json({ error: error.message }, { status: 400, headers });
    }

    return redirect("/dashboard/invoices", { headers });
  }

  // Send Email
  if (intent === "send_email") {
    // First, get the invoice data
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (fetchError || !invoice) {
      return json({ error: "Invoice not found" }, { status: 404, headers });
    }

    if (!invoice.bill_to_email) {
      return json({ error: "No email address found for this client" }, { status: 400, headers });
    }

    try {
      // Generate the public invoice URL
      const invoiceUrl = `${new URL(request.url).origin}/invoice/${id}`;

      // Send the email
      await sendInvoiceEmail({
        to: invoice.bill_to_email,
        invoiceNumber: invoice.invoice_number,
        invoiceUrl,
        fromName: invoice.from_name || undefined,
        fromEmail: invoice.from_email || undefined,
      });

      // Update invoice status to "sent" if it was "draft"
      if (invoice.status === "draft") {
        await supabase
          .from("invoices")
          .update({ status: "sent" })
          .eq("id", id)
          .eq("user_id", session.user.id);
      }

      return json({ success: true, message: "Invoice sent successfully!" }, { headers });
    } catch (error) {
      console.error("Failed to send email:", error);
      return json(
        { error: "Failed to send email. Please check your email configuration." },
        { status: 500, headers }
      );
    }
  }

  // Update Payment Information
  if (intent === "update_payment") {
    const paymentMethod = formData.get("paymentMethod") as string | null;
    const paymentDate = formData.get("paymentDate") as string | null;
    const paymentReference = formData.get("paymentReference") as string | null;

    const { error } = await supabase
      .from("invoices")
      .update({
        payment_method: paymentMethod,
        payment_date: paymentDate,
        payment_reference: paymentReference,
        // Auto-update status to paid if payment method is added and status is not already paid
        ...(paymentMethod && paymentDate ? { status: "paid" } : {})
      })
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      return json({ error: error.message }, { status: 400, headers });
    }

    return json({ success: true, message: "Payment information updated successfully" }, { headers });
  }

  return json({ error: "Invalid action" }, { status: 400, headers });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge variant="success">Paid</Badge>;
    case "sent":
      return <Badge variant="default">Sent</Badge>;
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "overdue":
      return <Badge variant="destructive">Overdue</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function InvoiceDetail() {
  const { invoice } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isDeleting = navigation.state === "submitting" && navigation.formData?.get("intent") === "delete";
  const isUpdatingStatus = navigation.state === "submitting" && navigation.formData?.get("intent") === "update_status";
  const isSendingEmail = navigation.state === "submitting" && navigation.formData?.get("intent") === "send_email";
  const isUpdatingPayment = navigation.state === "submitting" && navigation.formData?.get("intent") === "update_payment";
  const [linkCopied, setLinkCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const emailFormRef = useRef<HTMLFormElement>(null);

  // Parse line items
  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];

  // Copy shareable link to clipboard
  const copyShareableLink = async () => {
    const url = `${window.location.origin}/invoice/${invoice.id}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="container mx-auto space-y-4 p-3 md:space-y-6 md:p-6">
      {/* Success/Error Messages */}
      {actionData?.success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
          {actionData.message || "Action completed successfully"}
        </div>
      )}
      {actionData?.error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {actionData.error}
        </div>
      )}

      {/* Header with Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold truncate">{invoice.invoice_number}</h1>
              {getStatusBadge(invoice.status)}
            </div>
            <p className="text-sm md:text-base text-muted-foreground truncate">
              {invoice.invoice_name}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/dashboard/invoices/${invoice.id}/edit`}>
            <Button size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>

          <Form method="post" ref={emailFormRef}>
            <input type="hidden" name="intent" value="send_email" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSendingEmail || !invoice.bill_to_email}
              onClick={() => setShowEmailDialog(true)}
            >
              <Mail className="mr-2 h-4 w-4" />
              {isSendingEmail ? "Sending..." : "Email"}
            </Button>
          </Form>

          <Link to={`/dashboard/invoices/${invoice.id}/pdf`} target="_blank" reloadDocument>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={copyShareableLink}>
            {linkCopied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </>
            )}
          </Button>

          <Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="update_status" />
            <Label htmlFor="status" className="text-sm font-medium whitespace-nowrap hidden sm:inline">
              Status:
            </Label>
            <Select
              id="status"
              name="status"
              defaultValue={invoice.status}
              disabled={isUpdatingStatus}
              onChange={(e) => {
                const formData = new FormData();
                formData.append("intent", "update_status");
                formData.append("status", e.currentTarget.value);
                submit(formData, { method: "post" });
              }}
              className="w-28 sm:w-32"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </Select>
          </Form>

          <Form method="post" ref={deleteFormRef}>
            <input type="hidden" name="intent" value="delete" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </Form>
        </div>
      </div>

      {/* Invoice Preview */}
      <Card className="mx-auto max-w-4xl">
        <CardContent className="p-8 md:pt-8">
          {/* Invoice Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">INVOICE</h2>
              <p className="text-sm text-muted-foreground">{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Date</p>
              <p className="text-sm text-muted-foreground">
                {new Date(invoice.date).toLocaleDateString()}
              </p>
              {invoice.terms && (
                <>
                  <p className="mt-2 text-sm font-medium">Payment Terms</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {invoice.terms.replace(/_/g, " ")}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* From and Bill To */}
          <div className="mb-8 grid gap-8 md:grid-cols-2">
            {/* From */}
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">From</h3>
              <div className="space-y-1">
                {invoice.from_name && <p className="font-medium">{invoice.from_name}</p>}
                {invoice.from_address && <p className="text-sm text-muted-foreground">{invoice.from_address}</p>}
                {invoice.from_email && <p className="text-sm text-muted-foreground">{invoice.from_email}</p>}
                {invoice.from_phone && <p className="text-sm text-muted-foreground">{invoice.from_phone}</p>}
                {invoice.from_business_number && (
                  <p className="text-sm text-muted-foreground">Business #: {invoice.from_business_number}</p>
                )}
                {invoice.from_website && <p className="text-sm text-muted-foreground">{invoice.from_website}</p>}
                {invoice.from_owner && <p className="text-sm text-muted-foreground">Owner: {invoice.from_owner}</p>}
              </div>
            </div>

            {/* Bill To */}
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Bill To</h3>
              <div className="space-y-1">
                {invoice.bill_to_name && (
                  <Link
                    to={`/dashboard/clients?q=${encodeURIComponent(invoice.bill_to_name)}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {invoice.bill_to_name}
                  </Link>
                )}
                {invoice.bill_to_address && <p className="text-sm text-muted-foreground">{invoice.bill_to_address}</p>}
                {invoice.bill_to_email && <p className="text-sm text-muted-foreground">{invoice.bill_to_email}</p>}
                {invoice.bill_to_phone && <p className="text-sm text-muted-foreground">Phone: {invoice.bill_to_phone}</p>}
                {invoice.bill_to_mobile && <p className="text-sm text-muted-foreground">Mobile: {invoice.bill_to_mobile}</p>}
                {invoice.bill_to_fax && <p className="text-sm text-muted-foreground">Fax: {invoice.bill_to_fax}</p>}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold md:px-4 md:py-3 md:text-sm">Description</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold whitespace-nowrap md:px-4 md:py-3 md:text-sm">Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold whitespace-nowrap md:px-4 md:py-3 md:text-sm">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold whitespace-nowrap md:px-4 md:py-3 md:text-sm">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lineItems.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-3 py-2 text-xs md:px-4 md:py-3 md:text-sm">{item.description}</td>
                      <td className="px-3 py-2 text-right text-xs whitespace-nowrap md:px-4 md:py-3 md:text-sm">
                        ${formatCurrency(parseFloat(item.rate || 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-xs whitespace-nowrap md:px-4 md:py-3 md:text-sm">
                        {parseFloat(item.quantity || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap md:px-4 md:py-3 md:text-sm">
                        ${formatCurrency(parseFloat(item.amount || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="mb-8 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">${formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-semibold">
                <span>Total:</span>
                <span>${formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-primary">
                <span>Balance Due:</span>
                <span>${formatCurrency(invoice.balance_due)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t pt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Information Section */}
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
          <CardDescription>
            Track when and how this invoice was paid
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post">
            <input type="hidden" name="intent" value="update_payment" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <FieldLabel htmlFor="paymentMethod" label="Payment Method" />
                <Select
                  id="paymentMethod"
                  name="paymentMethod"
                  defaultValue={invoice.payment_method || ""}
                  disabled={isUpdatingPayment}
                  className="w-full"
                >
                  <option value="">Not paid yet</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="direct_deposit">Direct Deposit</option>
                  <option value="paypal">PayPal</option>
                  <option value="venmo">Venmo</option>
                  <option value="zelle">Zelle</option>
                  <option value="wire_transfer">Wire Transfer</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="paymentDate" label="Payment Date" />
                <Input
                  id="paymentDate"
                  name="paymentDate"
                  type="date"
                  defaultValue={invoice.payment_date || ""}
                  disabled={isUpdatingPayment}
                  className="min-w-0"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="paymentReference" label="Check #/Transaction ID" />
                <Input
                  id="paymentReference"
                  name="paymentReference"
                  type="text"
                  placeholder="Check # or Transaction ID"
                  defaultValue={invoice.payment_reference || ""}
                  disabled={isUpdatingPayment}
                />
              </div>
            </div>
            <Button type="submit" className="mt-4" disabled={isUpdatingPayment}>
              {isUpdatingPayment ? "Updating..." : "Update Payment Info"}
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          deleteFormRef.current?.requestSubmit();
          setShowDeleteDialog(false);
        }}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice ${invoice.invoice_number}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Send Email Confirmation Dialog */}
      <ConfirmDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onConfirm={() => {
          emailFormRef.current?.requestSubmit();
          setShowEmailDialog(false);
        }}
        title="Send Invoice Email"
        description={`Send invoice ${invoice.invoice_number} to ${invoice.bill_to_email}? The invoice status will be automatically updated to "Sent".`}
        confirmText="Send Email"
        cancelText="Cancel"
        variant="warning"
        isLoading={isSendingEmail}
      />
    </div>
  );
}
