import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, Link } from "@remix-run/react";
import { Save, Upload, X, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { FieldLabel } from "~/components/ui/field-label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { requireAuth } from "~/lib/auth.server";
import { formatDate } from "~/lib/utils";
import { useState, useRef } from "react";
import { FormSaveBar } from "~/components/ui/form-save-bar";
import { useFormDirtyState } from "~/hooks/useFormDirtyState";
import { useNavigationBlocker } from "~/hooks/useNavigationBlocker";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `Edit Expense ${data?.expense.description || ""} - Ledgerly` },
    { name: "description", content: "Edit expense" },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const { id } = params;

  if (!id) {
    throw new Response("Expense ID required", { status: 400 });
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !expense) {
    throw new Response("Expense not found", { status: 404 });
  }

  // Fetch user's expenses for the return expense dropdown (excluding current expense)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, description, merchant, date, total')
    .neq('id', id)
    .order('date', { ascending: false })
    .limit(100);

  return json({ expense, expenses: expenses || [] }, { headers });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const { id } = params;
  const formData = await request.formData();

  if (!id) {
    throw new Response("Expense ID required", { status: 400 });
  }

  // Get existing expense to check for receipt
  const { data: existingExpense } = await supabase
    .from("expenses")
    .select("receipt_url")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  // Handle file upload if present
  const receiptFile = formData.get("receipt") as File | null;
  let receiptUrl: string | null = existingExpense?.receipt_url || null;

  if (receiptFile && receiptFile.size > 0) {
    // Delete old receipt if exists
    if (existingExpense?.receipt_url) {
      const oldFileName = existingExpense.receipt_url.split('/').slice(-2).join('/');
      await supabase.storage.from('receipts').remove([oldFileName]);
    }

    // Upload new receipt
    const fileExt = receiptFile.name.split('.').pop();
    const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, receiptFile);

    if (uploadError) {
      return json({ error: "Failed to upload receipt" }, { status: 400, headers });
    }

    // Get public URL
    const { data } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    receiptUrl = data.publicUrl;
  }

  // Parse form data
  const isReturn = formData.get("is_return") === "on";
  const originalExpenseId = formData.get("original_expense_id") as string || null;

  const expenseData = {
    merchant: formData.get("vendor") as string || "",
    description: formData.get("description") as string || null,
    total: parseFloat(formData.get("amount") as string || "0"),
    date: formData.get("date") as string,
    category: formData.get("category") as string,
    notes: formData.get("notes") as string || null,
    receipt_url: receiptUrl,
    is_tax_deductible: formData.get("is_tax_deductible") === "on",
    tax_category: formData.get("tax_category") as string || null,
    business_use_percentage: parseFloat(formData.get("business_use_percentage") as string || "100"),
    is_return: isReturn,
    original_expense_id: isReturn && originalExpenseId ? originalExpenseId : null,
  };
  // Note: deductible_amount is a generated column in the database and is calculated automatically

  const { error } = await supabase
    .from("expenses")
    .update(expenseData)
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    return json({ error: error.message }, { status: 400, headers });
  }

  return redirect(`/dashboard/expenses/${id}`, { headers });
}

export default function EditExpense() {
  const { expense, expenses } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReturn, setIsReturn] = useState(expense.is_return || false);
  const [selectedOriginalExpense, setSelectedOriginalExpense] = useState<string>(expense.original_expense_id || "");

  // Form state management - track file selection and return state as dependencies
  const formRef = useRef<HTMLFormElement>(null);
  const { isDirty, resetDirty } = useFormDirtyState(formRef, [selectedFile, isReturn, selectedOriginalExpense]);
  const { blocker } = useNavigationBlocker(isDirty);

  // Save handler - trigger form submission
  const handleSave = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  // Discard handler - reset form and controlled state to initial values
  const handleDiscard = () => {
    if (formRef.current) {
      formRef.current.reset();
      setSelectedFile(null);
      setIsReturn(expense.is_return || false);
      setSelectedOriginalExpense(expense.original_expense_id || "");
      resetDirty();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById("receipt") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
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
        <Link to={`/dashboard/expenses/${expense.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Edit Expense</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Update expense details
          </p>
        </div>
      </div>

      <Form method="post" encType="multipart/form-data" className="space-y-6" ref={formRef}>
        {actionData?.error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {actionData.error}
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <FieldLabel htmlFor="description" label="Description" required />
                <Input
                  id="description"
                  name="description"
                  placeholder="e.g., Office supplies, Client lunch, Travel expenses"
                  defaultValue={expense.description || ""}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="amount" label="Amount" required />
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={expense.total}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="date" label="Date" required />
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={expense.date}
                  required
                  disabled={isSubmitting}
                  className="min-w-0"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="category" label="Category" required />
                <Select id="category" name="category" defaultValue={expense.category} required disabled={isSubmitting}>
                  <option value="">Select a category</option>
                  <option value="travel">Travel</option>
                  <option value="meals">Meals & Entertainment</option>
                  <option value="office">Office Supplies</option>
                  <option value="equipment">Equipment</option>
                  <option value="software">Software & Subscriptions</option>
                  <option value="utilities">Utilities</option>
                  <option value="marketing">Marketing & Advertising</option>
                  <option value="professional">Professional Services</option>
                  <option value="other">Other</option>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="vendor" label="Vendor/Merchant" />
                <Input
                  id="vendor"
                  name="vendor"
                  placeholder="e.g., Amazon, Starbucks, Office Depot"
                  defaultValue={expense.merchant || ""}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="notes" label="Notes" />
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional details about this expense..."
                rows={3}
                defaultValue={expense.notes || ""}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Return/Refund Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Return/Refund</CardTitle>
            <CardDescription>Mark this expense as a return or refund and link to the original purchase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_return"
                name="is_return"
                checked={isReturn}
                onChange={(e) => setIsReturn(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_return" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                This is a return or refund
              </Label>
            </div>

            {isReturn && (
              <div className="space-y-2">
                <FieldLabel htmlFor="original_expense_id" label="Original Expense" />
                <Select
                  id="original_expense_id"
                  name="original_expense_id"
                  value={selectedOriginalExpense}
                  onChange={(e) => setSelectedOriginalExpense(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Select original expense (optional)</option>
                  {expenses.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.description || exp.merchant} - ${exp.total.toFixed(2)} ({formatDate(exp.date)})
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link this return/refund to the original purchase for accurate tracking
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tax Information */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Information</CardTitle>
            <CardDescription>Configure tax deduction details for this expense</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_tax_deductible"
                name="is_tax_deductible"
                defaultChecked={expense.is_tax_deductible}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_tax_deductible" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Tax Deductible
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="tax_category" label="Tax Category" />
                <Select id="tax_category" name="tax_category" defaultValue={expense.tax_category || ""} disabled={isSubmitting}>
                  <option value="">Select category</option>
                  <option value="rent">Rent/Mortgage</option>
                  <option value="utilities">Utilities</option>
                  <option value="internet">Internet</option>
                  <option value="supplies">Supplies</option>
                  <option value="equipment">Equipment</option>
                  <option value="meals">Meals & Entertainment</option>
                  <option value="travel">Travel</option>
                  <option value="vehicle">Vehicle Expenses</option>
                  <option value="professional_services">Professional Services</option>
                  <option value="marketing">Marketing & Advertising</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="business_use_percentage" label="Business Use %" />
                <div className="flex items-center gap-2">
                  <Input
                    id="business_use_percentage"
                    name="business_use_percentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    defaultValue={expense.business_use_percentage}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Percentage of this expense used for business
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Receipt</CardTitle>
            <CardDescription>
              {expense.receipt_url ? "Upload a new receipt to replace the current one" : "Upload a receipt or invoice (optional)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expense.receipt_url && !selectedFile && (
                <div className="rounded-md border bg-muted p-3">
                  <p className="text-sm text-muted-foreground">Current receipt on file</p>
                  <a
                    href={expense.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View current receipt
                  </a>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="receipt" className="cursor-pointer">
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground md:h-12 md:w-12" />
                      <p className="mt-2 text-xs text-muted-foreground md:text-sm">
                        {expense.receipt_url ? "Click to upload a new receipt" : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, PDF up to 10MB
                      </p>
                    </div>
                  </div>
                  <Input
                    id="receipt"
                    name="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </Label>

                {selectedFile && (
                  <div className="flex items-center justify-between rounded-md border bg-muted p-3">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearFile}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Form>
      </div>
    </>
  );
}
