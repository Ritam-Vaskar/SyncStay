import TelegramBot from 'node-telegram-bot-api';
import config from '../config/index.js';
import User from '../models/User.js';

let bot = null;

/**
 * Initialize the Telegram bot instance.
 * - Production: webhook mode (bot just listens, webhook must be set manually via curl)
 * - Development: only starts if TELEGRAM_BOT_POLLING=true is set in .env
 *
 * To register the webhook for production, run:
 *   curl -F "url=https://ssapi.fedkiit.com/api/telegram/webhook" \
 *        https://api.telegram.org/bot<TOKEN>/setWebhook
 *
 * To remove the webhook:
 *   curl https://api.telegram.org/bot<TOKEN>/deleteWebhook
 */
export const initTelegramBot = () => {
  const token = config.telegramBotToken;

  if (!token) {
    console.log('⚠️  TELEGRAM_BOT_TOKEN not set — Telegram bot disabled');
    return null;
  }

  const isProduction = config.env === 'production';
  const enablePolling = process.env.TELEGRAM_BOT_POLLING === 'true';

  if (isProduction) {
    // Webhook mode — no polling, no auto setWebhook
    // Telegram pushes updates to POST /api/telegram/webhook
    // You must manually register the webhook once via curl (see above)
    bot = new TelegramBot(token, { webHook: false });
    console.log('🤖 Telegram bot initialized (webhook mode — waiting for updates)');
  } else if (enablePolling) {
    // Local dev — opt-in polling mode (only when explicitly enabled)
    bot = new TelegramBot(token, { polling: true });
    console.log('🤖 Telegram bot initialized (polling mode — local dev)');
  } else {
    console.log('ℹ️  Telegram bot skipped in dev (set TELEGRAM_BOT_POLLING=true to enable locally)');
    return null;
  }

  // ── /start ─────────────────────────────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await User.findOne({ telegramId: String(chatId) });

    if (user) {
      bot.sendMessage(
        chatId,
        `👋 Welcome back, *${user.name}*!\n\nYou're linked as *${user.email}* (${user.role}).\n\nJust type your question and I'll forward it to the SyncStay AI agent.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      const registerUrl = config.clientUrl.split(',')[0].trim();
      bot.sendMessage(
        chatId,
        `👋 Welcome to *SyncStay Bot*!\n\n` +
          `You need a SyncStay account to use this bot.\n\n` +
          `1️⃣  Register here: ${registerUrl}/register\n` +
          `2️⃣  Then link your Telegram by sending:\n` +
          `\`/link your@email.com yourPassword\``,
        { parse_mode: 'Markdown' }
      );
    }
  });

  // ── /link <email> <password> ───────────────────────────────────────
  bot.onText(/\/link\s+(\S+)\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const email = match[1].toLowerCase().trim();
    const password = match[2];

    try {
      // Check if this chat is already linked
      const existingLink = await User.findOne({ telegramId: String(chatId) });
      if (existingLink) {
        return bot.sendMessage(
          chatId,
          `✅ You are already linked as *${existingLink.email}*.\nUse /unlink first to switch accounts.`,
          { parse_mode: 'Markdown' }
        );
      }

      // Find user by email (need password field for comparison)
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return bot.sendMessage(
          chatId,
          '❌ No account found with that email. Please register first on SyncStay.'
        );
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return bot.sendMessage(chatId, '❌ Incorrect password. Please try again.');
      }

      // Check if someone else already linked this account
      if (user.telegramId && user.telegramId !== String(chatId)) {
        return bot.sendMessage(
          chatId,
          '⚠️ This SyncStay account is already linked to another Telegram account.'
        );
      }

      // Link
      user.telegramId = String(chatId);
      await user.save({ validateModifiedOnly: true });

      bot.sendMessage(
        chatId,
        `🎉 Successfully linked!\n\nAccount: *${user.name}* (${user.email})\nRole: *${user.role}*\n\nYou can now send messages and I'll forward them to the SyncStay AI agent.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Telegram /link error:', err.message);
      bot.sendMessage(chatId, '⚠️ Something went wrong. Please try again later.');
    }
  });

  // ── /unlink ────────────────────────────────────────────────────────
  bot.onText(/\/unlink/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      const user = await User.findOne({ telegramId: String(chatId) });
      if (!user) {
        return bot.sendMessage(chatId, 'ℹ️ No account is linked to this Telegram chat.');
      }

      user.telegramId = null;
      await user.save({ validateModifiedOnly: true });

      bot.sendMessage(chatId, '✅ Account unlinked successfully. Use /link to connect again.');
    } catch (err) {
      console.error('Telegram /unlink error:', err.message);
      bot.sendMessage(chatId, '⚠️ Something went wrong. Please try again later.');
    }
  });

  // ── /help ──────────────────────────────────────────────────────────
  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `🤖 *SyncStay Bot Commands*\n\n` +
        `/start  — Welcome & status\n` +
        `/link email password — Link your SyncStay account\n` +
        `/unlink — Unlink your account\n` +
        `/help   — Show this help\n\n` +
        `Once linked, just type a message and I'll forward it to the SyncStay AI agent.`,
      { parse_mode: 'Markdown' }
    );
  });

  // ── General messages → forward to ML agent ─────────────────────────
  bot.on('message', async (msg) => {
    // Ignore commands (already handled above)
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    try {
      // Find linked user
      const user = await User.findOne({ telegramId: String(chatId) });
      if (!user) {
        const registerUrl = config.clientUrl.split(',')[0].trim();
        return bot.sendMessage(
          chatId,
          `⚠️ You haven't linked your SyncStay account yet.\n\n` +
            `1️⃣  Register: ${registerUrl}/register\n` +
            `2️⃣  Link: \`/link your@email.com yourPassword\``,
          { parse_mode: 'Markdown' }
        );
      }

      // Send "typing" indicator
      bot.sendChatAction(chatId, 'typing');

      // Forward to ML server's /agent/query endpoint
      const mlResponse = await fetch(`${config.mlServerUrl}/agent/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: String(user._id),
          query: text.trim(),
        }),
      });

      if (!mlResponse.ok) {
        console.error('ML agent error from Telegram:', mlResponse.status);
        return bot.sendMessage(
          chatId,
          '⚠️ The AI agent is currently unavailable. Please try again later.'
        );
      }

      const data = await mlResponse.json();

      if (data.guardrail_blocked) {
        return bot.sendMessage(
          chatId,
          '🚫 ' + (data.answer || 'Your query was blocked by safety filters.')
        );
      }

      // Send the agent's answer back
      bot.sendMessage(chatId, data.answer || 'No response from the agent.', {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('Telegram message handler error:', err.message);
      bot.sendMessage(
        chatId,
        '⚠️ Something went wrong while processing your message. Please try again.'
      );
    }
  });

  return bot;
};

/**
 * Get the bot instance.
 */
export const getBot = () => bot;

export default { initTelegramBot, getBot };
