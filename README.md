# 🎪 Spree — Event Route Planner

A mobile-native application that plans optimized routes for visiting multiple events across a city. Select events on a map, configure your time window, and Spree computes the best route to visit them all.

## Architecture

```
┌─────────────────────────────────────┐
│           Angular 21 Frontend       │
│  ┌──────────┬──────────┬─────────┐  │
│  │ Map      │ Spree    │Settings │  │
│  │Component │ Panel    │Drawer   │  │
│  └──────────┴──────────┴─────────┘  │
│  Google Maps JS SDK                 │
└──────────────┬──────────────────────┘
               │ REST API
┌──────────────▼──────────────────────┐
│          NestJS Backend             │
│  ┌──────────┬──────────┬─────────┐  │
│  │ Events   │ Venues   │ Route   │  │
│  │ Module   │ Module   │Optimizer│  │
│  └──────────┴──────────┴─────────┘  │
│  Google Routes API                  │
└─────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Angular 21 (standalone components, signals, reactive state)
- **Backend**: NestJS 11 (TypeScript, Swagger docs)
- **Maps**: Google Maps JavaScript SDK (Advanced Markers, Geometry)
- **Routing**: Google Routes API v2
- **Places**: Google Places API (Place IDs)

## Prerequisites

- Node.js 22+
- npm 10+
- Google Cloud project with these APIs enabled:
  - Maps JavaScript API
  - Routes API
  - Places API

## Setup

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable: Maps JavaScript API, Routes API, Places API
4. Create an API key under Credentials
5. (Recommended) Restrict the key to your domains

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your GOOGLE_MAPS_API_KEY

npm install
npm run start:dev
```

Server runs at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api/docs`

> **No API key?** The backend falls back to haversine-based mock routing automatically.

### 3. Frontend

```bash
cd frontend
# Edit src/environments/environment.ts — set your googleMapsApiKey

npm install
npm start
```

App runs at `http://localhost:4200` (proxies `/api` → backend)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/venues` | List all venues |
| GET | `/api/venues/:id` | Get venue by ID |
| GET | `/api/events` | List all events (with venues) |
| GET | `/api/events?startTime=...&endTime=...` | Filter events by time range |
| GET | `/api/events/:id` | Get event by ID |
| POST | `/api/spree/compute` | Compute optimized spree route |

### POST `/api/spree/compute` — Request Body

```json
{
  "homeLocation": { "lat": 52.52, "lng": 13.405 },
  "startTime": "2026-04-05T10:00:00+02:00",
  "endTime": "2026-04-05T22:00:00+02:00",
  "travelMode": "DRIVE",
  "strategy": "greedy",
  "selections": [
    { "eventId": "evt-001", "stayMinutes": 15 },
    { "eventId": "evt-003", "stayMinutes": 10 },
    { "eventId": "evt-005", "stayMinutes": 20 }
  ]
}
```

**Strategy options:**
- `"greedy"` — Smart route optimization using time-constrained greedy nearest-neighbor. Builds a travel matrix, then at each step picks the event that minimizes travel + idle wait. Unreachable events are reported as skipped.
- `"time-sort"` — Simple chronological ordering by event start time.

### Response includes optimization metadata

```json
{
  "legs": [...],
  "stats": {
    "strategy": "greedy-nearest-time",
    "totalTravelMinutes": 42,
    "totalIdleMinutes": 15,
    "totalStayMinutes": 60,
    "eventsScheduled": 5,
    "eventsSkipped": 1
  },
  "skippedEvents": [
    {
      "event": { "id": "evt-009", "name": "...", "..." : "..." },
      "reason": "Event ends before you could arrive"
    }
  ]
}
```

## Features

### Core
- **Map View**: Interactive Google Map with Advanced Markers for event venues
- **Time Filtering**: Events outside your spree window are grayed out and disabled
- **Event Selection**: Tap markers to see details and add/remove from spree
- **Configurable Stay**: Set how long to stay at each event (default 10 min)
- **Route Computation**: Computes route via Google Routes API with encoded polylines

### Route Optimization (Phase 4)
- **Greedy Nearest-Time Algorithm**: Builds N×N travel matrix, scores candidates by `travel + 0.5×idle`, picks optimal next stop
- **Strategy Toggle**: Switch between smart optimization and chronological order in settings
- **Skipped Events**: Events that can't be reached before they end are reported with reasons
- **Optimization Stats**: Total travel, idle, and stay time breakdowns

### Route Display (Phase 5)
- **Timeline View**: Visual timeline with numbered stops, travel segments, and idle wait indicators
- **Animated Polylines**: Route legs draw sequentially with staggered reveal
- **Numbered Markers**: Map markers show route order (1, 2, 3…) after planning
- **Color-Coded**: Indigo for on-schedule, amber for over-time legs and markers
- **Per-Leg Warnings**: Individual warning when a leg exceeds the spree end time

### Mobile Native UX (Phase 6)
- **Splash Screen**: 3-step onboarding overlay on first launch
- **Boot Loader**: CSS-only pulsing emoji before Angular loads
- **Map Skeleton**: Animated fake roads and pins during map load
- **Auto-Expand Panel**: Bottom sheet opens automatically when route is computed
- **Panel Pulse**: Indigo glow animation on successful computation
- **Selection Badge**: Count chip on collapsed panel
- **Staggered Card Animations**: Selection cards slide in with delay
- **Touch Targets**: All buttons ≥ 44px for mobile accessibility
- **Active State Feedback**: Scale transforms on tap
- **Map Legend**: Floating legend explaining marker colors
- **Event Count Chip**: Live count with green pulse dot
- **Handle Hint**: Drag handle pulses to hint at expandability

### Settings
- **Home Location**: Manual coordinates or Shift+click on map
- **Spree Time Window**: datetime-local pickers for start/end
- **Travel Mode**: Drive, Transit, Bike, Walk
- **Optimization Strategy**: Smart Route vs. By Start Time

### PWA & Performance
- **Web App Manifest**: Standalone display, portrait orientation
- **iOS Support**: apple-mobile-web-app-capable, translucent status bar
- **Preconnects**: Google Maps, Fonts, gstatic
- **Font Preload**: Display font preloaded for faster rendering
- **Dark Mode**: Full dark theme with system preference detection
- **Reduced Motion**: Respects `prefers-reduced-motion`
- **Error Recovery**: Retry buttons for both event loading and route computation

## Project Structure

```
spree/
├── backend/
│   ├── .env.example
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts                        # Entry point + Swagger + CORS
│       ├── app.module.ts                  # Root module
│       ├── common/
│       │   ├── dto/
│       │   │   └── compute-spree.dto.ts   # Request validation
│       │   └── interfaces/
│       │       └── domain.ts              # All domain types
│       ├── venues/
│       │   ├── venues.module.ts
│       │   ├── venues.service.ts          # 8 Berlin venues with Place IDs
│       │   └── venues.controller.ts
│       ├── events/
│       │   ├── events.module.ts
│       │   ├── events.service.ts          # 10 mock events + time range filter
│       │   └── events.controller.ts
│       └── routes/
│           ├── routes.module.ts
│           ├── google-routes.service.ts   # Google Routes API v2 integration
│           ├── route-optimizer.service.ts # Greedy nearest-time algorithm
│           ├── spree.service.ts           # Orchestrates optimization + routing
│           └── spree.controller.ts
│
├── frontend/
│   ├── angular.json
│   ├── package.json
│   ├── proxy.conf.json                    # Dev proxy to backend
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   └── src/
│       ├── main.ts                        # Bootstrap
│       ├── index.html                     # PWA meta, preconnects, boot loader
│       ├── styles.css                     # Global CSS variables, dark mode, reset
│       ├── manifest.webmanifest           # PWA manifest
│       ├── assets/
│       │   └── icon-192.svg              # App icon
│       ├── environments/
│       │   ├── environment.ts
│       │   └── environment.prod.ts
│       └── app/
│           ├── app.component.ts           # Shell: splash, loading, legend, error
│           ├── models/
│           │   └── domain.ts              # Frontend type definitions
│           ├── services/
│           │   ├── events-api.service.ts
│           │   ├── spree-api.service.ts
│           │   ├── spree-state.service.ts # Central signals-based state
│           │   └── google-maps-loader.service.ts
│           ├── pipes/
│           │   ├── duration.pipe.ts
│           │   └── distance.pipe.ts
│           └── components/
│               ├── map/                   # Google Map + markers + polylines
│               ├── spree-panel/           # Bottom sheet with selections
│               ├── route-list/            # Timeline route display
│               ├── settings-drawer/       # Right-side config drawer
│               └── time-warning/          # Overflow warning banner
│
└── README.md
```

## Mock Data

The backend comes pre-seeded with 10 events across 8 Berlin venues (Berghain, Astra Kulturhaus, Tempodrom, Festsaal Kreuzberg, Lido, Volksbühne, Columbiahalle, Admiralspalast) — all on April 5, 2026 with staggered start times from 06:00 to 23:00.
