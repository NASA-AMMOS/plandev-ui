# Release

This document contains instructions on how to release the Aerie UI.

## Steps

1. Figure out what version you are releasing and use the format `{MAJOR}.{MINOR}.{PATCH}`. For descriptions of MAJOR, MINOR, and PATCH please refer to the [Semantic Versioning](https://semver.org/) documentation.
1. Do a global find and replace on the repository of `PREVIOUS_VERSION` to `NEXT_VERSION`. For example if the previous version was `1.0.0` and the next version is `2.0.0`, find and replace all instances of `1.0.0` with `2.0.0`. The most important replacement here is in [package.json](../package.json) so the UI displays the latest version correctly. After changing `package.json` also run `npm install` so the `package-lock.json` is updated to the latest version.
1. Commit the changes to `develop` so the repository reflects we are on the latest released version going forward.
1. [Tag](https://stackoverflow.com/a/18223354) the latest release with the format `v{MAJOR}.{MINOR}.{PATCH}` (for example `v2.0.0`), and push the tag to GitHub. This should build the latest release image and automatically add it to GitHub packages.
