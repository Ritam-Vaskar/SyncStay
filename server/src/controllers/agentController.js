import config from '../config/index.js';

/**
 * POST /api/agent/query
 * Proxy the user's query to the ML server agent, injecting the authenticated user_id.
 */
export const queryAgent = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, message: 'query is required' });
    }

    const userId = req.user.id || req.user._id;

    const response = await fetch(`${config.mlServerUrl}/agent/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: String(userId), query: query.trim() }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ML agent error:', response.status, errorText);
      return res
        .status(502)
        .json({ success: false, message: 'Agent service unavailable' });
    }

    const data = await response.json();

    return res.json({
      success: true,
      answer: data.answer,
      guardrailBlocked: data.guardrail_blocked || false,
      blockReason: data.block_reason || null,
    });
  } catch (error) {
    console.error('Agent proxy error:', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};
