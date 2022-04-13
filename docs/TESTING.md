# Testing

This document describes the testing development workflow. Tests in this repo are tested using the [Playwright](https://playwright.dev/) testing library.

All test scripts assume a production build of the project is available:

```sh
npm run build
```

## Debug

The debug test script runs the [Playwright inspector](https://playwright.dev/docs/inspector), which runs in headed debug mode so you can step through tests as they execute.

```sh
npm run test:debug
```

## Codegen

The codegen test script runs the [Playwright test generator](https://playwright.dev/docs/codegen), which automatically generates [locators](https://playwright.dev/docs/locators) as you click elements on the page. It can greatly save test development time. The generator requires an instance of the application already running to select against.

```sh
npm run test:dev     # Starts aerie-ui
npm run test:codegen # Starts codegen
```
