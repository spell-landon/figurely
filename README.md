# 💼 Figurely

<div align="center">

**A modern, full-stack invoice and expense management application**

Built with Remix, TypeScript, Tailwind CSS, and Supabase

[Demo](#demo) • [Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Deployment](#deployment)

</div>

---

## 📸 Demo

> **Note**: Add screenshots or a demo link here after deployment

**Key Pages:**
- 🏠 Dashboard with real-time stats
- 📄 Invoice creation and management
- 💰 Expense tracking with receipt upload
- 📊 Reports and analytics
- ⚙️ Settings and business profile

---

## ✨ Features

### 📄 Invoice Management
- ✅ Create, edit, and delete professional invoices
- ✅ Customizable invoice templates with line items
- ✅ Multiple status tracking (Draft, Sent, Paid, Overdue)
- ✅ PDF generation for download and printing
- ✅ Email invoices directly to clients via Resend
- ✅ Shareable invoice links for clients (no login required)
- ✅ Auto-calculated totals and line items

### 💰 Expense Tracking
- ✅ Track business expenses with categories
- ✅ Upload and attach receipt images to expenses
- ✅ Multiple expense categories (office supplies, travel, utilities, etc.)
- ✅ Expense list with filtering and search

### 📊 Reports & Analytics
- ✅ Real-time dashboard with income, expenses, and profit metrics
- ✅ Monthly breakdown of income vs expenses
- ✅ Invoice status breakdown (paid, sent, draft, overdue)
- ✅ Expense category analysis
- ✅ Date range filtering for custom reports
- ✅ Export reports to CSV

### 🎨 Modern UI/UX
- ✅ Fully responsive design (mobile, tablet, desktop)
- ✅ Collapsible mobile navigation menu
- ✅ Dark-mode ready design system
- ✅ Beautiful UI components from shadcn/ui and Aceternity UI
- ✅ Smooth animations and transitions

### 🔐 Security & Authentication
- ✅ Secure user authentication via Supabase Auth
- ✅ Row Level Security (RLS) for data isolation
- ✅ Protected routes and session management
- ✅ Secure file storage for receipts

### ⚙️ Settings & Customization
- ✅ Business profile management
- ✅ Default invoice notes
- ✅ Line item templates for quick invoice creation
- ✅ User account settings

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | [Remix v2](https://remix.run/) (React Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) + [Aceternity UI](https://ui.aceternity.com/) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **Storage** | Supabase Storage (receipts, logos) |
| **PDF Generation** | [@react-pdf/renderer](https://react-pdf.org/) |
| **Email** | [Resend](https://resend.com/) |
| **Deployment** | [Vercel](https://vercel.com/) |
| **Dev Tools** | Vite, ESLint, Prettier |

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following:

- **Node.js 18+** and npm installed
- A **[Supabase](https://supabase.com/)** account and project
- A **[Resend](https://resend.com/)** account for email functionality

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/figurely.git
cd figurely
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Resend Email Configuration
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Where to find these values:**
- **Supabase keys**: Dashboard → Settings → API
- **Resend API key**: Dashboard → API Keys
- **Resend email**: Must be a verified domain or use `onboarding@resend.dev` for testing

### 4️⃣ Database Setup

Follow the comprehensive instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to:

1. ✅ Create database tables (invoices, expenses, line_item_templates, business_settings)
2. ✅ Set up Row Level Security (RLS) policies
3. ✅ Create storage buckets for receipts and logos
4. ✅ Enable authentication providers
5. ✅ Apply database migrations

**Quick setup:**
```sql
-- Run the SQL files in this order:
1. supabase-migrations/001_initial_schema.sql (or similar)
2. supabase_line_item_templates.sql (for templates)
```

### 5️⃣ Run Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:5173**

### 6️⃣ Build for Production

Test the production build:

```bash
npm run build
npm run start
```

---

## 📦 Project Structure

```
figurely/
├── app/
│   ├── components/              # React components
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/                    # Utility functions
│   │   ├── auth.server.ts      # Authentication utilities
│   │   ├── database.types.ts   # Supabase types
│   │   ├── email.server.ts     # Email sending logic
│   │   ├── supabase.client.ts  # Browser Supabase client
│   │   ├── supabase.server.ts  # Server Supabase client
│   │   └── utils.ts            # Helper functions
│   ├── routes/                 # Application routes (file-based routing)
│   │   ├── _index.tsx          # Landing page
│   │   ├── login.tsx           # Login page
│   │   ├── signup.tsx          # Signup page
│   │   ├── dashboard.tsx       # Dashboard layout
│   │   ├── dashboard._index.tsx           # Dashboard home
│   │   ├── dashboard.invoices._index.tsx  # Invoice list
│   │   ├── dashboard.invoices.new.tsx     # Create invoice
│   │   ├── dashboard.invoices.$id.tsx     # View invoice
│   │   ├── dashboard.invoices.$id_.edit.tsx # Edit invoice
│   │   ├── dashboard.invoices.$id.pdf.tsx # Invoice PDF
│   │   ├── dashboard.expenses._index.tsx  # Expense list
│   │   ├── dashboard.expenses.new.tsx     # Create expense
│   │   ├── dashboard.expenses.$id.tsx     # View expense
│   │   ├── dashboard.reports.tsx          # Reports page
│   │   ├── dashboard.settings.tsx         # Settings page
│   │   ├── dashboard.templates.tsx        # Line item templates
│   │   └── invoice.$id.tsx               # Public invoice view
│   ├── root.tsx                # Root layout
│   └── tailwind.css            # Global styles
├── public/                     # Static assets
├── supabase-migrations/        # Database migration files
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── components.json            # shadcn/ui configuration
├── package.json               # Dependencies and scripts
├── postcss.config.js          # PostCSS configuration
├── SUPABASE_SETUP.md         # Database setup guide
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite configuration
```

---

## 🌐 Deployment

### Deploy to Vercel (Recommended)

Vercel provides the best experience for deploying Remix applications.

#### Option 1: Deploy via Vercel Dashboard

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com/)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Remix configuration

3. **Configure Environment Variables**

   Add these in the Vercel dashboard (Settings → Environment Variables):
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   RESEND_API_KEY=your_resend_key
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `your-project.vercel.app`

#### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow the prompts to configure
# Then add environment variables via the dashboard
```

### Post-Deployment Checklist

- ✅ Add environment variables in Vercel dashboard
- ✅ Verify Supabase URL is accessible from Vercel
- ✅ Test authentication flow
- ✅ Verify file uploads work (receipts, logos)
- ✅ Test email sending functionality
- ✅ Add custom domain (optional)
- ✅ Enable Vercel Analytics (optional)

### Important Notes

- **Environment Variables**: Never commit `.env` to Git. Use `.env.example` as a template.
- **Supabase RLS**: Ensure Row Level Security policies are enabled before going live.
- **CORS**: If you encounter CORS issues, add your Vercel domain to Supabase's allowed domains.
- **Email Domain**: For production, verify your domain with Resend for branded emails.

---

## 🔧 Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at localhost:5173 |
| `npm run build` | Build for production |
| `npm run start` | Start production server locally |
| `npm run typecheck` | Run TypeScript type checking |

---

## 🗺️ Feature Roadmap

### ✅ Completed (v1.0)
- [x] User authentication (login/signup)
- [x] Invoice CRUD operations
- [x] Expense CRUD operations
- [x] PDF generation and download
- [x] Email invoice functionality
- [x] Public shareable invoice links
- [x] Dashboard with stats
- [x] Reports and analytics
- [x] Settings page
- [x] Line item templates
- [x] Receipt upload
- [x] Mobile responsive design
- [x] Vercel deployment ready

### 🚧 Future Enhancements (v2.0)
- [ ] Recurring invoices
- [ ] Payment integration (Stripe/PayPal)
- [ ] Client management (CRM features)
- [ ] Multi-currency support
- [ ] Tax calculations
- [ ] Invoice reminders and notifications
- [ ] Advanced reporting (charts/graphs)
- [ ] Team collaboration features
- [ ] API for integrations
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

This is a personal project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible UI components
- **[Aceternity UI](https://ui.aceternity.com/)** - Stunning UI components and animations
- **[Supabase](https://supabase.com/)** - Backend as a Service
- **[Remix](https://remix.run/)** - Full-stack web framework
- **[Lucide Icons](https://lucide.dev/)** - Icon library
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework

---

## 📧 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/your-username/figurely/issues)
- **Questions**: Open a discussion on GitHub
- **Email**: your-email@example.com

---

<div align="center">

**Built with ❤️ using modern web technologies**

⭐ Star this repo if you find it useful!

</div>
