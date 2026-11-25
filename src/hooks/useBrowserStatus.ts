"use client";

import { useSyncExternalStore } from "react";
import { LOCALE_COOKIE_NAME, type Locale } from "@/i18n/config";

function noopSubscribe() {
  return () => {};
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function subscribeDisplayMode(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
}

export function useIsStandalone(): boolean {
  return useSyncExternalStore(
    subscribeDisplayMode,
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false
  );
}

export function useIsIos(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => /iPad|iPhone|iPod/.test(navigator.userAgent),
    () => false
  );
}

export function useHasServiceWorker(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => "serviceWorker" in navigator,
    () => true
  );
}

export function persistLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
