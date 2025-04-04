FROM node:latest
WORKDIR /usr/src/app
COPY package*.json ./
COPY . .
RUN npm install
CMD ["node", "src/index.js"]