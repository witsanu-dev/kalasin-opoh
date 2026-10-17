import localDb from '@/lib/db/local';

export interface OpohSyncConfig {
  id: number;
  is_auto_sync: boolean;
  interval_minutes: number;
  base_url: string;
  api_key?: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_message: string | null;
  updated_at?: string;
  is_running?: boolean;
  next_sync_time?: string | null;
  rate_limited_until?: string | null;
}

export interface OpohSyncLogItem {
  id: number;
  sync_type: 'AUTO' | 'MANUAL';
  endpoint: string;
  status_code: number | null;
  is_success: boolean;
  records_count: number;
  response_data: string | null;
  error_message: string | null;
  duration_ms: number;
  created_at: string;
}

// Global safety bounds
export const SAFE_MINIMUM_INTERVAL_MINUTES = 0.25; // 15 seconds for testing
export const DEFAULT_INTERVAL_MINUTES = 3;
export const HTTP_TIMEOUT_MS = 15000; // 15 seconds per request
export const CIRCUIT_BREAKER_COOLDOWN_MS = 15 * 60 * 1000; // 15 mins cooldown on 429

// Global singleton state on Node.js globalThis to survive Next.js module reloads
declare global {
  var __opohSyncTimer: NodeJS.Timeout | null | undefined;
  var __opohSyncInProgress: boolean | undefined;
  var __opohNextSyncTimestamp: number | null | undefined;
  var __opohTablesInitialized: boolean | undefined;
  var __opohRateLimitedUntil: number | null | undefined;
  var __opohLastOutboundSyncTime: number | undefined;
}

/**
 * Scans Node.js process handles to eliminate any legacy/orphaned timers from earlier server runs
 */
export function cleanUpOrphanedTimers() {
  try {
    if (typeof (process as any)._getActiveHandles === 'function') {
      const handles = (process as any)._getActiveHandles();
      let cleaned = 0;
      for (const h of handles) {
        if (h && typeof h._onTimeout === 'function') {
          const fnStr = h._onTimeout.toString();
          if (
            fnStr.includes('Skipping run') || 
            fnStr.includes('Auto-sync is currently paused') ||
            (fnStr.includes('executeOpohSync') && h !== globalThis.__opohSyncTimer)
          ) {
            clearInterval(h);
            cleaned++;
          }
        }
      }
      if (cleaned > 0) {
        console.log(`[OPOH SYNC] 🧹 Cleaned up ${cleaned} orphaned background timer(s) from Node process.`);
      }
    }
  } catch {
    // Ignore if process handles cannot be accessed
  }
}

/**
 * Format Date to Bangkok ISO-8601 with +07:00 timezone
 */
export function getBangkokIsoTime(): string {
  const d = new Date();
  const bkkTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return bkkTime.toISOString().replace('Z', '+07:00');
}

/**
 * Ensure database tables for config and logs exist
 */
export async function ensureSyncTables() {
  cleanUpOrphanedTimers();
  if (globalThis.__opohTablesInitialized) return;
  try {
    // 1. Config Table
    await localDb.query(`
      CREATE TABLE IF NOT EXISTS opoh_sync_config (
        id INT PRIMARY KEY DEFAULT 1,
        is_auto_sync TINYINT(1) DEFAULT 0,
        interval_minutes DECIMAL(6,2) DEFAULT 3.00,
        base_url VARCHAR(255) DEFAULT 'https://appksn.moph.go.th/opoh/api/v1',
        api_key VARCHAR(255) NULL,
        last_sync_at DATETIME NULL,
        last_sync_status VARCHAR(50) NULL,
        last_sync_message TEXT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure initial row exists (default is disabled until user turns it on)
    await localDb.query(`
      INSERT IGNORE INTO opoh_sync_config (id, is_auto_sync, interval_minutes, base_url)
      VALUES (1, 0, 3.00, 'https://appksn.moph.go.th/opoh/api/v1')
    `);

    // 2. Logs Table
    await localDb.query(`
      CREATE TABLE IF NOT EXISTS opoh_sync_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sync_type VARCHAR(20) NOT NULL,
        endpoint VARCHAR(100) NOT NULL,
        status_code INT NULL,
        is_success TINYINT(1) DEFAULT 0,
        records_count INT DEFAULT 0,
        response_data TEXT NULL,
        error_message TEXT NULL,
        duration_ms INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created (created_at DESC),
        INDEX idx_endpoint (endpoint)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    globalThis.__opohTablesInitialized = true;
  } catch (err) {
    console.error('Failed to initialize opoh_sync tables:', err);
  }
}

/**
 * Get current sync configuration with runtime status
 */
export async function getSyncConfig(): Promise<OpohSyncConfig> {
  await ensureSyncTables();
  try {
    const [rows]: any = await localDb.query(
      'SELECT * FROM opoh_sync_config WHERE id = 1 LIMIT 1'
    );

    if (rows && rows.length > 0) {
      const r = rows[0];
      const interval = Math.max(SAFE_MINIMUM_INTERVAL_MINUTES, parseFloat(String(r.interval_minutes)) || DEFAULT_INTERVAL_MINUTES);
      return {
        id: r.id,
        is_auto_sync: Boolean(r.is_auto_sync === 1 || r.is_auto_sync === true),
        interval_minutes: interval,
        base_url: r.base_url || 'https://appksn.moph.go.th/opoh/api/v1',
        api_key: r.api_key || process.env.API_KEY || '',
        last_sync_at: r.last_sync_at ? new Date(r.last_sync_at).toISOString() : null,
        last_sync_status: r.last_sync_status || null,
        last_sync_message: r.last_sync_message || null,
        is_running: Boolean(globalThis.__opohSyncInProgress),
        next_sync_time: globalThis.__opohNextSyncTimestamp ? new Date(globalThis.__opohNextSyncTimestamp).toISOString() : null,
        rate_limited_until: globalThis.__opohRateLimitedUntil && globalThis.__opohRateLimitedUntil > Date.now()
          ? new Date(globalThis.__opohRateLimitedUntil).toISOString()
          : null,
      };
    }
  } catch (err) {
    console.error('Error fetching sync config:', err);
  }

  return {
    id: 1,
    is_auto_sync: false,
    interval_minutes: DEFAULT_INTERVAL_MINUTES,
    base_url: 'https://appksn.moph.go.th/opoh/api/v1',
    api_key: process.env.API_KEY || '',
    last_sync_at: null,
    last_sync_status: null,
    last_sync_message: null,
    is_running: Boolean(globalThis.__opohSyncInProgress),
    next_sync_time: globalThis.__opohNextSyncTimestamp ? new Date(globalThis.__opohNextSyncTimestamp).toISOString() : null,
    rate_limited_until: globalThis.__opohRateLimitedUntil && globalThis.__opohRateLimitedUntil > Date.now()
      ? new Date(globalThis.__opohRateLimitedUntil).toISOString()
      : null,
  };
}

/**
 * Update sync config with strict validation (Interval strictly >= 1 minute)
 */
export async function updateSyncConfig(updates: {
  is_auto_sync?: boolean | number;
  interval_minutes?: number;
  base_url?: string;
  api_key?: string;
}): Promise<{ success: boolean; config: OpohSyncConfig }> {
  await ensureSyncTables();

  const current = await getSyncConfig();
  const isAuto = updates.is_auto_sync !== undefined ? (updates.is_auto_sync ? 1 : 0) : (current.is_auto_sync ? 1 : 0);
  
  // Enforce minimum 15 seconds (0.25 min)
  let interval = current.interval_minutes;
  if (updates.interval_minutes !== undefined) {
    const rawVal = parseFloat(String(updates.interval_minutes));
    interval = Math.max(SAFE_MINIMUM_INTERVAL_MINUTES, isNaN(rawVal) ? DEFAULT_INTERVAL_MINUTES : rawVal);
  }

  const baseUrl = (updates.base_url !== undefined ? updates.base_url : current.base_url).trim();
  const apiKey = (updates.api_key !== undefined ? updates.api_key : current.api_key || '').trim();

  await localDb.query(`
    UPDATE opoh_sync_config 
    SET is_auto_sync = ?, interval_minutes = ?, base_url = ?, api_key = ?
    WHERE id = 1
  `, [isAuto, interval, baseUrl, apiKey]);

  // If auto sync is enabled, restart scheduler with new interval
  if (isAuto === 1) {
    restartAutoSyncScheduler(interval);
  } else {
    stopAutoSyncScheduler();
  }

  const updatedConfig = await getSyncConfig();
  return { success: true, config: updatedConfig };
}

/**
 * Fetch recent sync logs
 */
export async function getSyncLogs(limit = 50): Promise<OpohSyncLogItem[]> {
  await ensureSyncTables();
  try {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const [rows]: any = await localDb.query(`
      SELECT * 
      FROM opoh_sync_logs 
      ORDER BY id DESC 
      LIMIT ?
    `, [safeLimit]);

    if (!rows || rows.length === 0) return [];

    return rows.map((r: any) => ({
      id: r.id,
      sync_type: r.sync_type,
      endpoint: r.endpoint,
      status_code: r.status_code,
      is_success: Boolean(r.is_success === 1 || r.is_success === true),
      records_count: r.records_count || 0,
      response_data: r.response_data,
      error_message: r.error_message,
      duration_ms: r.duration_ms || 0,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Error fetching sync logs:', err);
    return [];
  }
}

/**
 * Clear or prune sync logs (TRUNCATE or age-based deletion)
 */
export async function clearSyncLogs(
  mode: 'truncate' | 'older_7_days' | 'older_30_days' = 'truncate'
): Promise<{ success: boolean; clearedCount: number; message: string }> {
  await ensureSyncTables();
  try {
    if (mode === 'truncate') {
      await localDb.query('TRUNCATE TABLE opoh_sync_logs');
      return {
        success: true,
        clearedCount: -1,
        message: 'ล้างข้อมูลประวัติ Logs ทั้งหมดและรีเซ็ตตารางเรียบร้อยแล้ว (TRUNCATE TABLE)',
      };
    } else if (mode === 'older_7_days') {
      const [result]: any = await localDb.query(
        'DELETE FROM opoh_sync_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)'
      );
      const count = result?.affectedRows || 0;
      return {
        success: true,
        clearedCount: count,
        message: `ล้าง Logs ที่เก่ากว่า 7 วัน เรียบร้อยแล้ว (จำนวน ${count} รายการ)`,
      };
    } else if (mode === 'older_30_days') {
      const [result]: any = await localDb.query(
        'DELETE FROM opoh_sync_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
      );
      const count = result?.affectedRows || 0;
      return {
        success: true,
        clearedCount: count,
        message: `ล้าง Logs ที่เก่ากว่า 30 วัน เรียบร้อยแล้ว (จำนวน ${count} รายการ)`,
      };
    }
    return { success: false, clearedCount: 0, message: 'รูปแบบการล้างข้อมูลไม่ถูกต้อง' };
  } catch (err: any) {
    console.error('Failed to clear sync logs:', err);
    throw new Error(err.message || 'ไม่สามารถล้างข้อมูลประวัติ Logs ได้');
  }
}

/**
 * Core function to send payload to central API with timeout and SSL handling
 */
async function sendEndpointData(
  baseUrl: string,
  endpoint: string,
  payload: any,
  apiKey: string,
  syncType: 'AUTO' | 'MANUAL'
): Promise<{
  endpoint: string;
  success: boolean;
  status: number | null;
  durationMs: number;
  data?: any;
  error?: string;
}> {
  const startTime = Date.now();
  const url = `${baseUrl.replace(/\/+$/, '')}${endpoint}`;

  // Bypass SSL certificate check for government/internal server
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'OPOH-Auth-Key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    const text = await res.text();
    let parsedData: any;
    try {
      parsedData = JSON.parse(text);
    } catch {
      parsedData = text;
    }

    const isSuccess = res.ok;
    const statusCode = res.status;

    // Detect HTTP 429 Rate Limiting from Central Server & Trip Circuit Breaker
    if (statusCode === 429) {
      globalThis.__opohRateLimitedUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
      console.warn(`[OPOH SYNC] ⚠️ Central server returned HTTP 429 Rate Limit. Circuit breaker activated for 15 minutes.`);
    }

    // Log to DB
    await localDb.query(`
      INSERT INTO opoh_sync_logs 
      (sync_type, endpoint, status_code, is_success, records_count, response_data, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      syncType,
      endpoint,
      statusCode,
      isSuccess ? 1 : 0,
      Array.isArray(payload?.wards) ? payload.wards.length : 1,
      typeof parsedData === 'string' ? parsedData.substring(0, 500) : JSON.stringify(parsedData).substring(0, 500),
      durationMs,
    ]);

    return {
      endpoint,
      success: isSuccess,
      status: statusCode,
      durationMs,
      data: parsedData,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError';
    const errorMsg = isTimeout ? `Request timed out after ${HTTP_TIMEOUT_MS / 1000}s` : (err.message || 'Unknown network error');

    // Log failure
    try {
      await localDb.query(`
        INSERT INTO opoh_sync_logs 
        (sync_type, endpoint, status_code, is_success, error_message, duration_ms)
        VALUES (?, ?, ?, 0, ?, ?)
      `, [syncType, endpoint, isTimeout ? 408 : 500, errorMsg, durationMs]);
    } catch (logErr) {
      console.error('Error logging sync failure:', logErr);
    }

    return {
      endpoint,
      success: false,
      status: isTimeout ? 408 : 500,
      durationMs,
      error: errorMsg,
    };
  }
}

/**
 * Execute full sync of 4 OPOH modules safely and concurrently
 */
export async function executeOpohSync(syncType: 'AUTO' | 'MANUAL' = 'AUTO'): Promise<{
  success: boolean;
  message: string;
  results: Record<string, any>;
  durationMs: number;
}> {
  await ensureSyncTables();

  // 1. Circuit Breaker: Prevent calling central server while in 429 Cooldown
  if (globalThis.__opohRateLimitedUntil && Date.now() < globalThis.__opohRateLimitedUntil) {
    const remainingMin = Math.ceil((globalThis.__opohRateLimitedUntil - Date.now()) / (60 * 1000));
    const msg = `เซิร์ฟเวอร์กลางติด Rate Limit (HTTP 429) ระบบเปิด Circuit Breaker ป้องกันการยิงซ้ำ (กำลัง Cooldown อีก ${remainingMin} นาที เพื่อปกป้อง IP โรงพยาบาล)`;
    console.warn(`[OPOH SYNC] 🛑 ${msg}`);
    return {
      success: false,
      message: msg,
      results: {},
      durationMs: 0,
    };
  }

  // 2. Throttle Guard: Ensure minimum 45s between automated runs to strictly prevent HTTP 429
  if (syncType === 'AUTO' && globalThis.__opohLastOutboundSyncTime && (Date.now() - globalThis.__opohLastOutboundSyncTime < 45000)) {
    const msg = 'ข้ามรอบส่งอัตโนมัติชั่วคราวเนื่องจากเพิ่งส่งข้อมูลไปไม่ถึง 45 วินาที เพื่อป้องกันปัญหา HTTP 429 จากเซิร์ฟเวอร์กลาง';
    console.log(`[OPOH SYNC] 🛡️ Throttle Guard: ${msg}`);
    return {
      success: true,
      message: msg,
      results: {},
      durationMs: 0,
    };
  }

  // 3. Concurrency Guard: Mutex to strictly prevent overlapping sync runs
  if (globalThis.__opohSyncInProgress) {
    return {
      success: false,
      message: 'การส่งข้อมูลกำลังทำงานอยู่แล้ว ข้ามรอบนี้เพื่อป้องกันข้อมูลซ้อนทับ (Concurrency Overload Protection)',
      results: {},
      durationMs: 0,
    };
  }

  globalThis.__opohSyncInProgress = true;
  const overallStart = Date.now();

  try {
    const config = await getSyncConfig();
    const apiKey = config.api_key || process.env.API_KEY || '';

    if (!apiKey) {
      const msg = 'ไม่พบ API Key ในระบบ กรุณาระบุ API Key ที่หน้าระบบส่งข้อมูล OPOH หรือ .env';
      await localDb.query(
        'UPDATE opoh_sync_config SET last_sync_status = "ERROR", last_sync_message = ? WHERE id = 1',
        [msg]
      );
      globalThis.__opohSyncInProgress = false;
      return { success: false, message: msg, results: {}, durationMs: 0 };
    }

    const baseUrl = config.base_url || 'https://appksn.moph.go.th/opoh/api/v1';
    const hospitalCode = process.env.NEXT_PUBLIC_HOSPITAL_CODE || '11078';
    const hospitalName = process.env.NEXT_PUBLIC_HOSPITAL_FULL_NAME || 'โรงพยาบาลกมลาไสย';
    const bangkokTime = getBangkokIsoTime();

    // 1. Read summary tables directly from localDb (< 5ms, non-blocking)
    const [bedRows]: any = await localDb.query(`
      SELECT ward_code, ward_name, total_bed, actual_bed, occupied_bed, export_code
      FROM bed_management_summary
    `);

    const [lrRows]: any = await localDb.query(`
      SELECT * FROM lr_management_summary ORDER BY total_case DESC LIMIT 1
    `);

    const [orRows]: any = await localDb.query(`
      SELECT * FROM or_management_summary LIMIT 1
    `);

    const [sqRows]: any = await localDb.query(`
      SELECT * FROM waiting_or_summary ORDER BY total_cases DESC LIMIT 1
    `);

    // 2. Build 4 standard payloads
    const payloadBeds = {
      hospitalCode,
      updatedAt: bangkokTime,
      wards: (bedRows || []).map((w: any) => {
        const total = Number(w.total_bed) || 0;
        const actual = w.actual_bed !== null && w.actual_bed !== undefined ? Number(w.actual_bed) : total;
        const occupied = Number(w.occupied_bed) || 0;
        const available = Math.max(0, actual - occupied);
        const rate = actual > 0 ? parseFloat(((occupied * 100) / actual).toFixed(2)) : 0;
        return {
          wardCode: w.ward_code,
          wardName: w.ward_name,
          totalBed: total,
          actualBed: actual,
          occupiedBed: occupied,
          availableBed: available,
          occupancyRate: rate,
          exportCode: w.export_code || '',
        };
      }),
    };

    const lr = lrRows && lrRows.length > 0 ? lrRows[0] : null;
    const payloadLr = {
      hospitalCode,
      hospitalName,
      waitingLabor: Number(lr?.waiting_labor) || 0,
      normalDelivery: Number(lr?.normal_delivery) || 0,
      cesareanDelivery: Number(lr?.cesarean_delivery) || 0,
      abortion: Number(lr?.abortion) || 0,
      notDelivery: Number(lr?.not_delivery) || 0,
      totalCase: Number(lr?.total_case) || 0,
    };

    const or = orRows && orRows.length > 0 ? orRows[0] : null;
    const payloadOr = {
      hospitalCode,
      hospitalName,
      roomAvailableStr: or?.room_available_str || '0/0',
      operatingCount: Number(or?.operating_count) || 0,
      waitingCount: Number(or?.waiting_count) || 0,
      completedCount: Number(or?.completed_count) || 0,
      cancelledCount: Number(or?.cancelled_count) || 0,
      totalCaseToday: Number(or?.total_case_today) || 0,
    };

    const sq = sqRows && sqRows.length > 0 ? sqRows[0] : null;
    const payloadSq = {
      hospitalCode,
      hospitalName,
      totalCases: Number(sq?.total_cases) || 0,
      generalSurgery: Number(sq?.general_surgery) || 0,
      orthoSurgery: Number(sq?.ortho_surgery) || 0,
      eyeSurgery: Number(sq?.eye_surgery) || 0,
      obgynSurgery: Number(sq?.obgyn_surgery) || 0,
      urgencyLevelDesc: sq?.urgency_level_desc || 'ฉุกเฉิน (Emergency) 0, เร่งด่วน (Urgency) 0, รอตามนัด (Elective) 0',
    };

    // 3. Staggered dispatching (Anti-Spike Rate Limit Protection with 300ms pause)
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const resBeds = await sendEndpointData(baseUrl, '/sync/beds', payloadBeds, apiKey, syncType);
    await sleep(300);
    const resLr = await sendEndpointData(baseUrl, '/sync/lr', payloadLr, apiKey, syncType);
    await sleep(300);
    const resOr = await sendEndpointData(baseUrl, '/sync/or', payloadOr, apiKey, syncType);
    await sleep(300);
    const resSq = await sendEndpointData(baseUrl, '/sync/surgical-queue', payloadSq, apiKey, syncType);

    globalThis.__opohLastOutboundSyncTime = Date.now();

    const resultsMap = {
      beds: resBeds,
      lr: resLr,
      or: resOr,
      surgical_queue: resSq,
    };

    const allSuccessful = resBeds.success && resLr.success && resOr.success && resSq.success;
    const anySuccessful = resBeds.success || resLr.success || resOr.success || resSq.success;
    const totalDuration = Date.now() - overallStart;

    const status = allSuccessful ? 'สำเร็จ' : anySuccessful ? 'สำเร็จบางส่วน' : 'ไม่สำเร็จ';
    const message = allSuccessful
      ? `ส่งข้อมูลสำเร็จครบทั้ง 4 ส่วนงาน (ใช้เวลา ${totalDuration} ms)`
      : anySuccessful
      ? `ส่งข้อมูลสำเร็จบางส่วน (ใช้เวลา ${totalDuration} ms)`
      : `การส่งข้อมูลล้มเหลว (ตรวจสอบ API Key หรือเครือข่าย)`;

    // Update config status
    await localDb.query(`
      UPDATE opoh_sync_config 
      SET last_sync_at = NOW(), last_sync_status = ?, last_sync_message = ?
      WHERE id = 1
    `, [status, message]);

    return {
      success: anySuccessful,
      message,
      results: resultsMap,
      durationMs: totalDuration,
    };
  } catch (err: any) {
    console.error('Fatal error during OPOH sync:', err);
    return {
      success: false,
      message: err.message || 'เกิดข้อผิดพลาดในการประมวลผลการส่งข้อมูล',
      results: {},
      durationMs: Date.now() - overallStart,
    };
  } finally {
    globalThis.__opohSyncInProgress = false;
  }
}

/**
 * Start or restart the background Ticker Scheduler
 */
export function restartAutoSyncScheduler(intervalMinutes: number) {
  stopAutoSyncScheduler();

  const safeMinutes = Math.max(SAFE_MINIMUM_INTERVAL_MINUTES, Number(intervalMinutes) || DEFAULT_INTERVAL_MINUTES);
  const intervalMs = Math.max(15000, Math.round(safeMinutes * 60 * 1000));

  globalThis.__opohNextSyncTimestamp = Date.now() + intervalMs;
  const displayInterval = safeMinutes < 1 ? `${Math.round(safeMinutes * 60)} วินาที` : `${safeMinutes} นาที`;
  console.log(`[OPOH SYNC] 🚀 Background Scheduler started. Running every ${displayInterval} (intervalMs: ${intervalMs}).`);

  globalThis.__opohSyncTimer = setInterval(async () => {
    try {
      const config = await getSyncConfig();
      if (!config.is_auto_sync) {
        console.log('[OPOH SYNC] Auto-sync is currently turned off. Stopping background scheduler.');
        stopAutoSyncScheduler();
        return;
      }

      // Check Circuit Breaker before executing scheduled sync
      if (globalThis.__opohRateLimitedUntil && Date.now() < globalThis.__opohRateLimitedUntil) {
        const remMin = Math.ceil((globalThis.__opohRateLimitedUntil - Date.now()) / (60 * 1000));
        console.log(`[OPOH SYNC] ⏳ Skipping scheduled sync: Rate limit cooldown in progress (เหลือเวลา Cooldown อีก ${remMin} นาที เพื่อปกป้อง IP โรงพยาบาล)`);
        globalThis.__opohNextSyncTimestamp = Date.now() + intervalMs;
        return;
      }

      console.log(`[OPOH SYNC] ⏰ Triggering scheduled background sync at ${new Date().toISOString()}...`);
      const res = await executeOpohSync('AUTO');
      console.log(`[OPOH SYNC] Result: ${res.message} (สถานะ: ${res.success ? 'สำเร็จ' : 'ไม่สำเร็จ'})`);

      // Update next sync timestamp
      globalThis.__opohNextSyncTimestamp = Date.now() + intervalMs;
    } catch (schedErr) {
      console.error('[OPOH SYNC] Error in auto sync interval:', schedErr);
    }
  }, intervalMs);
}

/**
 * Stop the background scheduler
 */
export function stopAutoSyncScheduler() {
  if (globalThis.__opohSyncTimer) {
    clearInterval(globalThis.__opohSyncTimer);
    globalThis.__opohSyncTimer = null;
  }
  cleanUpOrphanedTimers();
  globalThis.__opohNextSyncTimestamp = null;
  console.log('[OPOH SYNC] 🛑 Background Scheduler stopped.');
}

/**
 * Initialize scheduler once on server startup (only if explicitly enabled by user)
 */
export async function initAutoSyncScheduler() {
  if (globalThis.__opohSyncTimer) return; // Already running in process
  try {
    await ensureSyncTables();
    const config = await getSyncConfig();
    if (config.is_auto_sync) {
      restartAutoSyncScheduler(config.interval_minutes);
    }
  } catch (err) {
    console.error('[OPOH SYNC] Failed to init auto sync scheduler:', err);
  }
}
