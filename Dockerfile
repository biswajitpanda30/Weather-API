FROM node:8.7

ADD  src/         /app 
COPY package.json /app

WORKDIR app

RUN npm install

CMD node app.js

EXPOSE 80
