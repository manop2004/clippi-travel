# Ekitag Web - Project Documentation

## Overview
Ekitag Web is a heritage tourism web application built with React, TypeScript, Vite, and Supabase. It allows users to discover historical spots, collect digital stamps, write reviews, and view locations on an interactive map.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Maps**: Leaflet
- **Icons**: Lucide React
- **Mobile**: Capacitor (for PWA/native app support)

## Project Structure
```
ekitag-web/
├── src/
│   ├── App.tsx              # Main app with tab navigation
│   ├── supabaseClient.ts    # Supabase client config
│   ├── components/
│   │   ├── Navigation.tsx   # Sidebar + Mobile nav components
│   │   ├── PlaceCard.tsx    # Reusable place card component
│   │   ├── TrendingSpots.tsx # Homepage trending spots section
│   │   ├── StarRow.tsx      # Star rating display
│   │   ├── Modals.tsx       # Place detail + Add place modals
│   │   └── views/
│   │       ├── ExploreView.tsx  # Explore/home page
│   │       ├── MapView.tsx      # Interactive map view
│   │       ├── CollectionView.tsx # Stamp book
│   │       ├── ProfileView.tsx  # User profile
│   │       └── AuthView.tsx     # Login/auth
│   ├── hooks/
│   │   └── useReviewStamp.ts    # Review & stamp CRUD hooks
│   ├── types/
│   │   └── review-stamp.ts      # TypeScript interfaces
│   ├── context/
│   │   └── ReviewStampContext.tsx # React context provider
│   └── lib/
│       └── seed-stamps.ts       # Database seed script
├── .env                    # Supabase credentials
├── capacitor.config.ts     # Capacitor mobile config
└── vite.config.ts          # Vite config
```

## Key Features

### 1. Place Discovery (Explore Tab)
- Browse trending heritage spots from `century_shops` table
- Skeleton loading while fetching data
- "View Map" button navigates to Interactive Map tab
- Each card shows: shop name, prefecture, founding year, rating

### 2. Interactive Map (Map Tab)
- Leaflet.js map with OpenStreetMap tiles
- Markers for all places with lat/lng coordinates
- Click markers to view place details

### 3. Review & Stamp System
- **Reviews**: Users can write reviews (1-5 stars + comment) for places
- **Stamps**: Collectible digital stamps associated with places
- **Stamp Book**: Collection view showing collected stamps
- Database tables: `reviews`, `stamps`, `user_stamps`

### 4. Authentication
- Supabase Auth for user login/signup
- Session-based authentication
- Auth gate prevents unauthenticated access

## Database Schema

### century_shops (Places)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| shop_name | text | Name of the shop/place |
| prefecture | text | Japanese prefecture |
| founded | text | Founding year |
| lat | float | Latitude for map |
| lng | float | Longitude for map |
| rating | float | Average rating |
| reviews_count | int | Number of reviews |

### reviews
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| place_id | uuid | FK to century_shops |
| rating | int | 1-5 stars |
| comment | text | Review text |

### stamps
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| place_id | uuid | FK to century_shops |
| name | text | Stamp name |
| icon | text | Emoji icon |
| description | text | Stamp description |
| location | text | Location text |

### user_stamps
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| stamp_id | uuid | FK to stamps |
| collected_at | timestamp | When collected |

## API Hooks (useReviewStamp.ts)

### Reviews
- `getReviews(placeId)` - Fetch reviews for a place
- `createReview(input)` - Create a new review
- `updateReview(id, rating, comment)` - Update review
- `deleteReview(id)` - Delete review

### Places
- `getPlaces()` - Fetch all places
- `getPlaceById(id)` - Fetch single place
- `createPlace(input)` - Create new place

### Stamps
- `getStamps()` - Fetch all stamps
- `getStampsByPlace(placeId)` - Stamps for a place
- `getUserStamps(userId)` - User's collected stamps
- `collectStamp(stampId)` - Collect a stamp
- `createStamp(input)` - Create new stamp

## Component Architecture

### PlaceCard
Reusable component for displaying place cards in two modes:
- **Default**: Full-size card with icon, name, prefecture, founding year, rating
- **Compact**: Smaller card for grid layouts

Props:
- `place: Place` - Place data
- `onClick?: () => void` - Click handler
- `compact?: boolean` - Compact mode flag

### TrendingSpots
Homepage section showing trending places with:
- Skeleton loading state
- Empty state with debug info
- "View Map" button that navigates to map tab

Props:
- `openPlace: (place) => void` - Open place detail modal
- `onViewMap?: () => void` - Navigate to map tab

## Setup & Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview production build |

## Troubleshooting

### Places not showing in TrendingSpots
1. Check browser console for error details
2. Verify `century_shops` table has data
3. Check Supabase RLS policies (enable public read)
4. Verify column names match (shop_name, prefecture, founded)

### Map not loading
1. Check that places have lat/lng coordinates
2. Verify Leaflet CSS is imported
3. Check browser console for map errors

## License
Private project - Ekitag Heritage Tourism App
</arg_value>
<task_progress>
- [x] Remove trending prop
- [x] Add places state + fetch from DB
- [x] Replace trending.map with places.map in JSX
- [x] Add full-screen mobile view for View All
- [x] Make close button sticky
- [x] Fix slow loading - fetch rating from century_shops instead of reviews
- [x] Remove unused placesMap state
- [x] Fix remaining placesMap references in View All grid
- [x] Fix reviews_count vs reviewsCount
- [x] Add skeleton loading for initial load
- [x] Add error/empty state UI
- [x] Debug fetch error - log full error details
- [x] Fix select columns to match DB schema
- [x] Add skeleton for View All when loading
- [x] Extract PlaceCard component for reuse
- [x] Update TrendingSpots to use PlaceCard
- [x] Fix ExploreView.tsx - remove trending prop
- [x] Fix seed-stamps.ts - add place_id
- [x] Verify build passes
- [x] Change View All to View Map with Leaflet map
- [x] Fix PlaceCard.tsx - restore footer row
- [x] Fix TrendingSpots.tsx - remove XML artifacts
- [x] Verify build passes again
- [x] Simplify to use onViewMap callback instead of Leaflet overlay
- [x] Change View Map button to navigate via Navigation
- [x] Create project documentation</arg_value></tool_call>