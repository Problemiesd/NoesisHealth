const DEVICE_ID_KEY = "noesis-healthlog-device-id";

export function getOrCreateDeviceId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
