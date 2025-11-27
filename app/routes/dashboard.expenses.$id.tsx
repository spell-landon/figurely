import { json, type LoaderFunctionArgs, type MetaFunction, type ActionFunctionArgs, redirect } from "@remix-run/node";
import { Link, useLoaderData, Form, useNavigation } from "@remix-run/react";
import { ArrowLeft, Edit, Trash2, Download, FileText } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { requireAuth } from "~/lib/auth.server";
import { formatCurrency, formatCategory, formatDate } from "~/lib/utils";
import { useState, useRef } from "react";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `Expense ${data?.expense.description || ""} - Figurely` },
    { name: "description", content: "View expense details" },
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

  // Fetch original expense if this is a return
  let originalExpense = null;
  if (expense.original_expense_id) {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", expense.original_expense_id)
      .single();
    originalExpense = data;
  }

  // Fetch returns linked to this expense
  const { data: relatedReturns } = await supabase
    .from("expenses")
    .select("*")
    .eq("original_expense_id", id);

  return json({
    expense,
    originalExpense,
    relatedReturns: relatedReturns || [],
    user: session.user
  }, { headers });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (!id) {
    throw new Response("Expense ID required", { status: 400 });
  }

  // Delete Expense
  if (intent === "delete") {
    // Get expense to check for receipt
    const { data: expense } = await supabase
      .from("expenses")
      .select("receipt_url")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    // Delete receipt from storage if exists
    if (expense?.receipt_url) {
      const fileName = expense.receipt_url.split('/').slice(-2).join('/');
      await supabase.storage.from('receipts').remove([fileName]);
    }

    // Delete expense
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      return json({ error: error.message }, { status: 400, headers });
    }

    return redirect("/dashboard/expenses", { headers });
  }

  return json({ error: "Invalid action" }, { status: 400, headers });
}

function getCategoryBadge(category: string) {
  const colors: Record<string, string> = {
    travel: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    meals: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    office: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    equipment: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    software: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  };

  const color = colors[category?.toLowerCase()] || colors.other;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {formatCategory(category)}
    </span>
  );
}

export default function ExpenseDetail() {
  const { expense, originalExpense, relatedReturns } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isDeleting = navigation.state === "submitting" && navigation.formData?.get("intent") === "delete";
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  // Calculate net total if there are related returns
  const netTotal = expense.total + (relatedReturns || []).reduce((sum, ret) => sum + ret.total, 0);

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/expenses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold md:text-3xl">{expense.description}</h1>
              {getCategoryBadge(expense.category)}
              {expense.is_return && (
                <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                  Return/Refund
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground md:text-base">
              {formatDate(expense.date, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/dashboard/expenses/${expense.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>

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

      {/* Expense Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Info */}
        <Card>
          <CardContent className="p-6 md:pt-6">
            <h2 className="mb-4 text-lg font-semibold">Expense Information</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-3xl font-bold text-primary">${formatCurrency(expense.total)}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(expense.date)}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <div className="mt-1">{getCategoryBadge(expense.category)}</div>
                </div>
              </div>

              {expense.vendor && (
                <div>
                  <p className="text-sm text-muted-foreground">Vendor/Merchant</p>
                  <p className="font-medium">{expense.vendor}</p>
                </div>
              )}

              {expense.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap text-sm">{expense.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tax Information */}
        {expense.is_tax_deductible && (
          <Card>
            <CardContent className="p-6 md:pt-6">
              <h2 className="mb-4 text-lg font-semibold">Tax Information</h2>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Tax Deductible</p>
                    <p className="font-medium text-green-600">Yes</p>
                  </div>

                  {expense.tax_category && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tax Category</p>
                      <p className="font-medium">{formatCategory(expense.tax_category)}</p>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Business Use</p>
                    <p className="font-medium">{expense.business_use_percentage}%</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Deductible Amount</p>
                    <p className="text-xl font-bold text-blue-600">${formatCurrency(expense.deductible_amount)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Receipt */}
        <Card>
          <CardContent className="p-6 md:pt-6">
            <h2 className="mb-4 text-lg font-semibold">Receipt</h2>

            {expense.receipt_url ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border bg-muted">
                  {expense.receipt_url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ? (
                    <img
                      src={expense.receipt_url}
                      alt="Receipt"
                      className="h-auto w-full object-contain"
                      onError={(e) => {
                        // If image fails to load, show fallback
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : expense.receipt_url.match(/\.(pdf)(\?|$)/i) ? (
                    <iframe
                      src={expense.receipt_url}
                      className="h-[600px] w-full"
                      title="Receipt PDF"
                    />
                  ) : null}
                  <div className={expense.receipt_url.match(/\.(jpg|jpeg|png|gif|webp|pdf)(\?|$)/i) ? "hidden flex-col items-center justify-center p-12" : "flex flex-col items-center justify-center p-12"}>
                    <FileText className="h-16 w-16 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">Receipt file uploaded</p>
                  </div>
                </div>

                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Receipt
                  </Button>
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No receipt uploaded</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related Expenses */}
        {(originalExpense || (relatedReturns && relatedReturns.length > 0)) && (
          <Card>
            <CardContent className="p-6 md:pt-6">
              <h2 className="mb-4 text-lg font-semibold">Related Expenses</h2>

              {/* Show original expense if this is a return */}
              {originalExpense && expense.is_return && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Original Purchase</p>
                  <Link
                    to={`/dashboard/expenses/${originalExpense.id}`}
                    className="block rounded-lg border bg-muted/50 p-4 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{originalExpense.description || originalExpense.merchant}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(originalExpense.date)}</p>
                      </div>
                      <p className="text-lg font-semibold">${formatCurrency(originalExpense.total)}</p>
                    </div>
                  </Link>
                </div>
              )}

              {/* Show returns if this has related returns */}
              {relatedReturns && relatedReturns.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Returns & Refunds ({relatedReturns.length})
                    </p>
                    {relatedReturns.length > 0 && (
                      <p className="text-sm font-medium">
                        Net Total: ${formatCurrency(netTotal)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    {relatedReturns.map((returnExpense) => (
                      <Link
                        key={returnExpense.id}
                        to={`/dashboard/expenses/${returnExpense.id}`}
                        className="block rounded-lg border bg-muted/50 p-4 transition-colors hover:bg-muted"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{returnExpense.description || returnExpense.merchant}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(returnExpense.date)}</p>
                          </div>
                          <p className="text-lg font-semibold text-destructive">
                            ${formatCurrency(returnExpense.total)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          deleteFormRef.current?.requestSubmit();
          setShowDeleteDialog(false);
        }}
        title="Delete Expense"
        description={`Are you sure you want to delete this expense "${expense.description}"? ${expense.receipt_url ? 'The associated receipt file will also be permanently deleted. ' : ''}This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
