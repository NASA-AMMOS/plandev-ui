# Deployment

This document describes how to deploy aerie-ui via Docker. All of these instructions should be carried out on the machine you are deploying to.

## Steps

1. Make sure [Docker][docker] and [Git][git] are installed, and that Docker is running. `docker-compose` should be automatically installed with the installation of Docker:

```bash
which docker
which docker-compose
which git
docker info
```

2. Clone the [aerie-ui repository][aerie-ui-repository]:

```bash
git clone git@github.jpl.nasa.gov:MPS/aerie-ui.git
```

3. Log into the [Artifactory][artifactory] Docker repository:

```bash
docker login cae-artifactory.jpl.nasa.gov:16001/gov/nasa/jpl/ammos/mpsa/aerie-ui
```

4. Use [Docker Compose][docker-compose] to start the application:

```bash
cd aerie-ui
docker-compose up --build
```

5. To stop and remove all the containers run:

```bash
docker-compose down
```

## Configuration

The `docker-compose` files are parameterized with the [***REMOVED***](../***REMOVED***) file in the root of the aerie-ui repository.

| Environment Variable | Description |
| - | - |
| DOCKER_TAG | A [Docker Tag][docker-tag] of the aerie-ui version you are deploying. It has the form: `[BRANCH_NAME]-b[BUILD_NUMBER].r[SHORT_GIT_COMMIT_HASH].[yyyyMMdd]`. For example this is a tag: `develop-b1.r4bc461f.20191126`. For a list of Docker image tags, first [log into Artifactory][artifactory-login]. The complete list of aerie-ui images can be found [here][artifactory-aerie-ui]. |
| DOCKER_URL | The URL of a Docker repository. Defaults to Artifactories [docker-develop-local][docker-develop-local] repository. |

[aerie-ui-repository]: https://github.jpl.nasa.gov/MPS/aerie-ui
[artifactory]: https://cae-artifactory.jpl.nasa.gov
[artifactory-aerie-ui]: https://cae-artifactory.jpl.nasa.gov/artifactory/webapp/#/artifacts/browse/tree/General/docker-develop-local/gov/nasa/jpl/ammos/mpsa/aerie-ui
[artifactory-login]: https://cae-artifactory.jpl.nasa.gov/artifactory/webapp/#/login
[docker]: https://www.docker.com/
[docker-compose]: https://docs.docker.com/compose/reference/
[docker-develop-local]: https://cae-artifactory.jpl.nasa.gov/artifactory/webapp/#/artifacts/browse/tree/General/docker-develop-local
[docker-tag]: https://docs.docker.com/engine/reference/commandline/tag/
[git]: https://git-scm.com/
