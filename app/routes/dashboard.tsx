import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, Outlet, useLoaderData, useNavigation } from '@remix-run/react';
import {
  FileText,
  Receipt,
  BarChart3,
  Settings,
  User,
  Layers,
  Car,
  Home,
  Calculator,
  LogOut,
  Users,
  Loader2,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { requireAuth } from '~/lib/auth.server';
import React, { useState } from 'react';
import { Sidebar, SidebarBody, SidebarLink, Logo } from '~/components/sidebar';

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, headers } = await requireAuth(request);

  return json(
    {
      user: session.user,
    },
    { headers }
  );
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isNavigating = navigation.state === 'loading';

  // Disable animations until after hydration to prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const primaryLinks = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: (
        <Home className='h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200' />
      ),
    },
    {
      label: 'Invoices',
      href: '/dashboard/invoices',
      icon: (
        <FileText className='h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200' />
      ),
    },
    {
      label: 'Expenses',
      href: '/dashboard/expenses',
      icon: (
        <Receipt className='h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200' />
      ),
    },
    {
      label: 'Mileage',
      href: '/dashboard/mileage',
      icon: (
        <Car className='h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200' />
      ),
    },
    {
      label: 'Clients',
      href: '/dashboard/clients',
      icon: (
        <Users className='h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200' />
      ),
    },
    {
      label: 'Line Item Templates',
      href: '/dashboard/templates',
      icon: (
        <Layers className='h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200' />
      ),
    },
    {
      label: 'Reports',
      href: '/dashboard/reports',
      icon: (
        <BarChart3 className='h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200' />
      ),
    },
    {
      label: 'Tax Report',
      href: '/dashboard/tax-report',
      icon: (
        <Calculator className='h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200' />
      ),
    },
    {
      label: 'Household',
      href: '/dashboard/household',
      icon: (
        <Home className='h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200' />
      ),
    },
  ];

  const secondaryLinks = [
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: (
        <Settings className='h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200' />
      ),
    },
  ];

  return (
    <div className='flex h-[100dvh] w-full flex-col overflow-hidden bg-gray-100 md:h-screen md:flex-row dark:bg-neutral-800'>
      <Sidebar open={open} setOpen={setOpen} animate={mounted}>
        <SidebarBody className='justify-between gap-10'>
          <div className='flex flex-1 flex-col overflow-x-hidden overflow-y-auto'>
            <Logo />
            <div className='mt-8 flex flex-col gap-2'>
              {primaryLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
            <div className='my-4'>
              <div className='h-px w-full bg-neutral-200 dark:bg-neutral-700'></div>
            </div>
            <div className='flex flex-col gap-2'>
              {secondaryLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <div className='mb-2 flex items-center gap-2 rounded-md px-2 py-2'>
              <User className='h-5 w-5 flex-shrink-0 text-neutral-700 dark:text-neutral-200' />
              {open && (
                <span className='text-sm text-neutral-700 truncate dark:text-neutral-200'>
                  {user.email}
                </span>
              )}
            </div>
            <Form method='post' action='/logout'>
              <Button
                variant='outline'
                size='sm'
                type='submit'
                className='w-full justify-start gap-2'>
                <LogOut className='h-4 w-4' />
                {open && <span>Logout</span>}
              </Button>
            </Form>
          </div>
        </SidebarBody>
      </Sidebar>
      <main className='relative flex-1 overflow-auto bg-gray-50 dark:bg-neutral-900'>
        {isNavigating && (
          <div className='absolute inset-0 z-10 flex items-center justify-center bg-gray-50/80 dark:bg-neutral-900/80'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
