# TBO Hotel Integration - Setup Guide

## 🚀 Quick Start

This guide will help you integrate TBO (Travel Boutique Online) hotels into your application.

## Prerequisites

- Docker Desktop running
- MongoDB accessible
- Node.js v22+

## Step 1: Start Database Services

```bash
# Start MongoDB and other services
docker-compose up -d mongo

# Wait for services to be healthy (check with)
docker-compose ps
```

## Step 2: Remove Pre-seeded Hotels

```bash
cd server
node src/scripts/removeSeededHotels.js
```

This will remove all existing manually-seeded hotels from the database.

## Step 3: Sync TBO Hotels

```bash
node src/scripts/syncTBOHotels.js
```

This script will:
- Fetch 60 hotels from TBO API (12 hotels per city)
- Cities: Kolkata, Hyderabad, Bangalore, Mumbai, Delhi
- Transform TBO data to match our User schema
- Save hotels to MongoDB with `hotelSource: 'tbo'`

**Note:** Hotels are fetched with estimated data for fast AI recommendations. Real-time pricing is fetched when a planner selects a hotel.

## Step 4: Generate Embeddings

```bash
node src/scripts/generateEmbeddings.js
```

This creates vector embeddings for all TBO hotels to enable AI-powered recommendations.

## 🏗️ Architecture Overview

### Two-Phase Pricing Strategy

1. **Bulk Sync (Initial)**: Fetch hotel metadata with estimated pricing
   - Fast database queries for AI recommendations
   - Estimated room counts and pricing based on star rating
   - Comprehensive hotel information stored locally

2. **Real-Time Search (On Selection)**: Call TBO Search API
   - When planner selects a hotel, fetch live pricing
   - Parse room types intelligently (single/double/suite)
   - Store booking codes for actual reservation
   - Convert USD to INR (₹83 rate)

### File Structure

```
server/src/
├── services/
│   ├── tboService.js           # TBO API client
│   ├── tboTransformService.js  # Transform TBO data to our schema
│   └── tboSearchService.js     # Parse Search API responses
├── scripts/
│   ├── syncTBOHotels.js        # Bulk hotel sync
│   ├── removeSeededHotels.js   # Remove old hotels
│   └── generateEmbeddings.js   # Create vector embeddings
└── controllers/
    └── eventController.js      # Updated selectRecommendedHotel()
```

## 📊 Database Schema Updates

### User Model (Hotels)
```javascript
{
  hotelSource: 'tbo' | 'manual' | 'seeded',
  tboData: {
    hotelCode: String,
    cityCode: String,
    countryCode: String,
    starRating: Number,
    latitude: Number,
    longitude: Number,
  },
  // ... other fields
}
```

### HotelProposal Model
```javascript
{
  tboMetadata: {
    searchDate: Date,
    currency: 'INR',
    rawCurrency: 'USD',
    rawRooms: [...],  // Full TBO response
    bookingCodes: {
      singleRoom: String,
      doubleRoom: String,
      suite: String,
    },
  },
  // ... other fields
}
```

## 🔧 TBO API Configuration

### Environment Variables

Add to your `.env` file:

```env
TBO_USERNAME=ApiIntegrationNew
TBO_PASSWORD=Hotel@123
TBO_TOKEN_ID=b2b108d6-c8d1-4796-bf02-695671eb6012
```

### City Codes

| City       | TBO City Code |
|------------|---------------|
| Kolkata    | 130443        |
| Hyderabad  | 130458        |
| Bangalore  | 130995        |
| Mumbai     | 130616        |
| Delhi      | 130500        |

## 🎯 How It Works

### 1. Initial Sync (Offline)
- Fetches hotel list from TBO using `TBOHotelCodeList` API
- Transforms data:
  - ✅ Hotel name, code, star rating
  - ✅ Estimated total rooms (based on star rating)
  - ✅ Inferred specialization (business, resort, luxury, etc.)
  - ✅ Estimated price range in INR
  - ✅ Parsed facilities from TBO facility strings
- Saves to MongoDB as User documents with role='hotel'

### 2. AI Recommendations
- Vector search finds best matching hotels
- Hybrid scoring:
  - 40% vector similarity
  - 25% location match
  - 20% budget alignment
  - 10% capacity fit
  - 5% event type match
- Returns top 10 hotels to planner

### 3. Hotel Selection (Real-time)
- Planner clicks "Select Hotel"
- System calls TBO Search API with:
  - Hotel code
  - Event check-in/check-out dates
  - Room configuration
- Parses response:
  - Smart room categorization (single/double/suite)
  - USD → INR conversion
  - Extract booking codes
- Creates HotelProposal with real pricing
- Stores TBO metadata for booking

### 4. Booking (Future)
- Use stored `bookingCodes` to complete reservation
- TBO Book API integration (to be implemented)

## 🔍 Room Type Categorization Logic

```javascript
// Single Room
'single', 'twin bed', '1 twin' → singleRoom

// Double Room
'double', 'king', 'queen', '2 bed', 'deluxe', 'standard' → doubleRoom

// Suite
'suite', 'presidential', 'executive suite' → suite
```

## 📈 Expected Results

After running all scripts:

- ✅ 60 TBO hotels synced (12 per city)
- ✅ All old seeded hotels removed
- ✅ Vector embeddings generated for AI search
- ✅ Hotels display in microsite with real-time pricing on selection

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
docker-compose ps

# Restart MongoDB
docker-compose restart mongo
```

### TBO API Error
- Verify credentials in `.env`
- Check TBO API status
- Review logs for specific error messages

### No Hotels Found
- Check city codes are correct
- Verify TBO API credentials
- Check network connectivity

## 📝 Testing

1. Create a test event as a planner
2. Navigate to event's Hotels Management page
3. AI recommendations should show TBO hotels
4. Select a hotel
5. Verify:
   - Hotel appears in selected hotels
   - Pricing is in INR
   - Room types are categorized correctly
   - Microsite shows hotel details

## 🔄 Re-syncing Hotels

To refresh hotel data:

```bash
# Remove existing TBO hotels
cd server
node -e "require('./src/config/database.js'); const User = require('./src/models/User.js').default; User.deleteMany({hotelSource: 'tbo'}).then(() => process.exit());"

# Re-sync
node src/scripts/syncTBOHotels.js

# Re-generate embeddings
node src/scripts/generateEmbeddings.js
```

## ⚡ Next Steps

1. ✅ Complete TBO Book API integration
2. ✅ Add room availability checking
3. ✅ Implement cancellation policies
4. ✅ Add payment processing for TBO bookings
5. ✅ Set up periodic hotel data refresh (CRON job)

---

**Built with:** Node.js, MongoDB, Qdrant, OpenAI Embeddings, TBO Hotel API
