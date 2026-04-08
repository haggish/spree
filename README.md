# Spree — Event Route Planner

A mobile-native application that plans optimized walking/transit routes for visiting multiple events across Berlin. Select events on a map, configure your time window, and Spree computes the best route to visit them all.

## Architecture

```
┌─────────────────────────────────────┐
│           Angular 21 Frontend       │
│  ┌──────────┬──────────┬─────────┐  │
│  │ Map      │ Spree    │Settings │  │
│  │Component │ Panel    │Drawer   │  │
│  └──────────┴──────────┴─────────┘  │
│  Google Maps JS SDK · OIDC Client   │
└──────────────┬──────────────────────┘
               │ REST API
┌──────────────▼──────────────────────┐
│          NestJS Backend             │
│  ┌──────────┬──────────┬─────────┐  │
│  │ Event    │Index     │ Route   │  │
│  │ Groups   │Berlin    │Optimizer│  │
│  └──────────┴──────────┴─────────┘  │
│  Google Routes API · Places API     │
└──────────────┬──────────────────────┘
               │ JWKS validation
┌──────────────▼──────────────────────┐
│        Keycloak 26 (OIDC)          │
│  Realm: spree · Postgres backend   │
└─────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Angular 21 (standalone components, signals, reactive state)
- **Backend**: NestJS 11 (TypeScript, Swagger docs)
- **Auth**: Keycloak 26 (OIDC, JWT, role-based access)
- **Maps**: Google Maps JavaScript SDK (Advanced Markers, Geometry)
- **Routing**: Google Routes API v2 (walk + transit, per-leg mode selection)
- **Places**: Google Places API (Find Place from Text, venue resolution)
- **Data**: Index Berlin scraping (gallery openings, real venue data), Kulturdaten Berlin API (city-wide cultural events)
- **Testing**: Vitest (unit + integration), Playwright (E2E)
- **CI/CD**: GitHub Actions (CI on push, E2E on PR, Dependabot)
- **Infra**: Docker Compose (local), Terraform (AWS ECS Fargate, S3, CloudFront, RDS, ALB)

## Prerequisites

- Node.js 22+
- npm 10+
- Docker & Docker Compose
- Google Cloud project with these APIs enabled:
  - Maps JavaScript API
  - Routes API
  - Places API (Find Place from Text)

## Local Development

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable: Maps JavaScript API, Routes API, Places API
4. Create an API key under Credentials
5. (Recommended) Restrict the key to your domains

### 2. Docker Compose (Keycloak + Backend)

The quickest way to get the backend and Keycloak running:

```bash
# Create .env in project root with your API key
echo "GOOGLE_MAPS_API_KEY=your-key" > .env

docker-compose up -d
```

This starts three services:

| Service | URL | Description |
|---------|-----|-------------|
| **Keycloak** | `http://localhost:8080` | Identity provider (admin/admin) |
| **Backend** | `http://localhost:3000` | NestJS API server |
| **Postgres** | internal | Keycloak database |

The backend waits for Keycloak to be healthy before starting. The Keycloak realm (`spree`) and test users are auto-imported.

**Test users** (password = username + `123`):
- `alice` / `alice123` — regular user
- `bob` / `bob123` — organizer role
- `admin` / `admin123` — admin role

To stop and remove everything:

```bash
docker-compose down        # stop containers
docker-compose down -v     # stop and delete Keycloak database volume
```

### 3. Backend (without Docker)

If you prefer running the backend directly:

```bash
cd backend
cp .env.example .env
# Edit .env: set GOOGLE_MAPS_API_KEY, KEYCLOAK_URL, KEYCLOAK_REALM

npm install
npm run start:dev
```

Server runs at `http://localhost:3000`
Swagger docs at `http://localhost:3000/api/docs`

> **No API key?** The backend falls back to haversine-based mock routing and uses Index Berlin coordinates directly (without Google Place ID resolution).

> **Keycloak required.** The backend validates JWTs against Keycloak. Run at minimum `docker-compose up -d keycloak keycloak-db` to have auth working.

### 4. Frontend

```bash
cd frontend
# Edit src/environments/environment.ts — set your googleMapsApiKey

npm install
npm start
```

App runs at `http://localhost:4200` (proxies `/api` to backend via `proxy.conf.json`)

## Event Groups

Events are organized into **Event Groups**. The frontend shows a group selector dropdown and a date picker in the top bar.

### Static mock groups

Two built-in groups with hardcoded events:
- **Berlin Music Day** — 9 music events across April 5 and April 10, 2026
- **Berlin Arts & Culture** — 8 arts events across April 5 and April 10, 2026

### Index Berlin (live scraping)

The backend scrapes real gallery opening data from [Index Berlin](https://www.indexberlin.com/):
- **Venues** from `/venues/list/` — name, coordinates, Index Berlin ID
- **Events (openings)** from `/events/list/filter?ty=12614` — title, venue reference, date, time

Scraped data is cached in memory for 1 hour (configurable via `INDEX_BERLIN_CACHE_TTL_MS` env var).

### Kulturdaten Berlin (API)

The backend fetches cultural events from the [Kulturdaten Berlin API](https://api-v2.kulturdaten.berlin/api):
- **Events** by date range — concerts, exhibitions, readings, dance, theater, and more
- **Locations** resolved to Google Place IDs via street address geocoding
- **Attractions** provide event titles, descriptions, and category tags

Events are fetched per-date and cached in memory for 1 hour (configurable via `KULTURDATEN_CACHE_TTL_MS`). Location resolutions are cached persistently in `backend/data/kulturdaten-place-ids.json`.

All-day events (startTime `00:00:00`) are filtered out since the route optimizer needs specific time windows.

### Venue/location resolution

Each venue or location is resolved to a **Google Place ID** via the Find Place from Text API. Results are cached persistently:
- `backend/data/venue-place-ids.json` — Index Berlin venues (keyed by venue ID)
- `backend/data/kulturdaten-place-ids.json` — Kulturdaten locations (keyed by location ID)

Only new venues/locations trigger API calls. Cache files can be committed to Git as warm-start seeds.

## Travel Mode

Spree uses a **walk + transit hybrid**: for each leg of the route, both walking and transit routes are computed in parallel via Google Routes API, and the faster option is selected. This means:

- **Short distances** (~500m) typically use walking
- **Longer distances** (~3km+) typically use transit (bus, tram, U-Bahn, S-Bahn)

Transit legs include detailed information: line name (e.g. "M19", "U2"), transit type (bus/subway/tram/rail), and departure/arrival stop names.

During route optimization (before real API calls), a hybrid speed model estimates travel times: walk speed for distances under 1km, transit speed + 5min overhead for longer distances.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/event-groups` | List all event groups (with summaries) |
| GET | `/api/event-groups/:id` | Get event group with all events |
| GET | `/api/event-groups/:id/at/:date` | Get event group filtered by date (YYYY-MM-DD) |
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
  "legs": [
    {
      "order": 1,
      "event": { "id": "...", "name": "...", "venue": { "..." } },
      "travelFromPrevious": {
        "travelMode": "WALK",
        "durationSeconds": 420,
        "distanceMeters": 580,
        "transitDetails": null
      },
      "arrivalTime": "...",
      "departureTime": "...",
      "stayMinutes": 15
    },
    {
      "order": 2,
      "travelFromPrevious": {
        "travelMode": "TRANSIT",
        "durationSeconds": 780,
        "distanceMeters": 3200,
        "transitDetails": [
          {
            "transitType": "BUS",
            "lineName": "M19",
            "departureStop": "Mehringdamm",
            "arrivalStop": "Kottbusser Tor"
          }
        ]
      }
    }
  ],
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
      "event": { "id": "evt-009", "name": "..." },
      "reason": "Event ends before you could arrive"
    }
  ]
}
```

## Features

### Core
- **Event Groups**: Organize events into named groups, selectable via dropdown
- **Date Filtering**: Pick a date to see only events on that day
- **Index Berlin Integration**: Real gallery opening data scraped from indexberlin.com
- **Kulturdaten Berlin Integration**: City-wide cultural events via the Kulturdaten Berlin API
- **Map View**: Interactive Google Map with Advanced Markers for event venues
- **Time Filtering**: Events outside your spree window are grayed out and disabled
- **Event Selection**: Tap markers to see details and add/remove from spree
- **Configurable Stay**: Set how long to stay at each event (default 10 min)

### Route Planning
- **Walk + Transit Hybrid**: Each leg automatically uses the faster of walking or transit
- **Transit Details**: Line names (M19, U2), stop names, vehicle types per transit leg
- **Greedy Nearest-Time Algorithm**: Builds N x N travel matrix, scores candidates by `travel + 0.5 x idle`, picks optimal next stop
- **Strategy Toggle**: Switch between smart optimization and chronological order
- **Skipped Events**: Events that can't be reached before they end are reported with reasons
- **Optimization Stats**: Total travel, idle, and stay time breakdowns

### Route Display
- **Timeline View**: Visual timeline with numbered stops, travel segments, and idle wait indicators
- **Transit Badges**: Blue pills showing bus/tram/subway line + departure/arrival stops
- **Animated Polylines**: Route legs draw sequentially with staggered reveal
- **Numbered Markers**: Map markers show route order (1, 2, 3...) after planning
- **Color-Coded**: Indigo for on-schedule, amber for over-time legs and markers

### Mobile Native UX
- **Splash Screen**: 3-step onboarding overlay on first launch
- **Auto-Expand Panel**: Bottom sheet opens automatically when route is computed
- **Touch Targets**: All buttons >= 44px for mobile accessibility
- **Map Legend**: Floating legend explaining marker colors

### Settings
- **Home Location**: Manual coordinates or Shift+click on map
- **Spree Time Window**: datetime-local pickers for start/end
- **Optimization Strategy**: Smart Route vs. By Start Time

### PWA & Performance
- **Web App Manifest**: Standalone display, portrait orientation
- **iOS Support**: apple-mobile-web-app-capable, translucent status bar
- **Dark Mode**: Full dark theme with system preference detection
- **Reduced Motion**: Respects `prefers-reduced-motion`
- **Error Recovery**: Retry buttons for event loading and route computation

## Testing

### Backend — Vitest

Unit and integration tests using [Vitest](https://vitest.dev/) with SWC for NestJS decorator support.

```bash
cd backend
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

**Unit tests** (11 files, 91 tests) cover all services:
- Kulturdaten API client, location resolver, orchestrator
- Index Berlin scraper (HTML parsing, time parsing), venue resolver, orchestrator
- Event groups service (static + dynamic groups, date filtering, timezone handling)
- Events service (cross-source lookup)
- Route optimizer (greedy algorithm, travel matrix, time-sort)
- Google Routes service (API/mock modes, transit details, walk vs transit)
- Spree service (plan computation, strategies, idle wait, window overflow)

**Integration tests** (3 files, 19 tests) spin up a real NestJS app via `@nestjs/testing` + supertest:
- `GET /api/event-groups` — list, by ID, by date, 404 handling
- `GET /api/events` — list, time range filtering, by ID
- `POST /api/spree/compute` — greedy/time-sort strategies, DTO validation, error cases

### Frontend — Playwright

End-to-end tests using [Playwright](https://playwright.dev/) with Chromium. API responses are mocked via route interception so tests don't require the backend or Keycloak.

```bash
cd frontend
npm run e2e           # headless
npm run e2e:headed    # visible browser
```

**E2E tests** (1 file, 15 tests) cover:
- App shell (splash screen, dismiss, map legend)
- Event group selection (dropdown, auto-select, date picker, group switching)
- Spree panel (header, empty state, selection count)
- Settings drawer (open/close, inputs, strategy buttons)
- Map area (component rendering)

## CI/CD

### GitHub Actions

| Workflow | Trigger | Jobs |
|----------|---------|------|
| **CI** (`.github/workflows/ci.yml`) | Push + PR to master | Backend: typecheck, test, build. Frontend: production build. |
| **E2E** (`.github/workflows/e2e.yml`) | PR to master | Playwright tests with both servers, failure artifacts uploaded. |

### Dependabot

`.github/dependabot.yml` checks weekly for updates:
- Backend npm (groups NestJS and Vitest packages)
- Frontend npm (groups Angular and Playwright packages)
- GitHub Actions versions

## Project Structure

```
spree/
├── backend/
│   ├── .env.example
│   ├── Dockerfile                         # Multi-stage Node 22 build
│   ├── vitest.config.ts                     # Test config (SWC, path aliases)
│   ├── test/                                # Integration tests
│   │   ├── test-app.ts                      # Shared NestJS test app setup
│   │   ├── event-groups.integration.spec.ts
│   │   ├── events.integration.spec.ts
│   │   └── spree.integration.spec.ts
│   ├── data/
│   │   ├── venue-place-ids.json           # Index Berlin venue → Place ID cache
│   │   └── kulturdaten-place-ids.json     # Kulturdaten location → Place ID cache
│   └── src/
│       ├── main.ts                        # Entry point + Swagger + CORS
│       ├── app.module.ts                  # Root module
│       ├── auth/                          # Keycloak OIDC auth
│       │   ├── auth.module.ts             # Global JWT + roles guards
│       │   ├── keycloak-jwt.strategy.ts   # Passport JWT with JWKS
│       │   ├── keycloak-auth.guard.ts     # Auth guard (respects @Public)
│       │   ├── roles.guard.ts             # Role-based access control
│       │   ├── public.decorator.ts        # @Public() — skip auth
│       │   ├── roles.decorator.ts         # @Roles('admin','organizer')
│       │   └── current-user.decorator.ts  # @CurrentUser() param decorator
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
│       │   ├── events.service.ts          # Delegates to EventGroups + IndexBerlin + Kulturdaten
│       │   └── events.controller.ts
│       ├── event-groups/
│       │   ├── event-groups.module.ts
│       │   ├── event-groups.service.ts    # Static + dynamic groups, date filtering
│       │   └── event-groups.controller.ts # /api/event-groups endpoints
│       ├── index-berlin/
│       │   ├── index-berlin.module.ts
│       │   ├── index-berlin.service.ts    # Orchestrator with 1h TTL cache
│       │   ├── index-berlin-scraper.service.ts  # HTML scraping + time parsing
│       │   └── venue-resolver.service.ts  # Google Place ID resolution + JSON cache
│       ├── kulturdaten-berlin/
│       │   ├── kulturdaten-berlin.module.ts
│       │   ├── kulturdaten.service.ts     # Orchestrator with per-date TTL cache
│       │   ├── kulturdaten-api.service.ts # REST client for Kulturdaten API
│       │   └── location-resolver.service.ts # Address-based Google Place ID resolution
│       └── routes/
│           ├── routes.module.ts
│           ├── google-routes.service.ts   # Google Routes API v2 (walk + transit)
│           ├── route-optimizer.service.ts # Greedy nearest-time with hybrid speed
│           ├── spree.service.ts           # Orchestrates optimization + routing
│           └── spree.controller.ts
│
├── frontend/
│   ├── angular.json
│   ├── package.json
│   ├── proxy.conf.json                    # Dev proxy to backend
│   ├── playwright.config.ts               # E2E test config
│   ├── e2e/                               # Playwright E2E tests
│   │   ├── app.spec.ts
│   │   └── fixtures.ts                    # Mock API responses
│   └── src/
│       ├── main.ts                        # Bootstrap + OIDC config
│       ├── index.html                     # PWA meta, preconnects, boot loader
│       ├── styles.css                     # Global CSS variables, dark mode, reset
│       ├── manifest.webmanifest           # PWA manifest
│       ├── environments/
│       │   ├── environment.ts             # Dev (localhost Keycloak)
│       │   └── environment.prod.ts        # Prod (CloudFront Keycloak)
│       └── app/
│           ├── app.component.ts           # Shell: group selector, date picker, splash
│           ├── models/
│           │   └── domain.ts              # Frontend type definitions
│           ├── services/
│           │   ├── events-api.service.ts
│           │   ├── event-groups-api.service.ts
│           │   ├── spree-api.service.ts
│           │   ├── spree-state.service.ts # Central signals-based state
│           │   ├── auth.service.ts
│           │   └── google-maps-loader.service.ts
│           ├── pipes/
│           │   ├── duration.pipe.ts
│           │   └── distance.pipe.ts
│           └── components/
│               ├── map/                   # Google Map + markers + polylines
│               ├── spree-panel/           # Bottom sheet with selections
│               ├── route-list/            # Timeline with transit details
│               ├── settings-drawer/       # Right-side config drawer
│               ├── auth-chip/             # Login/logout chip
│               ├── saved-sprees-drawer/   # Saved sprees (auth-gated)
│               └── time-warning/          # Overflow warning banner
│
├── keycloak/
│   ├── Dockerfile                         # Official Keycloak + realm import
│   └── spree-realm.json                   # Realm config, clients, test users
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                         # Backend tests + frontend build
│   │   └── e2e.yml                        # Playwright E2E on PRs
│   └── dependabot.yml                     # Weekly dependency updates
│
├── terraform/                             # AWS deployment (ECS, S3, CloudFront)
├── docker-compose.yml                     # Local: Keycloak + Backend + Postgres
└── README.md
```

## AWS Deployment

The `terraform/` directory contains infrastructure-as-code to deploy the full stack to AWS. See the Terraform files for details on the architecture (CloudFront + ALB + ECS Fargate + RDS).

## Data Sources

### Mock Events
Two static event groups with events on April 5 and April 10, 2026, across 8 Berlin venues (Berghain, Astra Kulturhaus, Tempodrom, Festsaal Kreuzberg, Lido, Volksbuhne, Columbiahalle, Admiralspalast).

### Index Berlin (Live)
Real gallery openings scraped from indexberlin.com. Venues are resolved to Google Place IDs and cached in `backend/data/venue-place-ids.json`. Event times are parsed from HTML (e.g. "Opening 7-9pm" on "Friday, April 10"). Default duration when no end time is given: 2 hours.

### Kulturdaten Berlin (Live)
City-wide cultural events from the [Kulturdaten Berlin API](https://api-v2.kulturdaten.berlin/api). Covers concerts, exhibitions, readings, theater, dance, and more (~100-150 events per day). Locations are resolved to Google Place IDs via address geocoding and cached in `backend/data/kulturdaten-place-ids.json`. All-day events are filtered out.
