# Testing

This document describes the testing development workflow. Tests in this repo are tested using the [Playwright](https://playwright.dev/) testing library.

All tests assume a production build of the project is available:

```sh
npm run build
```

All tests also assume all Aerie services are running and available on `localhost`. See the example [docker-compose-test.yml](../docker-compose-test.yml) for an example of how to run the complete Aerie system. Notice we disable authentication for simplicity when running our end-to-end tests. You can reference the [Aerie deployment documentation](https://github.com/NASA-AMMOS/aerie/tree/develop/deployment) for more detailed deployment information.

To execute tests normally (i.e. not in debug mode), use the following command:

```sh
npm test
```

If this is your first time running the tests you may need to install the Playwright browser drivers:

```sh
npx playwright install
```

If something fails read the Playwright error carefully as it usually describes a quick fix. You can also look for the error in the [Playwright GitHub Issues](https://github.com/microsoft/playwright/issues) if you need more help.

## Debug

The debug test script runs the [Playwright inspector](https://playwright.dev/docs/inspector), which runs in headed debug mode so you can step through tests and watch them as they execute.

```sh
npm run test:debug
```

## Codegen

The codegen test script runs the [Playwright test generator](https://playwright.dev/docs/codegen), which automatically generates [locators](https://playwright.dev/docs/locators) as you click elements on the page. It can greatly save test development time. The generator requires an instance of the application already running to select against.

```sh
npm run test:dev     # Starts aerie-ui
npm run test:codegen # Starts codegen
```
