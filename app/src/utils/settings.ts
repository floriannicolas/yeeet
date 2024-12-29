export const getDeleteScreenshotAfterUpload = () => {
  return JSON.parse(localStorage.getItem('deleteScreenshotAfterUpload') || 'true');
}

export const setDeleteScreenshotAfterUpload = (value: boolean) => {
  localStorage.setItem('deleteScreenshotAfterUpload', value.toString());
}

export const getScreenshotPath = () => {
  return localStorage.getItem('screenshotPath') || '$HOME/Desktop';
}

export const setScreenshotPath = (value: string) => {
  localStorage.setItem('screenshotPath', value);
}