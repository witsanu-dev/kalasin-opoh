/**
 * Next.js Server Lifecycle Instrumentation Hook
 * Runs once when the Next.js server starts up.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initAutoSyncScheduler } = await import('@/lib/services/opoh-sync-service');
      await initAutoSyncScheduler();
      console.log('[INSTRUMENTATION] ✅ OPOH Auto-Sync background service initialized.');
    } catch (err) {
      console.error('[INSTRUMENTATION] ❌ Failed to register OPOH Auto-Sync service:', err);
    }
  }
}
