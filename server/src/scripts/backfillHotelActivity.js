/**
 * Backfill Hotel Activity
 *
 * One-shot script to seed HotelActivity records from existing selected proposals
 * and re-generate activity-history embeddings for every involved hotel.
 *
 * Run: node server/src/scripts/backfillHotelActivity.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });

import connectDB from '../config/database.js';
import { initializeCollections } from '../config/qdrant.js';
// All models must be imported before any populate() call so mongoose
// registers their schemas. Order matters: base models first.
import '../models/User.js';
import '../models/Event.js';
import HotelProposal from '../models/HotelProposal.js';
import HotelActivity from '../models/HotelActivity.js';
import { updateHotelActivityEmbedding } from '../services/embeddingService.js';

async function main() {
  await connectDB();
  console.log('✅ Connected to MongoDB');

  // Ensure all Qdrant collections exist (creates hotels_activity_vectors if missing)
  await initializeCollections();
  console.log('✅ Qdrant collections ready');

  // Fetch all selected proposals with populated event + hotel
  const proposals = await HotelProposal.find({ selectedByPlanner: true })
    .populate('event', 'name type expectedGuests location startDate status')
    .populate('hotel', 'name');

  console.log(`📋 Found ${proposals.length} selected proposals`);

  let created = 0;
  let skipped = 0;

  for (const proposal of proposals) {
    const { event, hotel } = proposal;
    if (!event || !hotel) { skipped++; continue; }

    const outcome = event.status === 'completed' ? 'completed'
      : event.status === 'cancelled' ? 'cancelled'
      : event.status === 'active' ? 'ongoing'
      : 'selected';

    const scale = event.expectedGuests > 500 ? 'large'
      : event.expectedGuests > 100 ? 'medium'
      : 'small';

    await HotelActivity.findOneAndUpdate(
      { hotel: hotel._id, event: event._id },
      {
        $setOnInsert: {
          hotel: hotel._id,
          event: event._id,
          eventType: event.type || 'other',
          eventName: event.name,
          eventScale: scale,
          eventLocation: event.location?.city || '',
          eventDate: event.startDate,
          source: 'backfill',
        },
        $set: { outcome },
      },
      { upsert: true, new: true }
    );
    created++;
    process.stdout.write(`\r   Upserted: ${created}`);
  }
  console.log(`\n✅ Upserted ${created} activity records, skipped ${skipped}`);

  // Regenerate activity-history embeddings for every unique hotel
  const uniqueHotelIds = [...new Set(proposals.map(p => p.hotel?._id?.toString()).filter(Boolean))];
  console.log(`\n🤖 Regenerating embeddings for ${uniqueHotelIds.length} hotels...`);

  let done = 0;
  for (const hotelId of uniqueHotelIds) {
    try {
      await updateHotelActivityEmbedding(hotelId);
      done++;
      process.stdout.write(`\r   Embedded: ${done}/${uniqueHotelIds.length}`);
    } catch (err) {
      console.error(`\n❌ Hotel ${hotelId}: ${err.message}`);
    }
  }

  console.log(`\n🎉 Done. ${done}/${uniqueHotelIds.length} hotels embedded.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
