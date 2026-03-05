import User from '../models/User.js';
import config from '../config/index.js';

/**
 * POST /api/telegram/webhook
 * Receives Telegram updates when running in webhook mode.
 * The bot service handles messages via polling, but this endpoint
 * can be used for production webhook setups.
 */
export const handleWebhook = async (req, res) => {
  try {
    const { getBot } = await import('../services/telegramBot.js');
    const bot = getBot();

    if (!bot) {
      return res.status(503).json({ success: false, message: 'Telegram bot not initialized' });
    }

    // Process the incoming update
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('Telegram webhook error:', err.message);
    res.sendStatus(500);
  }
};

/**
 * GET /api/telegram/status
 * Check if the Telegram bot is running and return linked user stats.
 */
export const getStatus = async (req, res) => {
  try {
    const linkedCount = await User.countDocuments({
      telegramId: { $ne: null, $exists: true },
    });

    const { getBot } = await import('../services/telegramBot.js');
    const bot = getBot();

    res.json({
      success: true,
      botActive: !!bot,
      linkedUsers: linkedCount,
    });
  } catch (err) {
    console.error('Telegram status error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
