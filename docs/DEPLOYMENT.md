# Deployment

This document describes how to deploy aerie-ui via Docker. All of these instructions should be carried out on the machine you are deploying to.

## Dependencies

The deployment of Aerie UI depends on other Aerie containers on the same Docker network in order to work properly. See the complete Aerie [deployment documentation](https://github.com/NASA-AMMOS/aerie/tree/develop/deployment) for examples on how to deploy these other required containers.

## Remote Docker Image

This command pulls the latest Docker image from GitHub, and starts a container from that image.

```bash
docker run --name aerie-ui -d -p 80:80 ghcr.io/nasa-ammos/aerie-ui:latest
```

Goto [http://localhost](http://localhost)

## Local Docker Image

First make sure you have all the [prerequisite software](./DEVELOPER.md#prerequisite-software) installed. These commands build the aerie-ui, build a Docker image, and start a container using the built image.

```bash
cd aerie-ui
npm install
npm run build
docker build -t aerie-ui .
docker run --name aerie-ui -d -p 80:80 aerie-ui
```

Goto [http://localhost](http://localhost)
