# Developer

This document describes how to set up your development environment to build and develop aerie-ui.

- [Prerequisite Knowledge](#prerequisite-knowledge)
- [Prerequisite Software](#prerequisite-software)
- [Code Editor](#code-editor)
- [Getting the Sources](#getting-the-sources)
- [Installing NPM Modules](#installing-npm-modules)
- [Start Development Server](#start-development-server)
- [Building For Production](#building-for-production)
- [Cleaning](#cleaning)

## Prerequisite Knowledge

Before getting started with developing in this repository read/watch all of the following resources:

1. [Rich Harris - Rethinking Reactivity](https://www.youtube.com/watch?v=AdNJ3fydeao)
1. [Svelte Tutorial](https://svelte.dev/tutorial/basics)
1. [Svelte Kit Documentation](https://kit.svelte.dev/docs)

## Prerequisite Software

Before you can run aerie-ui you must install and configure the following products on your development machine:

- [Git](http://git-scm.com) and/or the [GitHub app](https://desktop.github.com/); [GitHub's Guide to Installing Git](https://help.github.com/articles/set-up-git) is a good source of information.

- [Node.js LTS](http://nodejs.org) which is used to run a development web server, and generate distributable files. If you're on OSX you can use [brew](https://brew.sh/):

  ```shell
  brew install node
  ```

- [OpenJDK Temurin LTS](https://adoptium.net/temurin/) which is used to build the Java-based Aerie services. If you're on OSX you can use [brew](https://brew.sh/):

  ```shell
  brew install --cask temurin
  ```

  Make sure you update your `JAVA_HOME` environment variable. For example with [Zsh](https://www.zsh.org/) you can set your `.zshrc` to:

  ```shell
  export JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-18.jdk/Contents/Home"
  ```

- [Docker](https://www.docker.com/) which is used to run the Aerie services.

- [Aerie](https://github.com/NASA-AMMOS/aerie) which contains the main backend services. You can use the following commands to download, build, and run Aerie:

  ```sh
  git clone https://github.com/NASA-AMMOS/aerie.git
  cd aerie
  ./gradlew assemble

  # Notice we exclude the aerie_ui since we run it locally (i.e. not in Docker) for development.
  docker-compose up --build --detach aerie_commanding aerie_gateway aerie_merlin aerie_scheduler aerie_merlin_worker_1 aerie_merlin_worker_2 hasura postgres
  ```

  To stop and clean the Aerie services do:

  ```sh
  cd aerie
  docker-compose down
  docker rmi aerie_commanding aerie_merlin aerie_scheduler aerie_aerie_merlin_worker_1 aerie_aerie_merlin_worker_2
  docker volume prune --force
  ./gradlew clean
  ```

  You should stop and clean the Aerie services after each use (e.g. at the end of the day), or right after pulling down the latest changes.

## Code Editor

The recommended editor for developing aerie-ui is [VS Code](https://code.visualstudio.com/) with the following settings and extensions. You can easily use another editor of your choice as long as you can replicate the code formatting settings.

### Settings.json

```json
{
  "editor.formatOnSave": true,
  "eslint.validate": ["javascript", "typescript", "svelte"],
  "[svelte][typescript]": {
    "editor.codeActionsOnSave": ["source.fixAll", "source.organizeImports", "source.sortImports"],
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Extensions

1. [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
1. [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
1. [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
1. [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
1. [GraphQL](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql)
1. [Path Intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.path-intellisense)
1. [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)

## Getting the Sources

[Clone](https://help.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) the aerie-ui repository:

```shell
git clone https://github.com/NASA-AMMOS/aerie-ui.git
cd aerie-ui
```

## Installing NPM Modules

Install the JavaScript modules needed to build aerie-ui:

```shell
npm install
```

## Start Development Server

Run `npm run dev` for a dev server. Navigate to `http://localhost:3000/`. The app will automatically reload if you change any of the source files.

## Building For Production

Run `npm run build` to build a production version of the project. The build artifacts will be stored in the `build/` directory.

## Cleaning

Run the following commands to clean dependencies and build artifacts of aerie-ui. To be safe you should do this anytime you pull down the latest changes.

```sh
cd aerie-ui
rm -rf node_modules
rm -rf .svelte-kit
rm -rf build
```

After cleaning you can [re-install NPM modules](#installing-npm-modules) and start development.
