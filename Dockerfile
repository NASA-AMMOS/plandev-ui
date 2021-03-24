FROM node:lts-alpine
COPY ./server /app
WORKDIR /app
CMD [ "npm", "run", "start:docker" ]
