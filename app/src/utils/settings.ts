export const getDeleteScreenshotAfterUpload = () => {
  return JSON.parse(localStorage.getItem('deleteScreenshotAfterUpload') || 'true');
}

export const setDeleteScreenshotAfterUpload = (value: boolean) => {
  localStorage.setItem('deleteScreenshotAfterUpload', value.toString());
}

export const getDebugMode = () => {
  return JSON.parse(localStorage.getItem('debugMode') || 'false');
}

export const setDebugMode = (value: boolean) => {
  localStorage.setItem('debugMode', value.toString());
}

export const getScreenshotPath = () => {
  return localStorage.getItem('screenshotPath') || '$HOME/Desktop';
}

export const setScreenshotPath = (value: string) => {
  localStorage.setItem('screenshotPath', value);
}

export const setScreenshotPathIfNull = (value: string) => {
  if (!localStorage.getItem('screenshotPath')) {
    localStorage.setItem('screenshotPath', value);
  }
}