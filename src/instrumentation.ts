/**
 * Next.js Server Lifecycle Instrumentation Hook
 * Runs once when the Next.js server starts up.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Security verification on startup
    const jwtSecret = process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production') {
      if (!jwtSecret || jwtSecret.trim().length < 32 || jwtSecret.includes('fallback') || jwtSecret.includes('change_me')) {
        console.warn('🚨 [SECURITY WARNING] Insecure or missing JWT_SECRET in production environment! Please set a strong random secret with at least 32 characters in .env.');
      }
    }

    try {
      const { initAutoSyncScheduler } = await import('@/lib/services/opoh-sync-service');
      await initAutoSyncScheduler();
      console.log('[INSTRUMENTATION] ✅ OPOH Auto-Sync background service initialized.');
    } catch (err) {
      console.error('[INSTRUMENTATION] ❌ Failed to register OPOH Auto-Sync service:', err);
    }
  }
}
