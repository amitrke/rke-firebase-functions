# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Firebase Functions project for the RKE (Roorkee) platform. The codebase manages scheduled data fetching (weather, news, holidays) and file lifecycle management for a Firebase-backed application.

## Development Commands

### Build and Lint
```bash
cd functions
yarn lint           # Run ESLint
yarn lint:fix       # Fix auto-fixable lint issues
yarn build          # Compile TypeScript to JavaScript
yarn build:watch    # Watch mode for development
```

### Testing
```bash
cd functions
yarn test          # Run Jest tests
```

### Local Development
```bash
cd functions
yarn serve         # Start Firebase emulators with functions
yarn shell         # Open Firebase functions shell
```

### Deployment
```bash
cd functions
yarn deploy        # Deploy all functions to Firebase
# OR from project root:
firebase deploy --only functions
```

**Important**: The `firebase.json` predeploy hooks will automatically run `lint` and `build` before deployment.

## Architecture

### Function Categories

The project is organized into domain-specific modules:

1. **Scheduled Data Fetchers** (`src/weather.ts`, `src/news.ts`, `src/newsdataio.ts`, `src/holidays.ts`)
   - Periodic functions that fetch external API data and store it in Firestore
   - All scheduled functions are registered in `src/index.ts` using `onSchedule` from `firebase-functions/v2/scheduler`

2. **File Management System** (`src/files.ts`)
   - Handles the complete file lifecycle: upload → tracking → usage checking → cleanup
   - Uses Cloud Storage triggers (`onObjectFinalized`, `onObjectDeleted`)
   - Maintains file metadata in Firestore `files` collection

3. **Type Definitions** (`src/model/types.ts`)
   - Shared TypeScript types for API responses

### File Management Flow

The file management system has a multi-step process:

1. **File Upload** (`onFileCreateV2`): Cloud Storage trigger adds metadata to Firestore when files are uploaded
2. **Weekly Sync** (`updateFilesList`): Runs every 168 hours to ensure Firestore has all files from storage
3. **Usage Check** (`checkFilesBeingUsed`): Runs every 170 hours, cross-references files with `posts` and `albums` collections, sets `isBeingUsed` flag
4. **Cleanup** (`deleteUnusedFiles`): Runs every 172 hours to delete files marked as unused

### File Path Convention

Files follow this structure:
```
users/{userId}/images/{fileName}_{dimensions}.{ext}
```

Example: `users/MvOomgxG3GaGR7dWvqnsz1G5Jk23/images/sample_1920x1280_680x680.jpeg`

The `parseFilePath()` function extracts:
- `userId`: User identifier
- `fileName`: Base filename
- `imageSize`: Single character size code (`s`, `m`, `l`)
- `imageDimensions`: Full dimension string (e.g., "680x680")

Valid dimensions are mapped to sizes:
- `200x200` → `s`
- `680x680` → `m`
- `1920x1080` → `l`

### Environment Variables

Required API keys (set via `.env` for local, GitHub Secrets for CI):
- `WEATHER_API_KEY`: OpenWeatherMap API
- `NEWS_API_KEY`: NewsAPI
- `NEWSDATAIO_API_KEY`: NewsData.io API
- `CALENDARIFIC_API_KEY`: Calendarific API for holidays

See `DEPLOYMENT.md` for full deployment instructions.

### Firestore Collections

- `weather`: Stores weather data (document ID: `roorkee-in`)
- `news`: Stores news articles from various sources
- `events`: Stores holidays with TTL (requires TTL policy on `expireAt` field)
- `files`: File metadata with usage tracking
- `posts`: User posts that reference image files
- `albums`: User albums that reference image files

### Key Implementation Details

- **Node Version**: 20 (specified in `functions/package.json`)
- **Firebase Functions**: v2 API (using `firebase-functions/v2/*`)
- **TypeScript**: Strict mode enabled, outputs to `lib/` directory
- **Region**: All functions deployed to `us-east1`
- **External Data APIs**: OpenWeatherMap (coordinates: lat=29.8667, lon=77.8833 for Roorkee)

### Holiday Management

The `updateHolidays` function runs annually (January 1st) and stores holidays in the `events` collection with:
- `type: "holiday"`
- `expireAt`: Timestamp for TTL-based auto-deletion (30 days after holiday date)
- Holiday data includes name, description, date, types, locations, states, and URL

**Note**: Firestore TTL must be manually enabled on the `events` collection with `expireAt` as the TTL field.
