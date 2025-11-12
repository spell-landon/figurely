import { json, redirect, unstable_createMemoryUploadHandler, unstable_parseMultipartFormData, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Save, Upload, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { FieldLabel } from "~/components/ui/field-label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { requireAuth } from "~/lib/auth.server";
import { formatDate } from "~/lib/utils";
import { useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Expense - Ledgerly" },
    { name: "description", content: "Add a new expense" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  // Fetch user's expenses for the return expense dropdown
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, description, merchant, date, total')
    .order('date', { ascending: false })
    .limit(100);

  return json({ user: session.user, expenses: expenses || [] }, { headers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const formData = await request.formData();

  // Handle file upload if present
  const receiptFile = formData.get("receipt") as File | null;
  let receiptUrl: string | null = null;

  if (receiptFile && receiptFile.size > 0) {
    // Upload to Supabase Storage
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
    user_id: session.user.id,
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

  const { data, error } = await supabase
    .from("expenses")
    .insert(expenseData)
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, { status: 400, headers });
  }

  return redirect(`/dashboard/expenses/${data.id}`, { headers });
}

export default function NewExpense() {
  const { expenses } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReturn, setIsReturn] = useState(false);
  const [selectedOriginalExpense, setSelectedOriginalExpense] = useState<string>("");

  const today = new Date().toISOString().split("T")[0];

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
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Add New Expense</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Track a business expense
          </p>
        </div>
      </div>

      <Form method="post" encType="multipart/form-data" className="space-y-6">
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
                <FieldLabel htmlFor="description" label="Description *" required />
                <Input
                  id="description"
                  name="description"
                  placeholder="e.g., Office supplies, Client lunch, Travel expenses"
                  required
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="amount" label="Amount *" required />
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="date" label="Date *" required />
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={today}
                  required
                  className="min-w-0"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="category" label="Category *" required />
                <Select id="category" name="category" required>
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
                <FieldLabel htmlFor="vendor" label="Vendor/Merchant" required />
                <Input
                  id="vendor"
                  name="vendor"
                  placeholder="e.g., Amazon, Starbucks, Office Depot"
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="notes" label="Notes" required />
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional details about this expense..."
                rows={3}
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
                >
                  <option value="">Select original expense (optional)</option>
                  {expenses.map((expense) => (
                    <option key={expense.id} value={expense.id}>
                      {expense.description || expense.merchant} - ${expense.total.toFixed(2)} ({formatDate(expense.date)})
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
                defaultChecked
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_tax_deductible" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Tax Deductible
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="tax_category" label="Tax Category" />
                <Select id="tax_category" name="tax_category">
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
                    defaultValue="100"
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
            <CardDescription>Upload a receipt or invoice (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="receipt" className="cursor-pointer">
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground md:h-12 md:w-12" />
                      <p className="mt-2 text-xs text-muted-foreground md:text-sm">
                        Click to upload or drag and drop
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
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-4 md:flex-row md:justify-end">
          <Button type="button" variant="outline" disabled={isSubmitting} className="w-full md:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Expense"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
