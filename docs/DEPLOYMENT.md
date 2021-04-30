# Deployment

This document describes how to deploy aerie-ui via Docker. All of these instructions should be carried out on the machine you are deploying to.

## Dependencies

The deployment of Aerie UI depends on two other containers on the same Docker network in order to work properly.

1. Apollo (API gateway server)
2. Postgres

See the Aerie [docker-compose.yml](https://github.jpl.nasa.gov/Aerie/aerie/blob/develop/scripts/docker-compose-aerie/docker-compose.yml) file for examples on how to deploy these required containers.

## Docker Artifactory

These commands pull the [release-0.7.1](https://artifactory.jpl.nasa.gov/artifactory/webapp/#/artifacts/browse/tree/General/docker-release-local/gov/nasa/jpl/aerie/aerie-ui/release-0.7.1) Docker image from Artifactory and start a container from that image.

```bash
docker login artifactory.jpl.nasa.gov:16003/gov/nasa/jpl/aerie
docker run --name aerie-ui -d -p 80:80 artifactory.jpl.nasa.gov:16003/gov/nasa/jpl/aerie/aerie-ui:release-0.7.1 npm run start:develop
```

Goto [http://localhost](http://localhost)

## Docker Local

First make sure you have all the [prerequisite software](./DEVELOPER.md#prerequisite-software) installed. These commands build the aerie-ui, build a Docker image, and start a container using the built image. 

```bash
cd aerie-ui
npm install
cd server
npm install
cd ..
npm run build:prod
docker build -t aerie-ui .
docker run --name aerie-ui -d -p 80:80 aerie-ui
```

Goto [http://localhost](http://localhost)

## Docker Volumes

To start a container with custom configuration or UI views, you need to [mount](https://docs.docker.com/storage/bind-mounts/) a directory with your custom directories into the container:

```bash
docker run --name aerie-ui -d -p 80:80 -v /path/to/custom/config:/app/config -v /path/to/custom/views:/app/views artifactory.jpl.nasa.gov:16003/gov/nasa/jpl/aerie/aerie-ui:release-0.7.1
```
