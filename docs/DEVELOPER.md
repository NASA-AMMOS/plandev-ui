# Developer

This document describes how to set up your development environment to build and test aerie-ui.

* [Prerequisite Software](#prerequisite-software)
* [Getting the Sources](#getting-the-sources)
* [Configuring NPM](#configuring-npm)
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

## Getting the Sources

Clone the aerie-ui repository:

1. Login to your JPL GitHub account
1. [Clone](https://help.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) the [aerie-ui repository](https://github.jpl.nasa.gov/MPS/aerie-ui).

```shell
git clone git@github.jpl.nasa.gov:MPS/aerie-ui.git
cd aerie-ui
```

## Configuring NPM

This project makes use of packages in the [aerie-js](https://github.jpl.nasa.gov/Aerie/aerie-js) repository. These packages are stored in the private Artifactory [npm-release-local](https://artifactory.jpl.nasa.gov/artifactory/webapp/#/artifacts/browse/tree/General/npm-release-local) repository. In order to pull packages from `npm-release-local`, you need to configure NPM via `~/.npmrc` by following [these instructions](https://github.jpl.nasa.gov/Aerie/aerie-js#installation-prerequisites).

## Installing NPM Modules

Next, install the JavaScript modules needed to build and test aerie-ui:

```shell
npm install
```

## Start API Server

```shell
cd server
npm start
```

## Start Development Server

Run `npm start` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Building

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `npm run build:prod` flag for a production build.

## Running Unit Tests

Run `npm test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Before You Commit

Run `npm run pre-commit` to execute formatting, linting, and unit testing.
