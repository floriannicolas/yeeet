export const getApiToken = () => {
  return localStorage.getItem('api_token');
}

export const setApiToken = (token: string) => {
  localStorage.setItem('api_token', token);
}

export const removeApiToken = () => {
  localStorage.removeItem('api_token');
}