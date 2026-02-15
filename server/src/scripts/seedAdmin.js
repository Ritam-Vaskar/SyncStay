import User from '../models/User.js';
import bcrypt from 'bcryptjs';

/**
 * Seeds a default admin user if no admin exists in the database.
 * Reads credentials from env vars ADMIN_EMAIL / ADMIN_PASSWORD,
 * falls back to admin@example.com / admin123456
 */
const seedAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log(`✅ Admin already exists: ${existingAdmin.email}`);
      return;
    }

    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const rawPassword = process.env.ADMIN_PASSWORD || 'password123';

    // Hash manually so we control the exact value
    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    // Use create() — the pre-save hook will see password is already
    // modified and hash again, so we insert directly to avoid double-hash.
    await User.collection.insertOne({
      name: 'Admin',
      email,
      password: hashedPassword,
      role: 'admin',
      phone: '',
      organization: '',
      avatar: null,
      isActive: true,
      isVerified: true,
      lastLogin: null,
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`🌱 Default admin seeded — email: ${email}  password: ${rawPassword}`);
  } catch (error) {
    console.error('❌ Admin seed failed:', error.message);
  }
};

export default seedAdmin;
