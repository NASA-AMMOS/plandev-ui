FROM artifactory.jpl.nasa.gov:17001/node:lts-alpine
COPY ./build /app
COPY package.json /app
ENV NODE_TLS_REJECT_UNAUTHORIZED = "0"
ENV PORT 80
CMD [ "node", "/app" ]
