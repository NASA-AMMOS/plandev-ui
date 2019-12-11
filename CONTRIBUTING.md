# Contributing

We would love for you to contribute to aerie-ui and help make it even better than it is
today! As a contributor, here are the guidelines we would like you to follow:

- [Question or Problem?](#question)
- [Issues and Bugs](#issue)
- [Feature Requests](#feature)
- [Submission Guidelines](#submit)
- [Coding Rules](#rules)
- [Commit Message Guidelines](#commit)

## <a name="question"></a> Got a Question or Problem?

Do not open issues for general support questions as we want to keep GitHub issues for bug reports and feature requests. If you would like to chat about the question in real-time, you can reach out via [our slack channel][slack].

## <a name="issue"></a> Found a Bug?

If you find a bug in the source code, you can help us by
[submitting an issue](#submit-issue) to our [GitHub Repository][github]. Even better, you can
[submit a Pull Request](#submit-pr) with a fix.

## <a name="feature"></a> Missing a Feature?

You can _request_ a new feature by [submitting an issue](#submit-issue) to our GitHub
Repository. If you would like to _implement_ a new feature, please submit an issue with
a proposal for your work first, to be sure that we can use it.
Please consider what kind of change it is:

- For a **Major Feature**, first open an issue and outline your proposal so that it can be
  discussed. This will also allow us to better coordinate our efforts, prevent duplication of work,
  and help you to craft the change so that it is successfully accepted into the project.
- **Small Features** can be crafted and directly [submitted as a Pull Request](#submit-pr).

## <a name="submit"></a> Submission Guidelines

### <a name="submit-issue"></a> Submitting an Issue

You can file new issues by selecting from our [new issue templates][new-issue] and filling out the issue template.

### <a name="submit-pr"></a> Submitting a Pull Request (PR)

Before you submit your Pull Request (PR) consider the following guidelines:

1. Search [GitHub][github-pulls] for an open or closed PR that relates to your submission. You don't want to duplicate effort.
1. Be sure that an issue describes the problem you're fixing, or documents the design for the feature you'd like to add. Discussing the design up front helps to ensure that we're ready to accept your work.
1. Clone the [MPS/aerie-ui repo][github].
1. Make your changes in a new git branch:
   ```shell
   git checkout develop
   git pull origin develop
   git checkout -b my-fix-branch develop
   ```
1. Create your patch, **including appropriate test cases**.
1. Follow our [Coding Rules](#rules).
1. Run the full aerie-ui test suite, as described in the [developer documentation][dev-doc], and ensure that all tests pass.
   ```shell
   yarn test
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
  - Re-run the aerie-ui test suites to ensure tests are still passing.
  - [Rebase your branch][rebase] and force push to your branch to GitHub (this will update your Pull Request):

    ```shell
    git rebase develop -i
    git push -f
    ```

That's it! Thank you for your contribution!

#### After your pull request is merged

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

- All features or bug fixes **must be tested** by one or more specs (unit-tests).
- We use [Prettier][prettier] and [TSLint](./tslint.json) to keep code formatted.
  ```shell
  yarn format
  yarn lint
  ```

## <a name="commit"></a> Commit Message Guidelines

We have very precise rules over how our git commit messages can be formatted. This leads to **more readable messages** that are easy to follow when looking through the **project history**. But also, we use the git commit messages to **generate the aerie-ui change log**.

### Commit Message Format

Each commit message consists of a **header**, a **body** and a **footer**. The header has a special
format that includes a **type** and a **subject**:

```
<type>: <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory.

Any line of the commit message cannot be longer 100 characters! This allows the message to be easier to read on GitHub as well as in various git tools.

The footer should contain a [closing reference to an issue](https://help.github.com/articles/closing-issues-via-commit-messages/) if any.

Samples:

```
docs(changelog): update changelog to beta.5
```

```
fix: need to depend on latest rxjs and zone.js

The version in our package.json gets copied to the one we publish, and users need the latest of these.
```

([more samples](https://github.jpl.nasa.gov/MPS/aerie-ui/commits/develop))

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

### Footer

The footer should contain any information about **Breaking Changes** and is also the place to reference GitHub issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

## Special Thanks

This document was created using the [Angular contributing document][angular-contributing].

[angular-contributing]: https://github.com/angular/angular/blob/master/CONTRIBUTING.md
[dev-doc]: ./docs/DEVELOPER.md
[github]: https://github.jpl.nasa.gov/MPS/aerie-ui
[github-pulls]: https://github.jpl.nasa.gov/MPS/aerie-ui/pulls
[new-issue]: https://github.jpl.nasa.gov/MPS/aerie-ui/issues/new/choose
[prettier]: https://prettier.io/
[rebase]: https://dev.to/maxwell_dev/the-git-rebase-introduction-i-wish-id-had
[slack]: https://jpl.slack.com/app_redirect?channel=CR1M97V1N
