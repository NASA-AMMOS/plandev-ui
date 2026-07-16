FROM node:22.22.3-alpine3.22
COPY build /app
COPY package.json /app
COPY node_modules /app/node_modules
ENV PORT 80
CMD [ "node", "/app" ]
