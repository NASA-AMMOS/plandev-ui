const windowBaseUrl = `${window.location.protocol}//${window.location.hostname}`;

export const environment = {
  adaptationServiceBaseUrl: `${windowBaseUrl}:27182`,
  aerieApolloServerUrl: `${windowBaseUrl}:27184`,
  planServiceBaseUrl: `${windowBaseUrl}:27183`,
  production: true,
  vsCodeServerUrl: `http://100.64.92.85:8081/`,
};
