FROM node:22.23.4-alpine3.24

# npm is not required by the running service - remove to reduce vulnerable dependencies
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

COPY build /app/
COPY package.json /app/
COPY node_modules /app/node_modules/
ENV PORT=80
CMD [ "node", "/app" ]
