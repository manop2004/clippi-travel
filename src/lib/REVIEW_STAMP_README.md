# Review and Stamp System

This document describes the review and stamp system implementation for ekitag-web.

## Overview

The system allows users to:
1. **Write Reviews** - Users can submit reviews (1-5 stars) for places they've visited
2. **Collect Stamps** - Users can collect digital stamps by checking in at locations
3. **View Collection** - Users can view their collected stamps in the Stamp Book

## Database Schema

The system uses the following tables in Supabase:

### `reviews`
- `id` - UUID primary key
- `user_id` - References auth.users
- `place_id` - References places table
- `rating` - Integer (1-5)
- `comment` - Text (optional)
- `created_at` / `updated_at` - Timestamps

### `stamps`
- `id` - UUID primary key
- `name` - Stamp name
- `icon` - Emoji icon
- `description` - Description text
- `location` - Location name
- `lat` / `lng` - Coordinates (optional)

### `user_stamps`
- `id` - UUID primary key
- `user_id` - References auth.users
- `stamp_id` - References stamps table
- `collected_at` - Timestamp

### `places`
- `id` - UUID primary key
- `name` - Place name
- `shop_name` - Alternative name
- `prefecture` - Location
- `founded` - Year established
- `address` - Physical address
- `description` - Description
- `website` - URL
- `lat` / `lng` - Coordinates
- `rating` - Average rating
- `reviews_count` - Number of reviews

## File Structure

```
src/
├── types/
│   └── review-stamp.ts       # TypeScript interfaces
├── hooks/
│   └── useReviewStamp.ts     # Database operations
├── context/
│   └── ReviewStampContext.tsx # React context for global state
├── components/
│   └── Modals.tsx            # Updated with review form
├── components/views/
│   └── CollectionView.tsx    # Updated to fetch from database
├── lib/
│   ├── database-schema.sql   # SQL schema
│   └── seed-stamps.ts        # Seed script for initial data
```

## Usage

### Writing a Review

1. Open a place detail modal
2. Click "Write Review" button
3. Select rating (1-5 stars)
4. Optionally add a comment
5. Submit - review is saved to database and place rating is updated

### Collecting a Stamp

1. Open a place detail modal
2. Click "Check-in QR/NFC" button
3. If a matching stamp exists, it's added to user's collection
4. The button changes to "Stamp Collected"

### Viewing Collection

1. Navigate to "Stamp Book" tab
2. See all available stamps with collection status
3. Collected stamps show "ACQUIRED" badge

## Setup

1. Run the SQL schema in `src/lib/database-schema.sql` in your Supabase SQL editor
2. The seed script will automatically add initial stamps when the app loads
3. Ensure your `.env` file has the correct Supabase credentials

## API Functions

### Reviews
- `getReviews(placeId)` - Get all reviews for a place
- `createReview(input)` - Create a new review
- `updateReview(id, rating, comment)` - Update existing review
- `deleteReview(id)` - Delete a review

### Stamps
- `getStamps()` - Get all available stamps
- `getUserStamps(userId)` - Get stamps collected by user
- `collectStamp(stampId)` - Collect a stamp
- `createStamp(input)` - Create a new stamp
- `hasUserCollectedStamp(userId, stampId)` - Check if user has stamp

### Places
- `getPlaces()` - Get all places
- `getPlaceById(id)` - Get single place
- `createPlace(input)` - Create a new place