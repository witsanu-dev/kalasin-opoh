'use server';

export async function sendSyncData(endpoint: string, payload: any, customApiKey?: string, customBaseUrl?: string) {
  try {
    const apiKey = customApiKey || process.env.API_KEY || '';
    if (!apiKey) {
      return { success: false, error: 'กรุณาระบุ API Key' };
    }

    const baseUrl = customBaseUrl || 'https://appksn.moph.go.th/opoh/api/v1';
    const url = `${baseUrl}${endpoint}`;

    // Bypass SSL certificate validation for internal/government servers
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'OPOH-Auth-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      success: res.ok,
      status: res.status,
      data,
    };
  } catch (error: any) {
    console.error('sendSyncData error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}
