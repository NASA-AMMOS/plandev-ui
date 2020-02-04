# Developer

This document describes how to set up your development environment to build and test aerie-ui.

* [Prerequisite Software](#prerequisite-software)
* [Getting the Sources](#getting-the-sources)
* [Installing NPM Modules](#installing-npm-modules)
* [Start Development Server](#start-development-server)
* [Building](#building)
* [Running Unit Tests](#running-unit-tests)

## Prerequisite Software

Before you can build and test aerie-ui, you must install and configure the
following products on your development machine:

* [Git](http://git-scm.com) and/or the **GitHub app** (for [Mac](http://mac.github.com) or [Windows](http://windows.github.com)); [GitHub's Guide to Installing Git](https://help.github.com/articles/set-up-git) is a good source of information.

* [Node.js](http://nodejs.org), (version specified in the engines field of [`package.json`](../package.json)) which is used to run a development web server, run tests, and generate distributable files. If you're on OSX you can use [brew](https://brew.sh/):
```shell
brew install node
```

* [Yarn](https://yarnpkg.com) (version specified in the engines field of [`package.json`](../package.json)) which is used to install dependencies.
```shell
npm i yarn -g
```

## Getting the Sources

Clone the aerie-ui repository:

1. Login to your JPL GitHub account
1. [Clone](https://help.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) the [aerie-ui repository](https://github.jpl.nasa.gov/MPS/aerie-ui).

```shell
git clone git@github.jpl.nasa.gov:MPS/aerie-ui.git
cd aerie-ui
```

## Installing NPM Modules

Next, install the JavaScript modules needed to build and test aerie-ui:

```shell
yarn install
```

## Start Development Server

Run `yarn start` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Building

Run `yarn build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running Unit Tests

Run `yarn test` to execute the unit tests via [Karma](https://karma-runner.github.io).
