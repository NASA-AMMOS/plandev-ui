FROM node:lts-alpine
COPY build /app
COPY package.json /app
COPY node_modules /app/node_modules
ENV NODE_TLS_REJECT_UNAUTHORIZED "0"
ENV PORT 80
CMD [ "node", "/app" ]
