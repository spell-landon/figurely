import { cn } from '~/lib/utils';
import { Link, type LinkProps } from '@remix-run/react';
import React, { useState, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ChevronLeft, FileText } from 'lucide-react';

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<'div'>)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <>
      <motion.div
        className={cn(
          'group/sidebar relative hidden h-full flex-shrink-0 border-r bg-white px-4 py-4 md:flex md:flex-col dark:bg-neutral-900 dark:border-neutral-700',
          className
        )}
        initial={false}
        animate={{
          width: animate ? (open ? '300px' : '70px') : '300px',
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}>
        {children as React.ReactNode}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          'flex h-16 w-full flex-row items-center justify-between border-b bg-white px-4 md:hidden dark:bg-neutral-900 dark:border-neutral-700'
        )}
        {...props}>
        <div className='flex items-center gap-2'>
          <LogoIcon />
        </div>
        <Menu
          className='h-6 w-6 text-neutral-800 dark:text-neutral-200'
          onClick={() => setOpen(!open)}
        />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: 'easeInOut',
            }}
            className={cn(
              'fixed inset-0 z-[100] flex h-full w-full flex-col justify-between bg-white p-10 md:hidden dark:bg-neutral-900',
              className
            )}>
            <div
              className='absolute top-4 right-4 z-50 text-neutral-800 dark:text-neutral-200'
              onClick={() => setOpen(!open)}>
              <X className='h-6 w-6' />
            </div>
            {children as React.ReactNode}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  props?: LinkProps;
}) => {
  const { open, animate, setOpen } = useSidebar();
  return (
    <Link
      to={link.href}
      className={cn(
        'group/sidebar flex items-center justify-start gap-2 rounded-md px-2 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800',
        className
      )}
      onClick={() => {
        // Close mobile menu when link is clicked
        if (window.innerWidth < 768) {
          setOpen(false);
        }
      }}
      {...props}>
      {link.icon}

      <motion.span
        initial={false}
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className='!m-0 inline-block !p-0 text-sm whitespace-pre text-neutral-700 transition duration-150 dark:text-neutral-200'>
        {link.label}
      </motion.span>
    </Link>
  );
};

export const Logo = () => {
  const { open, animate } = useSidebar();

  return (
    <Link
      to='/dashboard'
      className='relative z-20 flex items-center gap-2 py-1 text-sm font-normal text-black'>
      <FileText className='h-6 w-6 flex-shrink-0 text-primary' />
      <motion.span
        initial={false}
        animate={{
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className='overflow-hidden whitespace-nowrap font-serif font-bold text-xl text-black dark:text-white'>
        Ledgerly
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      to='/dashboard'
      className='relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black'>
      <FileText className='h-6 w-6 flex-shrink-0 text-primary' />
      <span className='font-bold text-xl md:hidden dark:text-white'>
        Ledgerly
      </span>
    </Link>
  );
};
