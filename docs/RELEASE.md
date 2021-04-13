# Release

This document contains instructions on how to release the Aerie UI.

## Artifactory

1. Figure out what version you are releasing and use the format `release-{MAJOR}.{MINOR}.{PATCH}`. For descriptions of MAJOR, MINOR, and PATCH please refer to the [Semantic Versioning](https://semver.org/) documentation.
1. Do a global find and replace on the repository of `PREVIOUS_VERSION` to `NEXT_VERSION`.
For example if the previous version was `1.0.0` and the next version is `2.0.0`, find and replace all instances of `1.0.0` with `2.0.0`. The most important replacement here is in [package.json](../package.json) so the UI displays the latest version correctly. After changing `package.json` also run `npm install` so the `package-lock.json` is updated to the latest version.
1. Commit the changes to `develop` so the repository reflects we are on the latest released version going forward.
1. Create a new branch with the format `release-{MAJOR}.{MINOR}.{PATCH}`, where MAJOR, MINOR, and PATCH refer to the `NEXT_VERSION`. For example if we are releasing version `2.0.0`, from `develop` you would do:
    ```sh
    git checkout -b release-2.0.0
    ```
1. Push the release branch to Github. This will start a release build in [Jenkins](https://cae-jenkins2.jpl.nasa.gov/job/MPSA/job/SEQ/job/normal_builds/job/aerie-ui/).
    ```sh
    git push origin release-2.0.0
    ```
1. After Jenkins is finished, the release Docker image will be pushed to Artifactory. Verify the released version is present in the [Aerie-UI Docker Artifactory area](https://artifactory.jpl.nasa.gov/artifactory/webapp/#/artifacts/browse/tree/General/docker-release-local/gov/nasa/jpl/aerie/aerie-ui).
1. Switch back to your local `develop` branch and enjoy the rest of your day!
    ```sh
    git checkout develop
    ```

## Staging (AWS)

1. Start on `develop` (assuming develop is the latest release, and you have completed the Artifactory steps above).
1. Delete remote (GitHub) `staging` branch.
1. Fetch remote to make sure the deleted is synched:
    ```sh
    git fetch -pPf
    ```
1. Delete local `staging` branch:
    ```sh
    git branch -D staging
    ```
1. Checkout a new `staging` branch from `develop`:
    ```sh
    git checkout -b staging
    ```
1. Push `staging` to remote to build and deploy:
    ```sh
    git push origin staging
    ```
