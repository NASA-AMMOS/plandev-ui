# Developer

This document describes how to set up your development environment to build and develop aerie-ui.

- [Prerequisite Knowledge](#prerequisite-knowledge)
- [Prerequisite Software](#prerequisite-software)
- [Code Editor](#code-editor)
- [Getting the Sources](#getting-the-sources)
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

Before you can build aerie-ui, you must install and configure the following products on your development machine:

- [Git](http://git-scm.com) and/or the [GitHub app](https://desktop.github.com/); [GitHub's Guide to Installing Git](https://help.github.com/articles/set-up-git) is a good source of information.

- [Node.js LTS](http://nodejs.org) which is used to run a development web server, and generate distributable files. If you're on OSX you can use [brew](https://brew.sh/):

  ```shell
  brew install node
  ```

## Code Editor

The recommended editor for developing aerie-ui is [VS Code](https://code.visualstudio.com/) with the following settings and extensions. You can easily use another editor of your choice as long as you can replicate code formatting settings.

### Settings.json

```json
{
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

## Building

Run `npm run build` to build the project. The build artifacts will be stored in the `build/` directory.

## Before You Commit

Run `npm run pre-commit` to execute formatting, linting, and static analysis.
