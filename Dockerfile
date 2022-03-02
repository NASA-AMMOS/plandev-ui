FROM node:lts-alpine
COPY build /app
COPY package.json /app
COPY node_modules /app/node_modules
ENV PORT 80
CMD [ "node", "/app" ]
