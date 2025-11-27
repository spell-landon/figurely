import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { useLoaderData, useSearchParams, Link } from '@remix-run/react';
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  FileText,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { requireAuth } from '~/lib/auth.server';
import { formatCurrency, formatCategory, formatDate } from '~/lib/utils';
import { AnimatedCounter } from '~/components/ui/animated-counter';

export const meta: MetaFunction = () => {
  return [
    { title: 'Reports & Analytics - Figurely' },
    {
      name: 'description',
      content: 'View your business reports and analytics',
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  const url = new URL(request.url);
  const startDate =
    url.searchParams.get('startDate') ||
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const endDate =
    url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];

  // Fetch all invoices and expenses in date range
  const [invoicesResult, expensesResult] = await Promise.all([
    supabase
      .from('invoices')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true }),
    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true }),
  ]);

  const invoices = invoicesResult.data || [];
  const expenses = expensesResult.data || [];

  // Calculate invoice stats by status
  const invoicesByStatus = {
    draft: invoices.filter((inv) => inv.status === 'draft'),
    sent: invoices.filter((inv) => inv.status === 'sent'),
    paid: invoices.filter((inv) => inv.status === 'paid'),
    overdue: invoices.filter((inv) => inv.status === 'overdue'),
  };

  // Calculate expense stats by category
  const expensesByCategory: Record<string, { count: number; total: number }> =
    {};
  expenses.forEach((exp) => {
    const category = exp.category || 'other';
    if (!expensesByCategory[category]) {
      expensesByCategory[category] = { count: 0, total: 0 };
    }
    expensesByCategory[category].count++;
    expensesByCategory[category].total += exp.total;
  });

  // Calculate payment method breakdown for paid invoices
  const paymentMethods: Record<string, { count: number; total: number }> = {};
  invoices
    .filter((inv) => inv.status === 'paid' && inv.payment_method)
    .forEach((inv) => {
      const method = inv.payment_method || 'unknown';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, total: 0 };
      }
      paymentMethods[method].count++;
      paymentMethods[method].total += inv.total;
    });

  // Calculate monthly breakdown
  const monthlyData: Record<string, { income: number; expenses: number }> = {};

  invoices.forEach((inv) => {
    if (inv.status === 'paid') {
      const month = formatDate(inv.date, {
        year: 'numeric',
        month: 'short',
      });
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0 };
      }
      monthlyData[month].income += inv.total;
    }
  });

  expenses.forEach((exp) => {
    const month = formatDate(exp.date, {
      year: 'numeric',
      month: 'short',
    });
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expenses: 0 };
    }
    monthlyData[month].expenses += exp.total;
  });

  // Calculate totals
  const totalIncome = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.total, 0);

  const totalPending = invoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const paidInvoiceCount = invoices.filter(
    (inv) => inv.status === 'paid'
  ).length;

  const stats = {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    totalPending,
    invoiceCount: invoices.length,
    expenseCount: expenses.length,
    averageInvoice: paidInvoiceCount > 0 ? totalIncome / paidInvoiceCount : 0,
    averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0,
  };

  return json(
    {
      stats,
      invoicesByStatus,
      expensesByCategory,
      paymentMethods,
      monthlyData: Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data,
        profit: data.income - data.expenses,
      })),
      startDate,
      endDate,
    },
    { headers }
  );
}

function formatPaymentMethod(method: string) {
  const methodMap: Record<string, string> = {
    check: 'Check',
    cash: 'Cash',
    direct_deposit: 'Direct Deposit',
    paypal: 'PayPal',
    venmo: 'Venmo',
    zelle: 'Zelle',
    wire_transfer: 'Wire Transfer',
    other: 'Other',
    unknown: 'Unknown',
  };
  return methodMap[method] || method;
}

export default function Reports() {
  const {
    stats,
    invoicesByStatus,
    expensesByCategory,
    paymentMethods,
    monthlyData,
    startDate,
    endDate,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleDateChange = (field: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(field, value);
    setSearchParams(params);
  };

  const exportToCSV = () => {
    // Properly format CSV with escaped values
    const csvData = monthlyData
      .map(
        (m) =>
          `"${m.month}","${m.income.toFixed(2)}","${m.expenses.toFixed(
            2
          )}","${m.profit.toFixed(2)}"`
      )
      .join('\n');

    const csv = `"Month","Income","Expenses","Profit"\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `figurely-report-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <div className='container mx-auto space-y-4 p-4 md:space-y-6 md:p-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4'>
        <div>
          <h1 className='text-xl font-bold md:text-3xl'>Reports & Analytics</h1>
          <p className='text-xs text-muted-foreground md:text-base'>
            View detailed insights into your business finances
          </p>
        </div>
        <Button onClick={exportToCSV} variant='outline'>
          <Download className='mr-2 h-4 w-4' />
          Export CSV
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Calendar className='h-5 w-5' />
            Date Range
          </CardTitle>
          <CardDescription>Filter reports by date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='startDate'>Start Date</Label>
              <Input
                id='startDate'
                type='date'
                value={startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='endDate'>End Date</Label>
              <Input
                id='endDate'
                type='date'
                value={endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className='grid gap-4 md:gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Income</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              $
              <AnimatedCounter
                value={stats.totalIncome}
                format='currency'
                decimals={2}
              />
            </div>
            <p className='text-xs text-muted-foreground'>
              Avg: $
              <AnimatedCounter
                value={stats.averageInvoice}
                format='currency'
                decimals={2}
              />{' '}
              per invoice
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Expenses
            </CardTitle>
            <Receipt className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              $
              <AnimatedCounter
                value={stats.totalExpenses}
                format='currency'
                decimals={2}
              />
            </div>
            <p className='text-xs text-muted-foreground'>
              Avg: $
              <AnimatedCounter
                value={stats.averageExpense}
                format='currency'
                decimals={2}
              />{' '}
              per expense
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Net Profit</CardTitle>
            {stats.netProfit >= 0 ? (
              <TrendingUp className='h-4 w-4 text-green-600' />
            ) : (
              <TrendingDown className='h-4 w-4 text-red-600' />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
              $
              <AnimatedCounter
                value={stats.netProfit}
                format='currency'
                decimals={2}
              />
            </div>
            <p className='text-xs text-muted-foreground'>Income - Expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Pending</CardTitle>
            <FileText className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-600'>
              $
              <AnimatedCounter
                value={stats.totalPending}
                format='currency'
                decimals={2}
              />
            </div>
            <p className='text-xs text-muted-foreground'>Unpaid invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
          <CardDescription>
            Income, expenses, and profit by month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              No data available for the selected date range
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className='flex flex-col gap-3 md:hidden'>
                {monthlyData.map((month) => (
                  <div key={month.month} className='rounded-lg border p-4'>
                    <p className='font-semibold text-lg mb-3'>{month.month}</p>
                    <div className='grid grid-cols-3 gap-2 text-sm'>
                      <div>
                        <p className='text-xs text-muted-foreground'>Income</p>
                        <p className='font-semibold text-green-600'>
                          ${formatCurrency(month.income)}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>
                          Expenses
                        </p>
                        <p className='font-semibold text-red-600'>
                          ${formatCurrency(month.expenses)}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>Profit</p>
                        <p
                          className={`font-bold ${
                            month.profit >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                          ${formatCurrency(month.profit)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Mobile Total Card */}
                <div className='rounded-lg border-2 border-primary/20 bg-muted/30 p-4 mt-2'>
                  <p className='font-bold text-lg mb-3'>Total</p>
                  <div className='grid grid-cols-3 gap-2 text-sm'>
                    <div>
                      <p className='text-xs text-muted-foreground'>Income</p>
                      <p className='font-bold text-green-600'>
                        ${formatCurrency(stats.totalIncome)}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground'>Expenses</p>
                      <p className='font-bold text-red-600'>
                        ${formatCurrency(stats.totalExpenses)}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground'>Profit</p>
                      <p
                        className={`font-bold ${
                          stats.netProfit >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                        ${formatCurrency(stats.netProfit)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className='hidden md:block overflow-x-auto'>
                <table className='w-full'>
                  <thead className='border-b bg-muted/50'>
                    <tr>
                      <th className='px-4 py-3 text-left text-sm font-medium'>
                        Month
                      </th>
                      <th className='px-4 py-3 text-right text-sm font-medium'>
                        Income
                      </th>
                      <th className='px-4 py-3 text-right text-sm font-medium'>
                        Expenses
                      </th>
                      <th className='px-4 py-3 text-right text-sm font-medium'>
                        Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {monthlyData.map((month) => (
                      <tr key={month.month} className='hover:bg-muted/50'>
                        <td className='px-4 py-3 font-medium'>{month.month}</td>
                        <td className='px-4 py-3 text-right text-green-600'>
                          ${formatCurrency(month.income)}
                        </td>
                        <td className='px-4 py-3 text-right text-red-600'>
                          ${formatCurrency(month.expenses)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            month.profit >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                          ${formatCurrency(month.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className='border-t-2 bg-muted/30 font-semibold'>
                    <tr>
                      <td className='px-4 py-3'>Total</td>
                      <td className='px-4 py-3 text-right text-green-600'>
                        ${formatCurrency(stats.totalIncome)}
                      </td>
                      <td className='px-4 py-3 text-right text-red-600'>
                        ${formatCurrency(stats.totalExpenses)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right ${
                          stats.netProfit >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                        ${formatCurrency(stats.netProfit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Grid */}
      <div className='grid gap-4 md:gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {/* Invoice Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
            <CardDescription>Breakdown by invoice status</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-3 w-3 rounded-full bg-green-500'></div>
                  <span className='text-sm'>Paid</span>
                </div>
                <div className='text-right'>
                  <p className='font-semibold'>
                    {invoicesByStatus.paid.length}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    $
                    {formatCurrency(
                      invoicesByStatus.paid.reduce(
                        (sum, inv) => sum + inv.total,
                        0
                      )
                    )}
                  </p>
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-3 w-3 rounded-full bg-blue-500'></div>
                  <span className='text-sm'>Sent</span>
                </div>
                <div className='text-right'>
                  <p className='font-semibold'>
                    {invoicesByStatus.sent.length}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    $
                    {formatCurrency(
                      invoicesByStatus.sent.reduce(
                        (sum, inv) => sum + inv.total,
                        0
                      )
                    )}
                  </p>
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-3 w-3 rounded-full bg-gray-400'></div>
                  <span className='text-sm'>Draft</span>
                </div>
                <div className='text-right'>
                  <p className='font-semibold'>
                    {invoicesByStatus.draft.length}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    $
                    {formatCurrency(
                      invoicesByStatus.draft.reduce(
                        (sum, inv) => sum + inv.total,
                        0
                      )
                    )}
                  </p>
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-3 w-3 rounded-full bg-red-500'></div>
                  <span className='text-sm'>Overdue</span>
                </div>
                <div className='text-right'>
                  <p className='font-semibold'>
                    {invoicesByStatus.overdue.length}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    $
                    {formatCurrency(
                      invoicesByStatus.overdue.reduce(
                        (sum, inv) => sum + inv.total,
                        0
                      )
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>Breakdown by expense category</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className='py-8 text-center text-sm text-muted-foreground'>
                No expenses in this date range
              </p>
            ) : (
              <div className='space-y-3'>
                {Object.entries(expensesByCategory)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([category, data]) => (
                    <div
                      key={category}
                      className='flex items-center justify-between'>
                      <div>
                        <p className='text-sm font-medium'>
                          {formatCategory(category)}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {data.count} expense{data.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='font-semibold'>
                          ${formatCurrency(data.total)}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {((data.total / stats.totalExpenses) * 100).toFixed(
                            1
                          )}
                          %
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>How invoices were paid</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(paymentMethods).length === 0 ? (
              <p className='py-8 text-center text-sm text-muted-foreground'>
                No payment data available
              </p>
            ) : (
              <div className='space-y-3'>
                {Object.entries(paymentMethods)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([method, data]) => (
                    <div
                      key={method}
                      className='flex items-center justify-between'>
                      <div>
                        <p className='text-sm font-medium'>
                          {formatPaymentMethod(method)}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {data.count} invoice{data.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='font-semibold'>
                          ${formatCurrency(data.total)}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {((data.total / stats.totalIncome) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
