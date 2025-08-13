# Check-In App

A modern, mobile-first wellness check-in application built with Next.js, TypeScript, and Supabase. Users can authenticate, capture daily photos, track their wellness journey, and customize their experience with personalized backgrounds.

![Check-In App Preview](./public/preview.png)

## ✨ Features

- **📱 Mobile-First Design** - Optimized for mobile devices with responsive design
- **📸 Camera Integration** - Native camera capture for daily check-ins
- **🔐 Secure Authentication** - Email/password authentication with Supabase Auth
- **📊 Check-In History** - View and track your wellness journey over time
- **🎨 Custom Backgrounds** - Personalize your dashboard with custom background images
- **⏰ Duplicate Prevention** - Smart duplicate check-in prevention within configurable time windows
- **🌙 Dark Mode Support** - Beautiful dark and light theme support
- **💾 Offline-Ready** - Progressive Web App capabilities for offline usage

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase), Drizzle ORM
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **UI Components**: Radix UI, Lucide Icons
- **Package Manager**: pnpm

## 🚀 Quick Start

### Prerequisites

- Node.js 22.x or higher
- pnpm 9.x or higher
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd checkin-app
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Database (for Drizzle ORM)
   DATABASE_URL=your_supabase_database_url
   ```

4. **Set up Supabase**

   Run the SQL commands from `docs/database-schema.md` in your Supabase SQL editor to create the necessary tables and policies.

5. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

7. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
checkin-app/
├── docs/                    # Documentation files
│   ├── api.md              # API documentation
│   ├── authentication.md   # Auth flow documentation
│   ├── check-in-flow.md    # Check-in process documentation
│   ├── database-schema.md  # Database structure
│   └── deployment.md       # Deployment guide
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/           # API routes
│   │   ├── auth/          # Authentication pages
│   │   ├── checkin/       # Check-in page
│   │   ├── dashboard/     # Dashboard page
│   │   └── history/       # History pages
│   ├── components/        # React components
│   ├── config/           # Configuration files
│   ├── contexts/         # React contexts
│   ├── db/              # Database schema (Drizzle)
│   └── lib/             # Utility libraries
├── public/              # Static assets
└── drizzle/            # Database migrations
```

## 🔧 Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio

## 📖 Documentation

Detailed documentation is available in the `docs/` folder:

- **[API Documentation](./docs/api.md)** - Complete API reference
- **[Authentication Flow](./docs/authentication.md)** - User authentication system
- **[Check-In Process](./docs/check-in-flow.md)** - Photo capture and processing
- **[Database Schema](./docs/database-schema.md)** - Database structure and relationships
- **[Deployment Guide](./docs/deployment.md)** - Production deployment instructions

## 🌟 Key Features Explained

### Check-In Flow
1. User captures a photo using the device camera
2. Photo is uploaded to Supabase Storage with signed URLs
3. Check-in record is created with photo URL and metadata
4. Duplicate prevention ensures only one check-in per time window

### Authentication
- Secure email/password authentication via Supabase Auth
- Server-side session management with cookies
- Automatic profile creation and synchronization

### Data Storage
- PostgreSQL database with Row Level Security (RLS)
- Supabase Storage for photo and background image files
- Drizzle ORM for type-safe database operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.com/) for backend-as-a-service
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Framer Motion](https://www.framer.com/motion/) for smooth animations
