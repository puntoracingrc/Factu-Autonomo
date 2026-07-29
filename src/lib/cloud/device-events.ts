"use client";

export const CLOUD_DEVICE_REACTIVATED_EVENT =
  "factu:cloud-device-reactivated";

export function notifyCloudDeviceReactivated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLOUD_DEVICE_REACTIVATED_EVENT));
}
