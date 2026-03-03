/**
 * Platform detection utilities for Capacitor.
 * All functions are SSR-safe (return web defaults during server rendering).
 */

function getCapacitor() {
  if (typeof window === 'undefined') return null;
  try {
    const { Capacitor } = require('@capacitor/core');
    return Capacitor;
  } catch {
    return null;
  }
}

/** True when running inside a Capacitor native shell (Android or iOS). */
export function isNative(): boolean {
  const cap = getCapacitor();
  return cap?.isNativePlatform() ?? false;
}

/** True when running inside the Android native shell. */
export function isAndroid(): boolean {
  const cap = getCapacitor();
  return cap?.getPlatform() === 'android';
}

/** True when running inside the iOS native shell. */
export function isIOS(): boolean {
  const cap = getCapacitor();
  return cap?.getPlatform() === 'ios';
}

/** True when running in a web browser (not native). */
export function isWeb(): boolean {
  return !isNative();
}

/**
 * Execute a function only in native context.
 * Returns the fallback value (or undefined) when on web.
 */
export async function nativeOnly<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  if (isNative()) {
    return fn();
  }
  return fallback;
}
