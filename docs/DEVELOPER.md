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
2. [Svelte Tutorial](https://svelte.dev/tutorial/basics)
3. [Svelte Kit Documentation](https://kit.svelte.dev/docs)
4. [TailwindCSS Documentation](https://v3.tailwindcss.com/docs/utility-first)

## Prerequisite Software

Before you can run aerie-ui you must install and configure the following products on your development machine:

- [Git](http://git-scm.com) and/or the [GitHub app](https://desktop.github.com/); [GitHub's Guide to Installing Git](https://help.github.com/articles/set-up-git) is a good source of information.

- [Node.js LTS](http://nodejs.org) which is used to run a development web server, and generate distributable files. We recommend using the [Node Version Manager (NVM)](https://github.com/nvm-sh/nvm) to install Node.js and [NPM](https://www.npmjs.com/) on your machine. Once you have NVM installed you can use the required Node.js/NPM versions via:

  ```shell
  cd aerie-ui
  nvm use
  ```

- [OpenJDK Temurin LTS](https://adoptium.net/temurin/) which is used to build the Java-based Aerie services. If you're on OSX you can use [brew](https://brew.sh/):

  ```shell
  brew tap homebrew/cask-versions
  brew install --cask temurin19
  ```

  Make sure you update your `JAVA_HOME` environment variable. For example with [Zsh](https://www.zsh.org/) you can set your `.zshrc` to:

  ```shell
  export JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-19.jdk/Contents/Home"
  ```

- [Docker](https://www.docker.com/) which is used to run the Aerie services.

- [Aerie](https://github.com/NASA-AMMOS/aerie) which contains the main backend services. You can use the following commands to download, build, and run Aerie:

  (NOTE: For compatibility with VSCode tasks, ensure that both Aerie UI and Aerie repos share the same parent directory and that NVM is installed for node version management)

  ```sh
  git clone https://github.com/NASA-AMMOS/aerie.git
  cd aerie
  cp .env.template .env
  ```

  Fill out the `.env` file with the following default environment variables:

  ```sh
  AERIE_PASSWORD=aerie
  AERIE_USERNAME=aerie
  HASURA_GRAPHQL_ADMIN_SECRET=aerie
  HASURA_GRAPHQL_JWT_SECRET='{ "type": "HS256", "key": "oursupersecretsupersecurekey1234567890" }'
  POSTGRES_PASSWORD=postgres
  POSTGRES_USER=postgres
  ```

  Next build Aerie, and start the services via Docker:

  Via VSCode tasks: (refer to to the [development section](#development))

  - Run the `Build Aerie` task to build Aerie
  - Run the `Aerie Containers` task, to bring up all the containers

  Via CLI:

  ```sh
  ./gradlew assemble

  # Notice we exclude the aerie_ui since we run it locally (i.e. not in Docker) for development.
  docker-compose up --build --detach aerie_gateway aerie_merlin aerie_scheduler aerie_merlin_worker_1 aerie_merlin_worker_2 aerie_scheduler_worker_1 aerie_scheduler_worker_2 aerie_sequencing hasura postgres
  ```

  To stop and clean the Aerie services:

  Via VSCode task:

  Run the `Clean Aerie` task

  ```sh
  cd aerie
  docker-compose down
  docker rmi aerie_merlin aerie_scheduler aerie_merlin_worker_1 aerie_merlin_worker_2 aerie_scheduler_worker_1 aerie_scheduler_worker_2 aerie_sequencing
  docker volume prune --force
  ./gradlew clean
  ```

  You should stop and clean the Aerie services after each use (e.g. at the end of the day), or right after pulling down the latest changes.

## Code Editor

The recommended editor for developing aerie-ui is [VS Code](https://code.visualstudio.com/) with the following settings and extensions. You can easily use another editor of your choice as long as you can replicate the code formatting settings.

### Settings.json

Your editor should follow the same settings found in [.vscode/settings.json](../.vscode/settings.json).

### Extensions

1. [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
1. [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
1. [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
1. [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)
1. [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
1. [GraphQL](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql)
1. [Path Intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.path-intellisense)
1. [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)
1. [Task Explorer](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer)

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

## Development

Via VSCode task:

Run the `Development` task to start everything including the Aerie containers.

The `Development` task runs the following tasks:

- `Aerie UI`
- `Aerie Containers`
- `Svelte Check`
- `Unit Tests`

Via CLI:

Run `npm run dev` for a dev server. Navigate to `http://localhost:3000/`. The app will automatically reload if you change any of the source files. Since we have observed some issues using [monaco-editor](https://microsoft.github.io/monaco-editor/) with the dev server on Firefox, we recommend using Chrome for development.

## Building For Production

Via VSCode task:

Run the `UI Build` task

Via CLI:

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

## Styling

Aerie UI uses TailwindCSS version 3 as its CSS styling solution. TailwindCSS is a CSS framework that provides dynamic utility classes that increase consistency and themability in the UI. TailwindCSS classes are preferred over semantic class names in Aerie UI (this is an ongoing process). If semantic class names are needed for a particular case, it is recommended that you use a tailwind `@apply` directive to include the tailwind classes within the semantic class instead of writing vanilla CSS so that all of the themeing variables are properly included.
