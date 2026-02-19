#!/usr/bin/env node
/**
 * Test Recommendation System Components
 * Verifies all components work without requiring Qdrant/OpenAI to be running
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from '../models/Event.js';
import User from '../models/User.js';

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

async function testRecommendationSystem() {
  try {
    // Connect to MongoDB
    log.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to MongoDB');

    // Test 1: Check Event Model
    log.info('\n📊 Test 1: Checking Event Model...');
    const eventCount = await Event.countDocuments();
    const activeEvents = await Event.countDocuments({ status: 'active' });
    log.success(`Found ${eventCount} total events (${activeEvents} active)`);
    
    const eventsWithVectors = await Event.countDocuments({ vectorId: { $exists: true } });
    if (eventsWithVectors > 0) {
      log.success(`${eventsWithVectors} events have embeddings`);
    } else {
      log.warn('No events have embeddings yet. Run generateEmbeddings.js after setting up Qdrant');
    }

    // Test 2: Check User Model
    log.info('\n👥 Test 2: Checking User Model...');
    const userCount = await User.countDocuments();
    const hotelCount = await User.countDocuments({ role: 'hotel' });
    log.success(`Found ${userCount} total users (${hotelCount} hotels)`);
    
    const hotelsWithVectors = await User.countDocuments({ 
      role: 'hotel',
      vectorId: { $exists: true } 
    });
    if (hotelsWithVectors > 0) {
      log.success(`${hotelsWithVectors} hotels have embeddings`);
    } else {
      log.warn('No hotels have embeddings yet. Run generateEmbeddings.js after setting up Qdrant');
    }

    // Test 3: Check Activity Models
    log.info('\n📈 Test 3: Checking Activity Models...');
    try {
      const UserActivity = (await import('../models/UserActivity.js')).default;
      const PlannerActivity = (await import('../models/PlannerActivity.js')).default;
      
      const userActivities = await UserActivity.countDocuments();
      const plannerActivities = await PlannerActivity.countDocuments();
      
      log.success(`User activities: ${userActivities}`);
      log.success(`Planner activities: ${plannerActivities}`);
    } catch (error) {
      log.error(`Activity models check failed: ${error.message}`);
    }

    // Test 4: Check Environment Variables
    log.info('\n🔧 Test 4: Checking Configuration...');
    const configs = {
      'OpenAI API Key': process.env.OPENAI_API_KEY,
      'Qdrant URL': process.env.QDRANT_URL,
      'MongoDB URI': process.env.MONGODB_URI
    };

    for (const [name, value] of Object.entries(configs)) {
      if (!value || value.includes('your-') || value.includes('example')) {
        log.warn(`${name} not configured`);
      } else {
        log.success(`${name} configured`);
      }
    }

    // Test 5: Sample Data
    log.info('\n📝 Test 5: Sample Data Check...');
    const sampleEvent = await Event.findOne({ status: 'active' }).lean();
    if (sampleEvent) {
      log.success('Sample event found:');
      console.log(`   Name: ${sampleEvent.name}`);
      console.log(`   Type: ${sampleEvent.type}`);
      console.log(`   City: ${sampleEvent.location?.city || 'N/A'}`);
      console.log(`   Vector ID: ${sampleEvent.vectorId || 'Not generated'}`);
    } else {
      log.warn('No active events found');
    }

    const sampleHotel = await User.findOne({ role: 'hotel' }).lean();
    if (sampleHotel) {
      log.success('Sample hotel found:');
      console.log(`   Name: ${sampleHotel.name}`);
      console.log(`   City: ${sampleHotel.city || 'N/A'}`);
      console.log(`   Capacity: ${sampleHotel.capacity || 'N/A'}`);
      console.log(`   Vector ID: ${sampleHotel.vectorId || 'Not generated'}`);
    } else {
      log.warn('No hotels found');
    }

    // Test 6: Check Controllers
    log.info('\n🎮 Test 6: Checking Controllers...');
    const controllers = [
      'userActivityController.js',
      'recommendationController.js'
    ];
    
    for (const controller of controllers) {
      try {
        await import(`../controllers/${controller}`);
        log.success(`${controller} loaded successfully`);
      } catch (error) {
        log.error(`${controller} failed to load: ${error.message}`);
      }
    }

    // Test 7: Check Routes
    log.info('\n🛣️  Test 7: Checking Routes...');
    const routes = [
      'activityRoutes.js',
      'recommendationRoutes.js'
    ];
    
    for (const route of routes) {
      try {
        await import(`../routes/${route}`);
        log.success(`${route} loaded successfully`);
      } catch (error) {
        log.error(`${route} failed to load: ${error.message}`);
      }
    }

    // Summary
    log.info('\n📋 SUMMARY');
    console.log('═'.repeat(50));
    
    if (eventCount === 0) {
      log.warn('No events found. Create some events first.');
    }
    
    if (hotelCount === 0) {
      log.warn('No hotels found. Seed hotel data first.');
    }
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-')) {
      log.warn('OpenAI API key not set. Update .env file.');
    }
    
    if (!process.env.QDRANT_URL) {
      log.warn('Qdrant URL not set. Update .env file.');
    }
    
    log.info('\n📖 Next Steps:');
    console.log('1. Start Qdrant: docker-compose -f docker-compose.qdrant.yml up -d');
    console.log('2. Add OpenAI API key to .env file');
    console.log('3. Run: node src/scripts/setupQdrant.js');
    console.log('4. Run: node src/scripts/generateEmbeddings.js');
    console.log('5. Start server and test API endpoints');
    
    log.success('\n✨ Test complete!');

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB');
  }
}

// Run tests
testRecommendationSystem();
