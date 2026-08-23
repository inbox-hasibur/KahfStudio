# Graph Report - KahfStudio  (2026-08-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 557 nodes · 911 edges · 84 communities (39 shown, 45 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ad5df0d5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useSession
- app/page.tsx
- gemini-tts.ts
- devDependencies
- compilerOptions
- components.json
- newsActions.ts
- app/layout.tsx
- media/page.tsx
- checkAdminAuth
- dependencies
- main.py
- generate_existing_audio.ts
- iptv/route.ts
- discover/page.tsx
- personalize.ts
- migrate_db.ts
- LiveFeedSidebar.tsx
- bookmarks/route.ts
- api/weather/route.ts
- weather/weather/route.ts
- categories/page.tsx
- proxy.ts
- seed_users.ts
- admin/setup-admin/route.ts
- news/route.ts
- check_status.ts
- seed.ts
- checkout/route.ts
- verify/route.ts
- privacy/page.tsx
- bcryptjs
- cheerio
- class-variance-authority
- cloudinary
- clsx
- embla-carousel-react
- eslint.config.mjs
- framer-motion
- @google/generative-ai
- google-tts-api
- hls.js
- @hookform/resolvers
- howler
- inngest
- lucide-react
- next
- next.config.ts
- next-themes
- node-cron
- @paddle/paddle-js
- @paddle/paddle-node-sdk
- puppeteer
- radix-ui
- react
- react-dom
- react-hook-form
- react-markdown
- rss-parser
- streamifier
- @stripe/stripe-js
- @supabase/supabase-js
- tailwind-merge
- tailwindcss-animate
- zod
- postcss.config.mjs
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `useSession()` - 34 edges
2. `Button()` - 26 edges
3. `cn()` - 26 edges
4. `createClient()` - 22 edges
5. `Card()` - 18 edges
6. `CardContent()` - 17 edges
7. `CardDescription()` - 16 edges
8. `CardHeader()` - 16 edges
9. `CardTitle()` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `CheckoutSuccessContent()` --calls--> `createClient()`  [EXTRACTED]
  src/app/pricing/success/page.tsx → src/utils/supabase/client.ts
- `runGeminiAudioBatch()` --calls--> `generateSeamlessGeminiAudio()`  [EXTRACTED]
  scripts/generate_gemini_summary_audio.ts → src/lib/audio/gemini-tts.ts
- `runGeminiAudioBatch()` --calls--> `uploadAudioToCloudinary()`  [EXTRACTED]
  scripts/generate_gemini_summary_audio.ts → src/lib/audio/gemini-tts.ts
- `testTts()` --calls--> `generateSeamlessGeminiAudio()`  [EXTRACTED]
  scripts/test_gemini_tts.ts → src/lib/audio/gemini-tts.ts
- `testTts()` --calls--> `splitTextIntoSafeChunks()`  [EXTRACTED]
  scripts/test_gemini_tts.ts → src/lib/audio/gemini-tts.ts

## Import Cycles
- None detected.

## Communities (84 total, 45 thin omitted)

### Community 0 - "useSession"
Cohesion: 0.09
Nodes (44): AdminLayout(), AdminLibraryPage(), AdminDashboard(), AdminScrapingPage(), UserPaymentHistoryPage(), AdminUsersPage(), CheckoutContent(), LoginFormValues (+36 more)

### Community 1 - "app/page.tsx"
Cohesion: 0.06
Nodes (37): ArchivePage(), fetchArchive(), containerVariants, getPlaceholderImage(), itemVariants, cleanMarkdown(), DailySummaryPage(), containerVariants (+29 more)

### Community 2 - "gemini-tts.ts"
Cohesion: 0.09
Nodes (29): runGeminiAudioBatch(), sleep(), supabaseAdmin, translateToEnglish(), testTts(), runChecks(), dynamic, maxDuration (+21 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (37): dotenv, eslint, eslint-config-next, devDependencies, dotenv, eslint, eslint-config-next, tailwindcss (+29 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 5 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 6 - "newsActions.ts"
Cohesion: 0.22
Nodes (13): fetchLatestNews(), getMockNews(), getNewsById(), getNewsFromDB(), searchNews(), POST(), GET(), classifyNews() (+5 more)

### Community 7 - "app/layout.tsx"
Cohesion: 0.14
Nodes (9): hindSiliguri, metadata, notoSerif, CheckoutSuccessContent(), Footer(), GoogleTranslateLoader(), Navbar(), ThemeProvider() (+1 more)

### Community 8 - "media/page.tsx"
Cohesion: 0.14
Nodes (13): defaultChannels, IPTVChannel, MediaPage(), NewsVideo, realNewsVideos, toBengaliDigits(), HeadlineCard(), HeadlineCardProps (+5 more)

### Community 9 - "checkAdminAuth"
Cohesion: 0.26
Nodes (8): dynamic, GET(), dynamic, GET(), GET(), GET(), checkAdminAuth(), verifyAdminAuth

### Community 10 - "dependencies"
Cohesion: 0.22
Nodes (9): axios, duck-duck-scrape, dependencies, axios, duck-duck-scrape, stripe, @supabase/ssr, stripe (+1 more)

### Community 11 - "main.py"
Cohesion: 0.32
Nodes (7): BaseModel, get, generate_tts(), get_voices(), health(), TTSRequest, post

### Community 12 - "generate_existing_audio.ts"
Cohesion: 0.52
Nodes (6): generateAudioBuffer(), processAllNewsAudios(), sleep(), supabaseAdmin, translateToEnglish(), uploadAudioToCloudinary()

### Community 13 - "iptv/route.ts"
Cohesion: 0.33
Nodes (6): ChannelConfig, CHANNELS, dynamic, GET(), parser, resolveChannelMedia()

### Community 14 - "discover/page.tsx"
Cohesion: 0.29
Nodes (5): CATEGORIES, containerVariants, FEATURED_STORIES, itemVariants, TRENDING_TOPICS

### Community 16 - "migrate_db.ts"
Cohesion: 0.40
Nodes (5): destDb, migrateTable(), runMigration(), sourceDb, tablesToMigrate

### Community 17 - "LiveFeedSidebar.tsx"
Cohesion: 0.33
Nodes (4): containerVariants, itemVariants, LiveFeedSidebarProps, LiveUpdate

### Community 18 - "bookmarks/route.ts"
Cohesion: 0.70
Nodes (4): DELETE(), GET(), getSupabaseClient(), POST()

### Community 19 - "api/weather/route.ts"
Cohesion: 0.50
Nodes (4): BANGLA_DAYS, BANGLA_MONTHS, GET(), getTrafficInfo()

### Community 20 - "weather/weather/route.ts"
Cohesion: 0.50
Nodes (4): BANGLA_DAYS, BANGLA_MONTHS, GET(), getTrafficInfo()

### Community 21 - "categories/page.tsx"
Cohesion: 0.40
Nodes (3): CATEGORIES, containerVariants, itemVariants

### Community 22 - "proxy.ts"
Cohesion: 0.60
Nodes (3): config, proxy(), updateSession()

## Knowledge Gaps
- **186 isolated node(s):** `LoginFormValues`, `RegisterFormValues`, `InputProps`, `AudioPlayerProps`, `AudioTrack` (+181 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`, `bcryptjs`, `cheerio`, `class-variance-authority`, `cloudinary`, `clsx`, `embla-carousel-react`, `framer-motion`, `@google/generative-ai`, `google-tts-api`, `hls.js`, `@hookform/resolvers`, `howler`, `inngest`, `lucide-react`, `next`, `next-themes`, `node-cron`, `@paddle/paddle-js`, `@paddle/paddle-node-sdk`, `puppeteer`, `radix-ui`, `react`, `react-dom`, `react-hook-form`, `react-markdown`, `rss-parser`, `streamifier`, `@stripe/stripe-js`, `@supabase/supabase-js`, `tailwind-merge`, `tailwindcss-animate`, `zod`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `useSession()` connect `useSession` to `media/page.tsx`, `app/page.tsx`, `app/layout.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `LoginFormValues`, `RegisterFormValues`, `InputProps` to the rest of the system?**
  _186 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useSession` be split into smaller, more focused modules?**
  _Cohesion score 0.08933294152218631 - nodes in this community are weakly interconnected._
- **Should `app/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05795918367346939 - nodes in this community are weakly interconnected._
- **Should `gemini-tts.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09468599033816426 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._