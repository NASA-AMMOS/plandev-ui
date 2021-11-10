# Developer

This document describes how to set up your development environment to build and develop aerie-ui.

- [Prerequisite Knowledge](#prerequisite-knowledge)
- [Prerequisite Software](#prerequisite-software)
- [Getting the Sources](#getting-the-sources)
- [Configuring NPM](#configuring-npm)
- [Installing NPM Modules](#installing-npm-modules)
- [Start Development Server](#start-development-server)
- [Building](#building)
- [Before You Commit](#before-you-commit)

## Prerequisite Knowledge

Before getting started with developing in this repository read/watch all of the following resources:

1. [Rich Harris - Rethinking Reactivity](https://www.youtube.com/watch?v=AdNJ3fydeao)
1. [Svelte Tutorial](https://svelte.dev/tutorial/basics)
1. [Svelte Kit Documentation](https://kit.svelte.dev/docs)

## Prerequisite Software

Before you can build and test aerie-ui, you must install and configure the
following products on your development machine:

- [Git](http://git-scm.com) and/or the **GitHub app** (for [Mac](http://mac.github.com) or [Windows](http://windows.github.com)); [GitHub's Guide to Installing Git](https://help.github.com/articles/set-up-git) is a good source of information.

- [Node.js LTS](http://nodejs.org) which is used to run a development web server, and generate distributable files. If you're on OSX you can use [brew](https://brew.sh/):

  ```shell
  brew install node
  ```

## Getting the Sources

Clone the aerie-ui repository:

1. Login to your JPL GitHub account
1. [Clone](https://help.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) the [aerie-ui repository](https://github.jpl.nasa.gov/MPS/aerie-ui).

```shell
git clone git@github.jpl.nasa.gov:Aerie/aerie-ui.git
cd aerie-ui
```

## Configuring NPM

This project makes use of packages in the [stellar](https://github.jpl.nasa.gov/Stellar) repository. These packages are stored in the private Artifactory [npm-release-local](https://artifactory.jpl.nasa.gov/artifactory/webapp/#/artifacts/browse/tree/General/npm-release-local) repository. In order to pull packages from `npm-release-local`, you need to configure NPM via `~/.npmrc` by following [these instructions](https://github.jpl.nasa.gov/Stellar/stellar#installation-prerequisites).

## Installing NPM Modules

Next, install the JavaScript modules needed to build aerie-ui:

```shell
npm install
```

## Start Development Server

Run `npm run dev` for a dev server. Navigate to `http://localhost:3000/`. The app will automatically reload if you change any of the source files.

## Building

Run `npm run build` to build the project. The build artifacts will be stored in the `build/` directory.

## Before You Commit

Run `npm run pre-commit` to execute formatting, linting, and static analysis.
