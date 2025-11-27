import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { Calendar, Download, DollarSign, Receipt, Car, Home, FileText } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { requireAuth } from "~/lib/auth.server";
import { formatCurrency } from "~/lib/utils";
import { AnimatedCounter } from "~/components/ui/animated-counter";

export const meta: MetaFunction = () => {
  return [
    { title: "Tax Report - Figurely" },
    { name: "description", content: "Comprehensive tax report for your business" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate") || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const endDate = url.searchParams.get("endDate") || new Date().toISOString().split('T')[0];

  // Fetch all data in date range
  const [invoicesResult, expensesResult, mileageResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("mileage")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("date", startDate)
      .lte("date", endDate),
  ]);

  const invoices = invoicesResult.data || [];
  const expenses = expensesResult.data || [];
  const mileage = mileageResult.data || [];

  // Calculate income (paid invoices only)
  const totalIncome = invoices
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0);

  // Calculate tax-deductible expenses
  const taxDeductibleExpenses = expenses.filter(exp => exp.is_tax_deductible);
  const totalExpenses = taxDeductibleExpenses.reduce((sum, exp) => sum + exp.deductible_amount, 0);

  // Calculate mileage deduction
  const totalMileage = mileage.reduce((sum, m) => sum + m.miles, 0);
  const totalMileageDeduction = mileage.reduce((sum, m) => sum + m.total, 0);

  // Group expenses by tax category
  const expensesByCategory: Record<string, { count: number; total: number }> = {};
  taxDeductibleExpenses.forEach(exp => {
    const category = exp.tax_category || "uncategorized";
    if (!expensesByCategory[category]) {
      expensesByCategory[category] = { count: 0, total: 0 };
    }
    expensesByCategory[category].count++;
    expensesByCategory[category].total += exp.deductible_amount;
  });

  // Calculate totals
  const totalDeductions = totalExpenses + totalMileageDeduction;
  const netProfit = totalIncome - totalDeductions;

  // Estimated tax (simplified - actual rates vary)
  const selfEmploymentTax = netProfit > 0 ? netProfit * 0.153 : 0; // 15.3% SE tax
  const estimatedIncomeTax = netProfit > 0 ? (netProfit - selfEmploymentTax / 2) * 0.22 : 0; // Simplified 22% bracket
  const totalEstimatedTax = selfEmploymentTax + estimatedIncomeTax;

  return json({
    stats: {
      totalIncome,
      totalExpenses,
      totalMileageDeduction,
      totalDeductions,
      netProfit,
      selfEmploymentTax,
      estimatedIncomeTax,
      totalEstimatedTax,
      totalMileage,
      expenseCount: taxDeductibleExpenses.length,
      mileageRecordCount: mileage.length,
    },
    expensesByCategory,
    startDate,
    endDate,
  }, { headers });
}

function formatTaxCategory(category: string) {
  const categoryMap: Record<string, string> = {
    rent: "Rent/Mortgage",
    utilities: "Utilities",
    internet: "Internet",
    supplies: "Supplies",
    equipment: "Equipment",
    meals: "Meals & Entertainment",
    travel: "Travel",
    vehicle: "Vehicle Expenses",
    professional_services: "Professional Services",
    marketing: "Marketing & Advertising",
    insurance: "Insurance",
    other: "Other",
    uncategorized: "Uncategorized"
  };
  return categoryMap[category] || category;
}

export default function TaxReport() {
  const { stats, expensesByCategory, startDate, endDate } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleDateChange = (field: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(field, value);
    setSearchParams(params);
  };

  return (
    <div className="container mx-auto space-y-4 p-4 md:space-y-6 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div>
          <h1 className="text-xl font-bold md:text-3xl">Tax Report</h1>
          <p className="text-xs text-muted-foreground md:text-base">
            Comprehensive tax summary for your business
          </p>
        </div>
        <Link to={`/dashboard/tax-report/pdf?startDate=${startDate}&endDate=${endDate}`} target="_blank" reloadDocument>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </Link>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tax Year / Date Range
          </CardTitle>
          <CardDescription>Select the period for your tax report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange("startDate", e.target.value)}
                className="min-w-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange("endDate", e.target.value)}
                className="min-w-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income & Deductions Summary */}
      <div className="grid gap-4 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              $<AnimatedCounter value={stats.totalIncome} format="currency" decimals={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              From paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              $<AnimatedCounter value={stats.totalDeductions} format="currency" decimals={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              <AnimatedCounter value={stats.expenseCount} /> expenses + mileage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              $<AnimatedCounter value={stats.netProfit} format="currency" decimals={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              Income - Deductions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Tax Liability</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              $<AnimatedCounter value={stats.totalEstimatedTax} format="currency" decimals={2} />
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated total tax
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deductions Breakdown */}
      <div className="grid gap-4 md:gap-4 md:grid-cols-2">
        {/* Mileage Deduction */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              <CardTitle>Mileage Deduction</CardTitle>
            </div>
            <CardDescription>Business miles driven</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Miles</span>
                <span className="font-semibold"><AnimatedCounter value={stats.totalMileage} decimals={1} /> mi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Records</span>
                <span className="font-semibold"><AnimatedCounter value={stats.mileageRecordCount} /></span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium">Total Deduction</span>
                <span className="text-lg font-bold text-primary">
                  $<AnimatedCounter value={stats.totalMileageDeduction} format="currency" decimals={2} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Deductions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              <CardTitle>Expense Deductions</CardTitle>
            </div>
            <CardDescription>Tax-deductible business expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No deductible expenses in this period
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(expensesByCategory)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([category, data]) => (
                    <div key={category} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm font-medium">{formatTaxCategory(category)}</p>
                        <p className="text-xs text-muted-foreground">{data.count} expense{data.count !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="font-semibold">${formatCurrency(data.total)}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tax Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Estimated Tax Breakdown</CardTitle>
          <CardDescription>
            Simplified tax estimate - consult a tax professional for accurate calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Self-Employment Tax (15.3%)</span>
              <span className="font-semibold">$<AnimatedCounter value={stats.selfEmploymentTax} format="currency" decimals={2} /></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Estimated Income Tax</span>
              <span className="font-semibold">$<AnimatedCounter value={stats.estimatedIncomeTax} format="currency" decimals={2} /></span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="font-medium text-lg">Total Estimated Tax</span>
              <span className="text-2xl font-bold text-orange-600">
                $<AnimatedCounter value={stats.totalEstimatedTax} format="currency" decimals={2} />
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This is a simplified estimate. Actual tax liability depends on your specific situation,
              deductions, credits, and tax bracket. Please consult with a tax professional.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
