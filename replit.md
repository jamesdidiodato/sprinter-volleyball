# Sprinter Volleyball Tracker

## Overview

Sprinter Volleyball Tracker is a multi-user recreational league volleyball management app built with Expo (React Native) for the frontend and Express.js for the backend. Multiple leagues can operate independently, each accessed via unique join codes. Each league manages 16 players across 3 positions (4 Setters, 8 Hitters, 4 Back), with random weekly team generation (4 teams of 4), score tracking through round-robin/semifinal/final tournament phases, cumulative season standings with CSV export, and historical tracking. All data is shared in real-time across devices within a league.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54 with React Native 0.81, using expo-router for file-based routing with typed routes
- **Navigation**: Tab-based layout with 5 tabs: Players, Teams, Scores, Standings, History (located in `app/(tabs)/`)
- **League Selection**: When no league is cached locally, shows league selection screen (`app/league.tsx`) with Create/Join options. League info (id, name, joinCode) is cached in AsyncStorage for persistence
- **State Management**: Custom React context (`VolleyballProvider` in `lib/volleyball-context.tsx`) handles all volleyball game logic. Data is fetched from the server API and cached in React state. League selection is persisted locally via `@react-native-async-storage/async-storage`
- **Data Fetching**: Custom API client (`lib/query-client.ts`) that constructs URLs from `EXPO_PUBLIC_DOMAIN` environment variable. All volleyball operations (create/join league, update players, generate weeks, submit scores, swap players, reset season) go through the Express API
- **Styling**: Direct StyleSheet usage with a custom color theme system (`constants/colors.ts`) supporting light/dark mode with orange/navy brand colors
- **Fonts**: Inter font family (Regular, SemiBold, Bold) via `@expo-google-fonts/inter`
- **Animations**: react-native-reanimated for team card animations
- **Platform Support**: iOS, Android, and Web (with platform-specific adaptations)
- **Tab Layout**: Dual implementation — uses native SF Symbol tabs on iOS 26+ (liquid glass), falls back to classic Ionicons tabs elsewhere

### Backend (Express.js)
- **Server**: Express 5 running on Node.js (`server/index.ts`)
- **Routes**: Registered in `server/routes.ts` with comprehensive API endpoints prefixed with `/api`:
  - `POST /api/leagues` - Create a new league (generates unique join code, initializes 16 default players)
  - `POST /api/leagues/join` - Join existing league by code
  - `GET /api/leagues/:id` - Get full league data (players, currentWeek, history)
  - `PUT /api/leagues/:id/players/:playerId` - Update player name
  - `POST /api/leagues/:id/generate-week` - Generate random teams for new week
  - `POST /api/leagues/:id/swap-players` - Swap two players between teams
  - `POST /api/leagues/:id/submit-score` - Submit a game score (handles round-robin → semifinals → finals progression)
  - `POST /api/leagues/:id/reset` - Reset season (clear wins/losses, current week, history)
- **Storage**: PostgreSQL-backed storage (`server/storage.ts`) with `IStorage` interface
- **Game Logic**: Server-side tournament bracket generation (round-robin → semifinals → finals), score validation, win/loss tracking
- **CORS**: Dynamic CORS configuration supporting Replit dev/deployment domains and localhost
- **Static Serving**: In production, serves a static landing page from `server/templates/landing-page.html`; in development, proxies to the Expo Metro bundler

### Database Schema
- **ORM**: Drizzle ORM configured for PostgreSQL (`drizzle.config.ts`)
- **Schema**: Defined in `shared/schema.ts` with a `leagues` table:
  - `id`: serial primary key
  - `name`: text (league name)
  - `join_code`: text, unique (e.g., "SPRNT4K2X")
  - `players`: JSONB (array of 16 player objects with id, name, position, seasonWins, seasonLosses)
  - `current_week`: JSONB (nullable, contains teams, games, semifinalGames, finalGames, weekNumber, phase)
  - `history`: JSONB (array of completed week entries with rankings)
  - `created_at`: timestamp
- **Validation**: Uses `drizzle-zod` for generating Zod schemas from Drizzle table definitions

### Key Design Decisions
- **Multi-user via join codes**: Users create or join leagues using unique codes — no individual user accounts needed. League info is cached locally in AsyncStorage
- **Server-side data persistence**: All volleyball data is stored in PostgreSQL via JSONB columns. This allows real-time data sharing across all devices in a league
- **Tournament structure**: Each week follows a round-robin → semifinals → finals progression with scoring validation (winner must reach 21+, scores max at 21)
- **Player composition**: Fixed roster of 16 players with enforced team composition (1 Setter, 2 Hitters, 1 Back per team)
- **Build system**: Custom build script (`scripts/build.js`) handles Expo static builds for deployment, with esbuild for server bundling

## External Dependencies

### Core Services
- **PostgreSQL**: Connected via `DATABASE_URL` environment variable, stores all league data in JSONB columns
- **AsyncStorage**: Local device storage for league selection cache only (not game data)

### Key NPM Packages
- **expo** (~54.0.27): Mobile app framework
- **expo-router** (~6.0.17): File-based routing
- **express** (^5.0.1): Backend HTTP server
- **drizzle-orm** (^0.39.3) + **drizzle-kit**: Database ORM and migration tooling
- **@tanstack/react-query** (^5.83.0): Server state management
- **react-native-reanimated** (~4.1.1): Animations
- **expo-haptics**: Tactile feedback
- **expo-file-system** + **expo-sharing**: File export for standings
- **pg** (^8.16.3): PostgreSQL client
- **http-proxy-middleware**: Dev server proxy to Metro bundler

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN`: API server domain (set automatically in Replit)
- `REPLIT_DEV_DOMAIN`: Replit development domain
- `REPLIT_DOMAINS`: Comma-separated list of Replit deployment domains
