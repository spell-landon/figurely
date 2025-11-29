# Supabase Database Setup Guide

This document provides instructions for setting up the Supabase database for Figurely.

## Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Get your project's URL and anon key from Settings > API

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_verified_sender_email
```

## Database Setup

### Option 1: Run the Complete Schema (Recommended)

Run the complete schema file in your Supabase SQL Editor:

1. Go to your Supabase Dashboard > SQL Editor
2. Open the file `supabase/schema.sql` from this repository
3. Copy and paste the entire contents
4. Click "Run" to execute

This will create:
- All 9 tables (profiles, business_settings, clients, invoices, expenses, line_item_templates, mileage, household_settings, saved_views)
- All indexes for performance
- All Row Level Security (RLS) policies
- All triggers for automatic timestamps and profile creation
- Storage policies for receipts and logos buckets

### Option 2: Manual Setup

If you prefer to set up tables individually, the schema file is organized into sections:
1. Functions
2. Tables
3. Indexes
4. Row Level Security
5. Triggers
6. Storage Buckets
7. Storage Policies

## Storage Buckets

After running the schema, create two storage buckets in Supabase Dashboard > Storage:

1. **receipts** - For expense receipt images
   - Public: No (private)
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

2. **logos** - For business logos
   - Public: Yes
   - File size limit: 2MB
   - Allowed MIME types: image/jpeg, image/png, image/webp, image/svg+xml

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `business_settings` | Business info, logo, invoice defaults, email settings |
| `clients` | Client contact information and status |
| `invoices` | Invoice records with line items (JSONB), payment tracking |
| `expenses` | Expense tracking with tax deduction fields |
| `line_item_templates` | Reusable invoice line items |
| `mileage` | Business mileage tracking for tax deductions |
| `household_settings` | Home office expense percentages |
| `saved_views` | User-defined filter/sort presets for tables |

## Row Level Security

All tables use RLS with `auth.uid()` isolation:
- Users can only access their own data
- Exception: Invoices with `share_token` are publicly viewable (for invoice sharing)

## Testing the Setup

After running the schema:

1. Enable Email Auth in Authentication > Providers
2. Test user signup - profiles and business_settings should be created automatically
3. Test creating an invoice, expense, and client
4. Test file uploads to storage buckets

## Next Steps

- Configure email templates for authentication
- Set up custom SMTP (optional)
- Configure OAuth providers (optional)
- Set up database backups
- Monitor usage and performance in Supabase dashboard
