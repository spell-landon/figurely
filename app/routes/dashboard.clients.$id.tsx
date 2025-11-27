import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { ArrowLeft, Edit, Mail, Phone, Globe, MapPin, FileText, Building2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { requireAuth } from '~/lib/auth.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `${data?.client?.name || 'Client'} - Figurely` },
    { name: 'description', content: 'View client details' },
  ];
};

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
    lead: { label: 'Lead', variant: 'secondary' },
    prospect: { label: 'Prospect', variant: 'outline' },
    active: { label: 'Active', variant: 'success' },
    on_hold: { label: 'On Hold', variant: 'secondary' },
    inactive: { label: 'Inactive', variant: 'destructive' },
    archived: { label: 'Archived', variant: 'outline' },
  };

  const config = statusConfig[status] || { label: 'Active', variant: 'default' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session, supabase, headers } = await requireAuth(request);

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id!)
    .eq('user_id', session.user.id)
    .single();

  if (error || !client) {
    throw new Response('Client not found', { status: 404 });
  }

  // Fetch related invoices count
  const { count: invoicesCount } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .or(`bill_to_name.eq.${client.name},bill_to_email.eq.${client.email}`);

  return json(
    {
      client,
      invoicesCount: invoicesCount || 0,
    },
    { headers }
  );
}

export default function ClientDetail() {
  const { client, invoicesCount } = useLoaderData<typeof loader>();

  return (
    <div className='container mx-auto space-y-4 p-4 md:space-y-6 md:p-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4'>
        <div className='flex items-center gap-3 md:gap-4'>
          <Link to='/dashboard/clients'>
            <Button variant='ghost' size='icon'>
              <ArrowLeft className='h-5 w-5' />
            </Button>
          </Link>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl font-bold md:text-3xl'>{client.name}</h1>
              {getStatusBadge(client.status)}
            </div>
            <p className='text-xs text-muted-foreground md:text-base'>
              Client Details
            </p>
          </div>
        </div>
        <Link to={`/dashboard/clients/${client.id}/edit`}>
          <Button>
            <Edit className='mr-2 h-4 w-4' />
            Edit Client
          </Button>
        </Link>
      </div>

      <div className='grid gap-4 md:gap-6 md:grid-cols-3'>
        {/* Main Information */}
        <div className='space-y-4 md:col-span-2 md:space-y-6'>
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Building2 className='h-5 w-5' />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='grid gap-3 md:grid-cols-2'>
                <div>
                  <p className='text-xs font-medium text-muted-foreground md:text-sm'>
                    Client Name
                  </p>
                  <p className='text-sm font-semibold md:text-base'>{client.name}</p>
                </div>

                {client.contact_person && (
                  <div>
                    <p className='text-xs font-medium text-muted-foreground md:text-sm'>
                      Contact Person
                    </p>
                    <p className='text-sm md:text-base'>{client.contact_person}</p>
                  </div>
                )}

                {client.tax_id && (
                  <div>
                    <p className='text-xs font-medium text-muted-foreground md:text-sm'>
                      Tax ID
                    </p>
                    <p className='text-sm md:text-base'>{client.tax_id}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Phone className='h-5 w-5' />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {client.email && (
                <div className='flex items-start gap-2'>
                  <Mail className='mt-0.5 h-4 w-4 text-muted-foreground' />
                  <div className='flex-1'>
                    <p className='text-xs font-medium text-muted-foreground md:text-sm'>
                      Email
                    </p>
                    <a
                      href={`mailto:${client.email}`}
                      className='text-sm text-primary hover:underline md:text-base'>
                      {client.email}
                    </a>
                  </div>
                </div>
              )}

              {client.phone && (
                <div className='flex items-start gap-2'>
                  <Phone className='mt-0.5 h-4 w-4 text-muted-foreground' />
                  <div className='flex-1'>
                    <p className='text-xs font-medium text-muted-foreground md:text-sm'>
                      Phone
                    </p>
                    <a
                      href={`tel:${client.phone}`}
                      className='text-sm text-primary hover:underline md:text-base'>
                      {client.phone}
                    </a>
                  </div>
                </div>
              )}

              {client.mobile && (
                <div className='flex items-start gap-2'>
                  <Phone className='mt-0.5 h-4 w-4 text-muted-foreground' />
                  <div className='flex-1'>
                    <p className='text-xs font-medium text-muted-foreground md:text-sm'>
                      Mobile
                    </p>
                    <a
                      href={`tel:${client.mobile}`}
                      className='text-sm text-primary hover:underline md:text-base'>
                      {client.mobile}
                    </a>
                  </div>
                </div>
              )}

              {client.fax && (
                <div className='flex items-start gap-2'>
                  <Phone className='mt-0.5 h-4 w-4 text-muted-foreground' />
                  <div className='flex-1'>
                    <p className='text-xs font-medium text-muted-foreground md:text-sm'>
                      Fax
                    </p>
                    <p className='text-sm md:text-base'>{client.fax}</p>
                  </div>
                </div>
              )}

              {client.website && (
                <div className='flex items-start gap-2'>
                  <Globe className='mt-0.5 h-4 w-4 text-muted-foreground' />
                  <div className='flex-1'>
                    <p className='text-xs font-medium text-muted-foreground md:text-sm'>
                      Website
                    </p>
                    <a
                      href={client.website}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-sm text-primary hover:underline md:text-base'>
                      {client.website}
                    </a>
                  </div>
                </div>
              )}

              {!client.email && !client.phone && !client.mobile && !client.fax && !client.website && (
                <p className='text-sm text-muted-foreground'>
                  No contact information available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Address */}
          {(client.address || client.city || client.state || client.postal_code || client.country) && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <MapPin className='h-5 w-5' />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-1 text-sm md:text-base'>
                  {client.address && <p>{client.address}</p>}
                  <p>
                    {[client.city, client.state].filter(Boolean).join(', ')}
                    {client.postal_code && ` ${client.postal_code}`}
                  </p>
                  {client.country && <p>{client.country}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <FileText className='h-5 w-5' />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='whitespace-pre-wrap text-sm md:text-base'>
                  {client.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className='space-y-4 md:space-y-6'>
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base md:text-lg'>Activity</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <p className='text-xs font-medium text-muted-foreground md:text-sm'>
                  Total Invoices
                </p>
                <p className='text-xl font-bold md:text-2xl'>{invoicesCount}</p>
              </div>

              <div className='pt-3 border-t'>
                <Link to={`/dashboard/invoices?q=${encodeURIComponent(client.name)}`}>
                  <Button variant='outline' className='w-full'>
                    View Invoices
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base md:text-lg'>Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-xs md:text-sm'>
              <div>
                <p className='font-medium text-muted-foreground'>Created</p>
                <p>{new Date(client.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className='font-medium text-muted-foreground'>Last Updated</p>
                <p>{new Date(client.updated_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
