import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import {
  FileText,
  Receipt,
  BarChart3,
  Plus,
  Settings,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { requireAuth } from '~/lib/auth.server';
import { formatCurrency } from '~/lib/utils';
import { AnimatedCounter } from '~/components/ui/animated-counter';

export const meta: MetaFunction = () => {
  return [
    { title: 'Dashboard - Figurely' },
    { name: 'description', content: 'Your Figurely dashboard' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  // Fetch all invoices and expenses with details
  const [invoicesResult, expensesResult] = await Promise.all([
    supabase
      .from('invoices')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false }),
  ]);

  const invoices = invoicesResult.data || [];
  const expenses = expensesResult.data || [];

  // Calculate date ranges
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // Filter for current and last month
  const currentMonthInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.date);
    return (
      invDate.getMonth() === currentMonth &&
      invDate.getFullYear() === currentYear
    );
  });

  const lastMonthInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.date);
    return (
      invDate.getMonth() === lastMonth &&
      invDate.getFullYear() === lastMonthYear
    );
  });

  const currentMonthExpenses = expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    return (
      expDate.getMonth() === currentMonth &&
      expDate.getFullYear() === currentYear
    );
  });

  const lastMonthExpenses = expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    return (
      expDate.getMonth() === lastMonth &&
      expDate.getFullYear() === lastMonthYear
    );
  });

  // Calculate stats
  const totalIncome = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalExpensesAmount = expenses.reduce((sum, exp) => sum + exp.total, 0);

  const currentMonthIncome = currentMonthInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const lastMonthIncome = lastMonthInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const currentMonthExpensesAmount = currentMonthExpenses.reduce(
    (sum, exp) => sum + exp.total,
    0
  );

  const lastMonthExpensesAmount = lastMonthExpenses.reduce(
    (sum, exp) => sum + exp.total,
    0
  );

  const stats = {
    totalInvoices: invoices.length,
    totalExpenses: expenses.length,
    unpaidInvoices: invoices.filter((inv) => inv.status !== 'paid').length,
    overdueInvoices: invoices.filter((inv) => inv.status === 'overdue').length,
    totalIncome,
    totalExpensesAmount,
    netProfit: totalIncome - totalExpensesAmount,
    currentMonthIncome,
    lastMonthIncome,
    currentMonthExpensesAmount,
    lastMonthExpensesAmount,
    incomeChange:
      lastMonthIncome > 0
        ? ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100
        : 0,
    expensesChange:
      lastMonthExpensesAmount > 0
        ? ((currentMonthExpensesAmount - lastMonthExpensesAmount) /
            lastMonthExpensesAmount) *
          100
        : 0,
  };

  // Get recent items
  const recentInvoices = invoices.slice(0, 5);
  const recentExpenses = expenses.slice(0, 5);

  return json(
    { stats, recentInvoices, recentExpenses, user: session.user },
    { headers }
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge variant='success'>Paid</Badge>;
    case 'sent':
      return <Badge variant='default'>Sent</Badge>;
    case 'draft':
      return <Badge variant='secondary'>Draft</Badge>;
    case 'overdue':
      return <Badge variant='destructive'>Overdue</Badge>;
    default:
      return <Badge variant='outline'>{status}</Badge>;
  }
}

export default function DashboardIndex() {
  const { stats, recentInvoices, recentExpenses } =
    useLoaderData<typeof loader>();

  return (
    <div className='container mx-auto space-y-4 p-4 md:space-y-6 md:p-6'>
      {/* Welcome Section */}
      <div>
        <h1 className='text-2xl font-bold md:text-3xl'>Welcome back!</h1>
        <p className='text-sm text-muted-foreground md:text-base'>
          Here's an overview of your business finances
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className='grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              This Month Income
            </CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              $
              <AnimatedCounter
                value={stats.currentMonthIncome}
                format='currency'
                decimals={2}
              />
            </div>
            <div className='flex items-center gap-1 text-xs'>
              {stats.incomeChange >= 0 ? (
                <>
                  <TrendingUp className='h-3 w-3 text-green-600' />
                  <span className='text-green-600'>
                    +<AnimatedCounter value={stats.incomeChange} decimals={1} />
                    %
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className='h-3 w-3 text-red-600' />
                  <span className='text-red-600'>
                    <AnimatedCounter value={stats.incomeChange} decimals={1} />%
                  </span>
                </>
              )}
              <span className='text-muted-foreground'>from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              This Month Expenses
            </CardTitle>
            <Receipt className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              $
              <AnimatedCounter
                value={stats.currentMonthExpensesAmount}
                format='currency'
                decimals={2}
              />
            </div>
            <div className='flex items-center gap-1 text-xs'>
              {stats.expensesChange >= 0 ? (
                <>
                  <TrendingUp className='h-3 w-3 text-red-600' />
                  <span className='text-red-600'>
                    +
                    <AnimatedCounter
                      value={stats.expensesChange}
                      decimals={1}
                    />
                    %
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className='h-3 w-3 text-green-600' />
                  <span className='text-green-600'>
                    <AnimatedCounter
                      value={stats.expensesChange}
                      decimals={1}
                    />
                    %
                  </span>
                </>
              )}
              <span className='text-muted-foreground'>from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Net Profit
            </CardTitle>
            <BarChart3 className='h-4 w-4 text-muted-foreground' />
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
            <p className='text-xs text-muted-foreground'>
              All time income - expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Pending Invoices
            </CardTitle>
            <AlertCircle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              <AnimatedCounter value={stats.unpaidInvoices} />
            </div>
            <p className='text-xs text-muted-foreground'>
              <AnimatedCounter value={stats.overdueInvoices} /> overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* All Time Stats */}
      <div className='grid gap-2 md:gap-4 grid-cols-3 md:grid-cols-3'>
        <Card>
          <CardHeader className='pb-1.5 md:pb-3'>
            <CardTitle className='text-xs md:text-sm font-medium text-muted-foreground'>
              Total Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-lg md:text-2xl font-bold'>
              <AnimatedCounter value={stats.totalInvoices} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-1.5 md:pb-3'>
            <CardTitle className='text-xs md:text-sm font-medium text-muted-foreground'>
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-lg md:text-2xl font-bold'>
              $
              <AnimatedCounter
                value={stats.totalIncome}
                format='currency'
                decimals={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-1.5 md:pb-3'>
            <CardTitle className='text-xs md:text-sm font-medium text-muted-foreground'>
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-lg md:text-2xl font-bold'>
              $
              <AnimatedCounter
                value={stats.totalExpensesAmount}
                format='currency'
                decimals={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className='grid gap-4 md:grid-cols-2'>
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Recent Invoices</CardTitle>
              <Link to='/dashboard/invoices'>
                <Button variant='ghost' size='sm'>
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-8 text-center'>
                <FileText className='h-12 w-12 text-muted-foreground' />
                <p className='mt-2 text-sm text-muted-foreground'>
                  No invoices yet
                </p>
                <Link to='/dashboard/invoices/new'>
                  <Button size='sm' className='mt-4'>
                    <Plus className='mr-2 h-4 w-4' />
                    Create Invoice
                  </Button>
                </Link>
              </div>
            ) : (
              <div className='space-y-3'>
                {recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/dashboard/invoices/${invoice.id}`}
                    className='flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50'>
                    <div className='flex-1 min-w-0'>
                      <p className='font-medium truncate'>
                        {invoice.invoice_number}
                      </p>
                      <p className='text-xs text-muted-foreground truncate'>
                        {invoice.bill_to_name || 'No client'}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <div className='text-right'>
                        <p className='font-semibold'>
                          $
                          <AnimatedCounter
                            value={invoice.total}
                            format='currency'
                            decimals={2}
                          />
                        </p>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Recent Expenses</CardTitle>
              <Link to='/dashboard/expenses'>
                <Button variant='ghost' size='sm'>
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentExpenses.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-8 text-center'>
                <Receipt className='h-12 w-12 text-muted-foreground' />
                <p className='mt-2 text-sm text-muted-foreground'>
                  No expenses yet
                </p>
                <Link to='/dashboard/expenses/new'>
                  <Button size='sm' className='mt-4'>
                    <Plus className='mr-2 h-4 w-4' />
                    Add Expense
                  </Button>
                </Link>
              </div>
            ) : (
              <div className='space-y-3'>
                {recentExpenses.map((expense) => (
                  <Link
                    key={expense.id}
                    to={`/dashboard/expenses/${expense.id}`}
                    className='flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50'>
                    <div className='flex-1 min-w-0'>
                      <p className='font-medium text-wrap truncate line-clamp-1'>
                        {expense.description}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p
                        className={`font-semibold ${
                          expense.total >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                        $
                        <AnimatedCounter
                          value={expense.total}
                          format='currency'
                          decimals={2}
                        />
                      </p>
                      <p className='text-xs text-muted-foreground capitalize'>
                        {expense.category}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className='pt-0 md:pt-0 grid gap-2 md:grid-cols-3'>
          <Link to='/dashboard/invoices/new'>
            <Button className='w-full justify-start' variant='outline'>
              <Plus className='mr-2 h-4 w-4' />
              Create New Invoice
            </Button>
          </Link>
          <Link to='/dashboard/expenses/new'>
            <Button className='w-full justify-start' variant='outline'>
              <Plus className='mr-2 h-4 w-4' />
              Add New Expense
            </Button>
          </Link>
          <Link to='/dashboard/settings'>
            <Button className='w-full justify-start' variant='outline'>
              <Settings className='mr-2 h-4 w-4' />
              Settings
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
