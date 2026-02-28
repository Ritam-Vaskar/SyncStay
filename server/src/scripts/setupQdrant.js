import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { initializeCollections } from '../config/qdrant.js';
import config from '../config/index.js';

dotenv.config();

/**
 * Setup script to initialize Qdrant collections
 */
async function setupQdrant() {
  try {
    console.log('🚀 Starting Qdrant setup...\n');

    // Connect to MongoDB (for validation)
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Initialize Qdrant collections
    const success = await initializeCollections();

    if (success) {
      console.log('\n✅ Qdrant setup completed successfully!');
      console.log('\n📊 Collection Summary:');
      console.log('   - events_vectors: Event embeddings');
      console.log('   - hotels_vectors: Hotel embeddings');
      console.log('   - users_vectors: User preference vectors');
      console.log('   - planners_vectors: Planner preference vectors');
      console.log('\n🎯 Next Steps:');
      console.log('   1. Set OPENAI_API_KEY in .env file');
      console.log('   2. Run: node src/scripts/generateEmbeddings.js');
      console.log('   3. Start the server: npm run dev\n');
    } else {
      console.log('\n❌ Qdrant setup failed');
      process.exit(1);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run setup
setupQdrant();
