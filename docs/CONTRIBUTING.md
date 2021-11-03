# Contributing

We would love for you to contribute to aerie-ui and help make it even better than it is
today! As a contributor, here are the guidelines we would like you to follow:

- [Question or Problem?](#question)
- [Submitting a Pull Request (PR)](#submit-pr)
- [Coding Rules](#rules)
- [Commit Message Guidelines](#commit)

## <a name="question"></a> Got a Question or Problem?

If you would like to chat about the question in real-time, you can reach out via [our slack channel][slack].

## <a name="submit-pr"></a> Submitting a Pull Request (PR)

Before you submit your Pull Request (PR) consider the following guidelines:

1. Search [GitHub][github-pulls] for an open or closed PR that relates to your submission. You don't want to duplicate effort.
1. Be sure that an issue describes the problem you're fixing, or documents the design for the feature you'd like to add. Discussing the design up front helps to ensure that we're ready to accept your work.
1. Clone the [Aerie/aerie-ui repo][github].
1. Make your changes in a new git branch:
   ```shell
   git checkout develop
   git pull origin develop
   git checkout -b my-fix-branch develop
   ```
1. Create your patch.
1. Follow our [Coding Rules](#rules).
1. Run the pre-commit script which runs formatting, linting, and static analysis.
   ```shell
   npm run pre-commit
   ```
1. Commit your changes using a descriptive commit message that follows our [commit message conventions](#commit). Adherence to these conventions is necessary because release notes are automatically generated from these messages.
   ```shell
   git commit -a
   ```
   Note: the optional commit `-a` command line option will automatically "add" and "rm" edited files.
1. Push your branch to GitHub:
   ```shell
   git push origin my-fix-branch
   ```
1. In GitHub, send a pull request to `aerie-ui:develop`.

- If we suggest changes then:

  - Make the required updates.
  - Re-run the aerie-ui pre-commit script.
  - [Rebase your branch][rebase] and force push to your branch to GitHub (this will update your Pull Request):

    ```shell
    git rebase develop -i
    git push -f
    ```

After your pull request is merged, you can safely delete your branch and pull the changes from the repository:

- Delete the remote branch on GitHub either through the GitHub web UI or your local shell as follows:

  ```shell
  git push origin --delete my-fix-branch
  ```

- Check out the develop branch:

  ```shell
  git checkout develop
  ```

- Update your develop with the latest version:

  ```shell
  git pull origin develop
  ```

- Delete the local branch:

  ```shell
  git branch -D my-fix-branch
  ```

## <a name="rules"></a> Coding Rules

To ensure consistency throughout the source code, keep these rules in mind as you are working:

- We use [Prettier][prettier] and [ESLint](../eslintrc.cjs) to keep code formatted.
  ```shell
  npm run format
  npm run lint
  npm run check
  ```

## <a name="commit"></a> Commit Message Guidelines

We have very precise rules over how our git commit messages can be formatted. This leads to **more readable messages** that are easy to follow when looking through the **project history**.

### Commit Message Format

Each commit message consists of a **header** and a **body**. The header has a special
format that includes a **type** and a **subject**:

```
<type>: <subject>
<BLANK LINE>
<body>
```

The **header** is mandatory.

Any line of the commit message cannot be longer 100 characters! This allows the message to be easier to read on GitHub as well as in various git tools.

Samples:

```
docs: update readme
```

```
fix: need to depend on latest rxjs and zone.js

The version in our package.json gets copied to the one we publish, and users need the latest of these.
```

([more samples](https://github.jpl.nasa.gov/Aerie/aerie-ui/commits/develop))

### Revert

If the commit reverts a previous commit, it should begin with `revert:`, followed by the header of the reverted commit. In the body it should say: `This reverts commit <hash>.`, where the hash is the SHA of the commit being reverted.

### Type

Must be one of the following:

- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **docs**: Documentation only changes
- **feat**: A new feature
- **fix**: A bug fix
- **perf**: A code change that improves performance
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **test**: Adding missing tests or correcting existing tests

### Subject

The subject contains a succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize the first letter
- no dot (.) at the end

### Body

Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes". The body should include the motivation for the change and contrast this with previous behavior.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

[github]: https://github.jpl.nasa.gov/Aerie/aerie-ui
[github-pulls]: https://github.jpl.nasa.gov/Aerie/aerie-ui/pulls
[prettier]: https://prettier.io/
[rebase]: https://dev.to/maxwell_dev/the-git-rebase-introduction-i-wish-id-had
[slack]: https://app.slack.com/client/T024LMMEZ/C0163E42UBF
