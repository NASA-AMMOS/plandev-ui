FROM artifactory.jpl.nasa.gov:17001/node:lts-alpine
COPY ./build /app
COPY package.json /app
ENV PORT 80
CMD [ "node", "/app" ]
