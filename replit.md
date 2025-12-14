# HLTV Match Tracker

## Overview

A web application that tracks and displays the top 30 CS2 (Counter-Strike 2) teams from HLTV.org along with their match history. The app scrapes team rankings and match data, presenting it in an expandable table format where users can view each team's recent matches.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state and caching
- **Styling**: Tailwind CSS with CSS variables for theming
- **Component Library**: shadcn/ui components built on Radix UI primitives
- **Design System**: Material Design-inspired with esports/gaming aesthetic (Inter + Rajdhani fonts)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Data Scraping**: HLTV npm package for fetching team and match data
- **Caching**: In-memory caching with TTL (10 min for teams, 30 min for matches)
- **Rate Limiting**: Custom rate limiter to avoid overwhelming HLTV API

### Data Flow
1. Frontend requests team data via `/api/teams` endpoint
2. Backend checks in-memory cache first
3. If cache miss, scrapes HLTV for top 30 teams
4. Match data loaded on-demand when user expands a team row
5. All data cached to reduce scraping frequency

### Build System
- **Development**: Vite for hot module replacement
- **Production**: esbuild bundles server, Vite builds client
- **Output**: `dist/` directory with `index.cjs` (server) and `public/` (client assets)

### Database Configuration
- Drizzle ORM configured with PostgreSQL dialect
- Schema defined in `shared/schema.ts` using Zod for validation
- Currently uses in-memory storage (`MemStorage` class) for team/match data
- Database tables can be pushed using `npm run db:push`

## External Dependencies

### Third-Party Services
- **HLTV.org**: Data source for CS2 team rankings and match history (scraped via HLTV npm package)
- **FlagCDN**: Country flag images (`flagcdn.com`)
- **Google Fonts**: Inter and Rajdhani font families
- **Google Material Icons**: Icon font for UI elements

### Database
- **PostgreSQL**: Required for production (connection via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Database toolkit for type-safe queries

### Key NPM Packages
- `hltv`: Official HLTV scraping library
- `cheerio`: HTML parsing for additional scraping if needed
- `axios`: HTTP client for external requests
- `zod`: Runtime type validation
- `@tanstack/react-query`: Data fetching and caching
- `@radix-ui/*`: Accessible UI primitives
- `tailwindcss`: Utility-first CSS framework