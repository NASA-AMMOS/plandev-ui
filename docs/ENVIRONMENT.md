# Environment

This document provides detailed information about environment variables for Aerie UI.

| Name                           | Description                                                                                               | Type     | Default                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| `ORIGIN`                       | Url of where the UI is served from. See the [Svelte Kit Adapter Node docs][svelte-kit-adapter-node-docs]. | `string` | http://localhost                 |
| `PUBLIC_GATEWAY_CLIENT_URL`    | Url of the Gateway as called from the client (i.e. web browser)                                           | `string` | http://localhost:9000            |
| `PUBLIC_GATEWAY_SERVER_URL`    | Url of the Gateway as called from the server (i.e. Node.js container)                                     | `string` | http://localhost:9000            |
| `PUBLIC_HASURA_CLIENT_URL`     | Url of Hasura as called from the client (i.e. web browser)                                                | `string` | http://localhost:8080/v1/graphql |
| `PUBLIC_HASURA_SERVER_URL`     | Url of Hasura as called from the server (i.e. Node.js container)                                          | `string` | http://localhost:8080/v1/graphql |
| `PUBLIC_HASURA_WEB_SOCKET_URL` | Url of Hasura called to establish a web-socket connection from the client                                 | `string` | ws://localhost:8080/v1/graphql   |
| `PUBLIC_LOGIN_PAGE`            | Set to `enabled` to turn on login page. Otherwise set to `disabled` to turn off login page.               | `string` | enabled                          |
