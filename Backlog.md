# KahfStudio Implementation Backlog

This backlog outlines the step-by-step modular implementation plan to migrate features from the `Prototype_khobor-ai` folder to the main `src` directory of the `KahfStudio` project.

> **Note**: The `AudioPlayer` and `VideoPlayer` components are explicitly excluded from this migration and backlog.

## Module 1: Core Layout, Theming & Authentication
**Goal**: Establish the fundamental application structure, UI theming, navigation, and user identity.
- **Dependencies & Setup**: Configure Tailwind CSS, shadcn/ui components (if used), `next-themes` for dark/light mode, and Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`).
- **Components**: 
  - `theme-provider.tsx` (Dark/Light mode support)
  - `Navbar.tsx` (Main navigation header)
- **Pages / Routes**:
  - `app/login/page.tsx`
  - `app/register/page.tsx`
  - `app/profile/page.tsx` (User profile and settings)
  - `app/admin/page.tsx` (Basic 1-page admin profile)
- **Library & Utils**:
  - `lib/auth-client.ts`
  - `lib/supabase` setup
  - Core UI utilities (`lib/utils.ts`)

## Module 2: News Feed & Core Content
**Goal**: Bring in the main content presentation, including live feeds, headline sliders, and breaking news tickers.
- **Components**:
  - `MainFeed.tsx`
  - `NewsCard.tsx`
  - `HeadlineSlider.tsx`
  - `HeadlineCard.tsx`
  - `BreakingNewsTicker.tsx`
  - `LiveFeedSidebar.tsx`
- **Pages / Routes**:
  - `app/page.tsx` (Integrating MainFeed, sliders, sidebar)
  - `app/news/page.tsx`
  - `app/alerts/page.tsx`
  - `app/archive/page.tsx`
- **Library & Actions**:
  - `actions/newsActions.ts`
  - `lib/scraper.ts` 
  - `lib/ai.ts` 

## Module 3: Admin Panel & Secondary Features
**Goal**: Add management features, secondary pages, and finalize the application scope.
- **Components**: 
  - Admin specific components or layouts.
- **Pages / Routes**:
  - `app/admin/layout.tsx` & `app/admin/page.tsx`
  - `app/media/page.tsx`
  - `app/models/page.tsx`
  - `app/pricing/page.tsx`
  - `app/privacy/page.tsx`
- **Library**:
  - `lib/personalize.ts` 
  - Remaining utility scripts (`musicRemover.ts`, etc., excluding audio/video players).
