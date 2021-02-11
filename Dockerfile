FROM node:lts
COPY ./server /app
WORKDIR /app
EXPOSE 80
CMD [ "npm", "start" ]
