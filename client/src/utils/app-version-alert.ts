export const getAppVersionAlertClosed = () => {
  return JSON.parse(sessionStorage.getItem('appVersionAlertClosed') || 'false');
}

export const setAppVersionAlertClosed = (value: boolean) => {
  sessionStorage.setItem('appVersionAlertClosed', value.toString());
}
