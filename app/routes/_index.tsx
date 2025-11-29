import type { MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';
import {
  Receipt,
  BarChart3,
  CheckCircle,
  Users,
  Car,
  Calculator,
  Mail,
  ArrowRight,
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

export const meta: MetaFunction = () => {
  return [
    { title: 'Figurely - Invoice & Expense Management Made Simple' },
    {
      name: 'description',
      content:
        'Professional invoicing, expense tracking, and financial reporting for freelancers and small businesses. Start free today.',
    },
  ];
};

export default function Index() {
  return (
    <div className='flex min-h-screen flex-col'>
      {/* Header */}
      <header className='sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md'>
        <div className='container mx-auto flex h-16 items-center justify-between px-6'>
          <Link to='/' className='flex items-center gap-2'>
            <img src='/favicon.svg' alt='Figurely' className='h-8 w-8' />
            <span className='text-xl font-bold'>Figurely</span>
          </Link>
          <nav className='hidden items-center gap-6 md:flex'>
            <a
              href='#features'
              className='text-sm font-medium text-neutral-700 transition-colors hover:text-primary'>
              Features
            </a>
            <a
              href='#pricing'
              className='text-sm font-medium text-neutral-700 transition-colors hover:text-primary'>
              Pricing
            </a>
            <a
              href='#contact'
              className='text-sm font-medium text-neutral-700 transition-colors hover:text-primary'>
              Contact
            </a>
          </nav>
          <div className='flex items-center gap-3'>
            <Link to='/login'>
              <Button variant='ghost' size='sm'>
                Login
              </Button>
            </Link>
            <Link to='/signup'>
              <Button size='sm'>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className='relative overflow-hidden px-8 py-20 sm:py-32 lg:py-40'>
        <div className='container mx-auto'>
          <div className='mx-auto max-w-5xl text-center'>
            <h1 className='mb-8 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl'>
              Invoice & expense tracking in{' '}
              <span className='bg-gradient-to-r from-neutral-700 to-neutral-500 bg-clip-text text-transparent dark:from-neutral-50 dark:to-neutral-200'>
                seconds, not hours
              </span>
            </h1>
            <p className='mx-auto mb-10 max-w-2xl text-lg text-neutral-600 sm:text-xl dark:text-neutral-400'>
              Create professional invoices, track expenses, and manage your
              finances effortlessly. Built for freelancers and small businesses
              who value their time.
            </p>
            <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
              <Link to='/signup'>
                <Button size='lg' className='h-12 px-8 text-base'>
                  Start for free
                </Button>
              </Link>
              <a href='#pricing'>
                <Button
                  size='lg'
                  variant='outline'
                  className='h-12 px-8 text-base'>
                  View pricing
                </Button>
              </a>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className='mx-auto mt-20 max-w-6xl'>
            <div className='overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950'>
              <div className='aspect-video bg-gradient-to-br from-neutral-50 to-neutral-100 p-12 dark:from-neutral-900 dark:to-neutral-950'>
                <div className='flex h-full items-center justify-center'>
                  <div className='text-center'>
                    <BarChart3 className='mx-auto mb-6 h-20 w-20 text-neutral-300 dark:text-neutral-700' />
                    <p className='text-base text-neutral-400 dark:text-neutral-600'>
                      Dashboard Preview
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id='features'
        className='px-8 py-20 sm:py-32 dark:bg-neutral-950'>
        <div className='container mx-auto'>
          <div className='mx-auto mb-20 max-w-3xl text-center'>
            <h2 className='mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl dark:text-white'>
              Financial management made easy
            </h2>
            <p className='text-lg text-neutral-600 sm:text-xl dark:text-neutral-400'>
              Everything you need to run your business finances professionally,
              without the complexity.
            </p>
          </div>

          <div className='grid gap-8 md:grid-cols-2 lg:grid-cols-4'>
            <div className='space-y-4'>
              <div className='inline-flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-900'>
                <FileText className='h-6 w-6 text-neutral-900 dark:text-neutral-100' />
              </div>
              <h3 className='text-xl font-semibold dark:text-white'>
                One-click invoicing
              </h3>
              <p className='text-neutral-600 dark:text-neutral-400'>
                Create professional invoices in seconds. Pre-fill with client
                data and templates for instant billing.
              </p>
            </div>

            <div className='space-y-4'>
              <div className='inline-flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-900'>
                <Receipt className='h-6 w-6 text-neutral-900 dark:text-neutral-100' />
              </div>
              <h3 className='text-xl font-semibold dark:text-white'>
                Smart expense tracking
              </h3>
              <p className='text-neutral-600 dark:text-neutral-400'>
                Upload receipts and categorize expenses automatically. Never
                lose track of business spending again.
              </p>
            </div>

            <div className='space-y-4'>
              <div className='inline-flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-900'>
                <BarChart3 className='h-6 w-6 text-neutral-900 dark:text-neutral-100' />
              </div>
              <h3 className='text-xl font-semibold dark:text-white'>
                Real-time reporting
              </h3>
              <p className='text-neutral-600 dark:text-neutral-400'>
                Get instant insights into your finances. Generate tax reports
                and export to PDF with one click.
              </p>
            </div>

            <div className='space-y-4'>
              <div className='inline-flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-900'>
                <Calculator className='h-6 w-6 text-neutral-900 dark:text-neutral-100' />
              </div>
              <h3 className='text-xl font-semibold dark:text-white'>
                Tax-ready exports
              </h3>
              <p className='text-neutral-600 dark:text-neutral-400'>
                Organized reports ready for your accountant. Track deductions
                and maximize your tax savings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id='pricing' className='px-8 py-20 sm:py-32 dark:bg-black'>
        <div className='container mx-auto'>
          <div className='mx-auto mb-20 max-w-3xl text-center'>
            <h2 className='mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl dark:text-white'>
              Pricing that scales with you
            </h2>
            <p className='text-lg text-neutral-600 sm:text-xl dark:text-neutral-400'>
              Start free and upgrade as you grow. No hidden fees or surprises.
            </p>
          </div>

          <div className='mx-auto grid max-w-6xl gap-8 lg:grid-cols-3'>
            {/* Free Plan */}
            <div className='rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900 flex flex-col'>
              <h3 className='text-2xl font-bold dark:text-white'>Free</h3>
              <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
                For getting started
              </p>
              <div className='mt-6'>
                <span className='text-5xl font-bold dark:text-white'>$0</span>
                <span className='text-neutral-600 dark:text-neutral-400'>
                  /month
                </span>
              </div>
              <ul className='mt-8 space-y-4 mb-auto'>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  3 invoices per month
                </li>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  10 expenses per month
                </li>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  1 client
                </li>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  Basic reports
                </li>
              </ul>
              <Link to='/signup' className='mt-8 block'>
                <Button variant='outline' className='w-full' size='lg'>
                  Get started free
                </Button>
              </Link>
            </div>

            {/* Starter Plan - Featured */}
            <div className='relative rounded-2xl border-2 border-neutral-900 bg-white p-8 dark:border-neutral-100 dark:bg-neutral-900 flex flex-col'>
              <div className='absolute -top-4 left-1/2 -translate-x-1/2'>
                <span className='rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-semibold text-white dark:bg-neutral-100 dark:text-black'>
                  Popular
                </span>
              </div>
              <h3 className='text-2xl font-bold dark:text-white'>Starter</h3>
              <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
                For solo freelancers
              </p>
              <div className='mt-6'>
                <span className='text-5xl font-bold dark:text-white'>$12</span>
                <span className='text-neutral-600 dark:text-neutral-400'>
                  /month
                </span>
              </div>
              <ul className='mt-8 space-y-4 mb-auto'>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  Unlimited invoices
                </li>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  Unlimited expenses
                </li>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  25 clients
                </li>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  PDF exports
                </li>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  Email support
                </li>
              </ul>
              <Link to='/signup' className='mt-8 block'>
                <Button className='w-full' size='lg'>
                  Get started
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className='rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900 flex flex-col'>
              <h3 className='text-2xl font-bold dark:text-white'>Pro</h3>
              <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
                For growing businesses
              </p>
              <div className='mt-6'>
                <span className='text-5xl font-bold dark:text-white'>$29</span>
                <span className='text-neutral-600 dark:text-neutral-400'>
                  /month
                </span>
              </div>
              <ul className='mt-8 space-y-4 mb-auto'>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  Everything in Starter
                </li>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  Unlimited clients
                </li>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  Tax reports & deductions
                </li>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  Mileage tracking
                </li>
                <li className='flex items-center gap-3 text-neutral-600 dark:text-neutral-400'>
                  <CheckCircle className='h-5 w-5 flex-shrink-0 text-neutral-900 dark:text-neutral-100' />
                  Priority support
                </li>
              </ul>
              <Link to='/signup' className='mt-8 block'>
                <Button variant='outline' className='w-full' size='lg'>
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='px-8 py-20 sm:py-32 dark:bg-neutral-950'>
        <div className='container mx-auto'>
          <div className='mx-auto max-w-4xl text-center'>
            <h2 className='mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl dark:text-white'>
              Ready to simplify your finances?
            </h2>
            <p className='mb-10 text-lg text-neutral-600 sm:text-xl dark:text-neutral-400'>
              Join freelancers and small businesses who save hours every week on
              invoicing and expense tracking. Start free today—no credit card
              required.
            </p>
            <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
              <Link to='/signup'>
                <Button size='lg' className='h-12 px-8 text-base'>
                  Start for free
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        id='contact'
        className='relative overflow-hidden border-t px-8 py-20 dark:border-neutral-800 dark:bg-black'>
        {/* Large background text */}
        <div className='pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.05]'>
          <span className='text-[20rem] font-bold leading-none'>Figurely</span>
        </div>

        <div className='container relative mx-auto'>
          <div className='grid gap-12 md:grid-cols-3'>
            {/* Pages */}
            <div>
              <h3 className='mb-6 text-sm font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-100'>
                Product
              </h3>
              <ul className='space-y-3'>
                <li>
                  <a
                    href='#features'
                    className='text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'>
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href='#pricing'
                    className='text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'>
                    Pricing
                  </a>
                </li>
                <li>
                  <Link
                    to='/login'
                    className='text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'>
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    to='/signup'
                    className='text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'>
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className='mb-6 text-sm font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-100'>
                Legal
              </h3>
              <ul className='space-y-3'>
                <li>
                  <span className='text-neutral-400 dark:text-neutral-600'>
                    Privacy Policy{' '}
                    <span className='text-xs'>(Coming soon)</span>
                  </span>
                </li>
                <li>
                  <span className='text-neutral-400 dark:text-neutral-600'>
                    Terms of Service{' '}
                    <span className='text-xs'>(Coming soon)</span>
                  </span>
                </li>
              </ul>
            </div>

            {/* Register */}
            <div>
              <h3 className='mb-6 text-sm font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-100'>
                Get Started
              </h3>
              <p className='mb-4 text-sm text-neutral-600 dark:text-neutral-400'>
                Start managing your invoices and expenses today.
              </p>
              <Link to='/signup'>
                <Button className='w-full'>Create free account</Button>
              </Link>
            </div>
          </div>

          <div className='mt-16 border-t pt-8 text-center dark:border-neutral-800'>
            <p className='text-sm text-neutral-600 dark:text-neutral-400'>
              © {new Date().getFullYear()} Figurely. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
