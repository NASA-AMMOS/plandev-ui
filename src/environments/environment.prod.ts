const windowBaseUrl = `${window.location.protocol}//${window.location.hostname}`;

export const environment = {
  aerieApolloServerUrl: `${windowBaseUrl}:27184`,
  aerieUiServerUrl: windowBaseUrl,
  production: true,
};
