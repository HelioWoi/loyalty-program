# Loyalty Program - Powered by MenuLove™

A beautiful, mobile-first loyalty program web application for coffee shops and restaurants.

## 🚀 Features

- **Simple 3-Screen Flow**: Landing → Signup → Success
- **Mobile-First Design**: Premium coffee shop aesthetic
- **Supabase Integration**: Real-time database with PostgreSQL
- **TypeScript**: Type-safe development
- **TailwindCSS**: Modern, responsive styling
- **Netlify Ready**: Optimized for deployment

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Netlify
- **Domain**: loyaltyprogram.com.au

## 📋 Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Netlify account (for deployment)

## 🔧 Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:
The `.env.local` file should already be configured with:
```
NEXT_PUBLIC_SUPABASE_URL=https://loyaltyprogram.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

3. **Set up Supabase database**:
Run the SQL script in `supabase-schema.sql` in your Supabase SQL Editor to create the `loyalty_program_members` table.

4. **Run development server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📊 Database Schema

The `loyalty_program_members` table includes:
- `id` (UUID, primary key)
- `full_name` (text)
- `email` (text, unique)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `source` (text, default: "MenuLove Powered")
- `brand` (text, default: "Loyalty Program")
- `venue` (text, default: "Loyalty Program Venue")
- `visits_count` (integer, default: 0)
- `reward_status` (text, default: "new")

## 🚀 Deployment

### Netlify

1. Push code to GitHub
2. Connect repository to Netlify
3. Add environment variable in Netlify dashboard:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

The `netlify.toml` file is already configured.

## 🎨 Customization

To customize for different brands, update:
- Brand name in components (`LandingPage.tsx`, `SignupForm.tsx`, `SuccessPage.tsx`)
- Default values in `app/page.tsx` (source, brand, venue)
- Color scheme in Tailwind classes (currently amber/orange theme)

## 📱 User Flow

1. **Landing Page**: "Tap & Earn" - introduces the loyalty program
2. **Signup Form**: Collects name and email with validation
3. **Success Page**: Confirms membership and welcomes user

## 🔐 Security

- Row Level Security (RLS) enabled on Supabase
- Environment variables for sensitive data
- Email validation on frontend
- Unique email constraint in database

## 📄 License

Powered by MenuLove™
