FROM node:lts-alpine
COPY ./server /app
WORKDIR /app
EXPOSE 80
CMD [ "npm", "start" ]
