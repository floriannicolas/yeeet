"use client";

export const getAppVersionAlertClosed = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return false;
  }
  return JSON.parse(window.sessionStorage.getItem('appVersionAlertClosed') || 'false');
}

export const setAppVersionAlertClosed = (value: boolean) => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }
  window.sessionStorage.setItem('appVersionAlertClosed', value.toString());
}
