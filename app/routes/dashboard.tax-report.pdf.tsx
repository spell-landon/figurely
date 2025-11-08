import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { requireAuth } from "~/lib/auth.server";

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #000",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
    borderBottom: "1 solid #ccc",
    paddingBottom: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingVertical: 3,
  },
  rowLabel: {
    fontSize: 11,
    color: "#333",
  },
  rowValue: {
    fontSize: 11,
    fontWeight: "bold",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingVertical: 5,
    borderTop: "1 solid #ccc",
    paddingTop: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "bold",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#000",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingLeft: 10,
  },
  categoryLabel: {
    fontSize: 10,
    color: "#555",
  },
  categoryValue: {
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#999",
    fontSize: 9,
    borderTop: "1 solid #ccc",
    paddingTop: 10,
  },
  disclaimer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f5f5f5",
    fontSize: 9,
    color: "#666",
    borderRadius: 4,
  },
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTaxCategory(category: string): string {
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

interface TaxReportData {
  stats: {
    totalIncome: number;
    totalExpenses: number;
    totalMileageDeduction: number;
    totalDeductions: number;
    netProfit: number;
    selfEmploymentTax: number;
    estimatedIncomeTax: number;
    totalEstimatedTax: number;
    totalMileage: number;
    expenseCount: number;
    mileageRecordCount: number;
  };
  expensesByCategory: Record<string, { count: number; total: number }>;
  startDate: string;
  endDate: string;
}

function TaxReportPDF({ data }: { data: TaxReportData }) {
  const { stats, expensesByCategory, startDate, endDate } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tax Report</Text>
          <Text style={styles.subtitle}>
            Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
          </Text>
          <Text style={styles.subtitle}>
            Generated: {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Income Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income Summary</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Gross Income (Paid Invoices)</Text>
            <Text style={styles.rowValue}>${formatCurrency(stats.totalIncome)}</Text>
          </View>
        </View>

        {/* Deductions Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deductions Summary</Text>

          {/* Mileage */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Mileage Deduction ({stats.totalMileage.toFixed(1)} miles)</Text>
            <Text style={styles.rowValue}>${formatCurrency(stats.totalMileageDeduction)}</Text>
          </View>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>{stats.mileageRecordCount} mileage record(s)</Text>
          </View>

          {/* Expenses by Category */}
          <View style={{ marginTop: 10 }}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Business Expenses</Text>
              <Text style={styles.rowValue}>${formatCurrency(stats.totalExpenses)}</Text>
            </View>
            {Object.entries(expensesByCategory)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([category, data]) => (
                <View key={category} style={styles.categoryRow}>
                  <Text style={styles.categoryLabel}>
                    {formatTaxCategory(category)} ({data.count})
                  </Text>
                  <Text style={styles.categoryValue}>${formatCurrency(data.total)}</Text>
                </View>
              ))}
          </View>

          {/* Total Deductions */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Deductions</Text>
            <Text style={styles.summaryValue}>${formatCurrency(stats.totalDeductions)}</Text>
          </View>
        </View>

        {/* Net Profit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Net Profit/Loss</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Gross Income</Text>
            <Text style={styles.rowValue}>${formatCurrency(stats.totalIncome)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Deductions</Text>
            <Text style={styles.rowValue}>-${formatCurrency(stats.totalDeductions)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Profit</Text>
            <Text style={[styles.summaryValue, { color: stats.netProfit >= 0 ? "#059669" : "#DC2626" }]}>
              ${formatCurrency(stats.netProfit)}
            </Text>
          </View>
        </View>

        {/* Tax Estimate */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estimated Tax Liability</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Self-Employment Tax (15.3%)</Text>
            <Text style={styles.rowValue}>${formatCurrency(stats.selfEmploymentTax)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Estimated Income Tax</Text>
            <Text style={styles.rowValue}>${formatCurrency(stats.estimatedIncomeTax)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Estimated Tax</Text>
            <Text style={[styles.summaryValue, { color: "#EA580C" }]}>
              ${formatCurrency(stats.totalEstimatedTax)}
            </Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text>
            DISCLAIMER: This is a simplified tax estimate for informational purposes only.
            Actual tax liability depends on your specific situation, deductions, credits, and tax bracket.
            Please consult with a qualified tax professional or CPA for accurate tax calculations and filing.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated by Ledgerly - Business Tax Report</Text>
          <Text>This report is not a substitute for professional tax advice</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
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
  const selfEmploymentTax = netProfit > 0 ? netProfit * 0.153 : 0;
  const estimatedIncomeTax = netProfit > 0 ? (netProfit - selfEmploymentTax / 2) * 0.22 : 0;
  const totalEstimatedTax = selfEmploymentTax + estimatedIncomeTax;

  const data: TaxReportData = {
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
  };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(<TaxReportPDF data={data} />);

    // Return PDF response
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tax-report-${startDate}-to-${endDate}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Tax Report PDF Error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
