# Deployment

This document describes how to deploy aerie-ui via Docker. All of these instructions should be carried out on the machine you are deploying to.

## Docker Artifactory

These commands pull the [release-0.6.0](https://cae-artifactory.jpl.nasa.gov/artifactory/webapp/#/artifacts/browse/tree/General/docker-release-local/gov/nasa/jpl/aerie/aerie-ui/release-0.6.0) Docker image from Artifactory and start a container from that image.

```bash
docker login cae-artifactory.jpl.nasa.gov:16003/gov/nasa/jpl/aerie
docker run --name aerie-ui -d -p 8080:80 cae-artifactory.jpl.nasa.gov:16003/gov/nasa/jpl/aerie/aerie-ui:release-0.6.0
```

Goto [http://localhost:8080/](http://localhost:8080/)

## Docker Local

First make sure you have all the [prerequisite software](./DEVELOPER.md#prerequisite-software) installed. These commands build the aerie-ui, build a Docker image, and start a container using the built image. 

```bash
cd aerie-ui
npm install
npm run build:prod
docker build -t aerie-ui .
docker run --name aerie-ui -d -p 8080:80 aerie-ui
```

Goto [http://localhost:8080/](http://localhost:8080/)

## Docker Volumes

To start a container with custom UI states, you need to [mount](https://docs.docker.com/storage/bind-mounts/) a directory with your custom states into the container:

```bash
docker run --name aerie-ui -d -p 8080:80 -v /path/to/custom/ui-states:ui-states cae-artifactory.jpl.nasa.gov:16003/gov/nasa/jpl/aerie/aerie-ui:release-0.6.0
```
