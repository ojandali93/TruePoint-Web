// src/lib/deviceTracking.ts
//
// Small helpers to call the backend on login and logout, recording the
// current device. These are called from login/logout flows; not a React
// hook to keep them flexible.

import api from "./api";
import { getDeviceInfo, getDeviceId } from "./device";

/**
 * Register (or update) the current device on the backend.
 * Called immediately after a successful login.
 *
 * Never throws — device tracking failure shouldn't block login.
 */
export async function registerCurrentDevice(): Promise<void> {
  try {
    const info = getDeviceInfo();
    await api.post("/auth/devices", {
      deviceId: info.deviceId,
      deviceType: info.deviceType,
      deviceName: info.deviceName,
      browser: info.browser,
      os: info.os,
    });
  } catch (err) {
    console.error("[deviceTracking] register failed (non-fatal)", err);
  }
}

/**
 * Mark the current device inactive on the backend.
 * Called immediately BEFORE supabase.auth.signOut() so we still have a session.
 *
 * Never throws — logout should always proceed.
 */
export async function deactivateCurrentDevice(): Promise<void> {
  try {
    const deviceId = getDeviceId();
    if (!deviceId) return;
    await api.post("/auth/devices/logout", { deviceId });
  } catch (err) {
    console.error("[deviceTracking] deactivate failed (non-fatal)", err);
  }
}
