# Sprinter Volleyball Tracker

## Overview

Sprinter Volleyball Tracker is a recreational league volleyball management app built with Expo (React Native) for the frontend and Express.js for the backend. The app manages weekly volleyball teams and tracks season standings for a 16-player league (4 Setters, 8 Hitters, 4 Back players). Core features include player management, random weekly team generation (4 teams of 4), score tracking through round-robin/semifinal/final tournament phases, cumulative season standings, and week history.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54 with React Native 0.81, using expo-router for file-based routing with typed routes
- **Navigation**: Tab-based layout with 5 tabs: Players, Teams, Scores, Standings, History (located in `app/(tabs)/`)
- **State Management**: Custom React context (`VolleyballProvider` in `lib/volleyball-context.tsx`) handles all volleyball game logic. Data is persisted locally using `@react-native-async-storage/async-storage` — not the server database
- **Data Fetching**: TanStack React Query with a custom API client (`lib/query-client.ts`) that constructs URLs from `EXPO_PUBLIC_DOMAIN` environment variable
- **Styling**: Direct StyleSheet usage with a custom color theme system (`constants/colors.ts`) supporting light/dark mode with orange/navy brand colors
- **Fonts**: Inter font family (Regular, SemiBold, Bold) via `@expo-google-fonts/inter`
- **Animations**: react-native-reanimated for team card animations
- **Platform Support**: iOS, Android, and Web (with platform-specific adaptations like `KeyboardAwareScrollViewCompat`)
- **Tab Layout**: Dual implementation — uses native SF Symbol tabs on iOS 26+ (liquid glass), falls back to classic Ionicons tabs elsewhere

### Backend (Express.js)
- **Server**: Express 5 running on Node.js (`server/index.ts`)
- **Routes**: Registered in `server/routes.ts` — currently minimal with just the HTTP server setup. API routes should be prefixed with `/api`
- **Storage**: In-memory storage implementation (`server/storage.ts`) with an `IStorage` interface. Currently only has basic user CRUD — the volleyball data lives entirely on the client side via AsyncStorage
- **CORS**: Dynamic CORS configuration supporting Replit dev/deployment domains and localhost
- **Static Serving**: In production, serves a static landing page from `server/templates/landing-page.html`; in development, proxies to the Expo Metro bundler

### Database Schema
- **ORM**: Drizzle ORM configured for PostgreSQL (`drizzle.config.ts`)
- **Schema**: Defined in `shared/schema.ts` — currently only has a `users` table with id, username, and password fields
- **Validation**: Uses `drizzle-zod` for generating Zod schemas from Drizzle table definitions
- **Note**: The volleyball game data (players, teams, games, standings, history) is NOT in the database — it's all managed client-side through AsyncStorage. The server schema is a boilerplate starting point

### Key Design Decisions
- **Client-side data persistence**: All volleyball data uses AsyncStorage rather than server-side storage. This means the app works offline but data doesn't sync across devices
- **Tournament structure**: Each week follows a round-robin → semifinals → finals progression with scoring validation (winner must reach 21+)
- **Player composition**: Fixed roster of 16 players with enforced team composition (1 Setter, 2 Hitters, 1 Back per team)
- **Build system**: Custom build script (`scripts/build.js`) handles Expo static builds for deployment, with esbuild for server bundling

## External Dependencies

### Core Services
- **PostgreSQL**: Connected via `DATABASE_URL` environment variable, used by Drizzle ORM (currently only for user schema)
- **AsyncStorage**: Local device storage for all volleyball game data

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