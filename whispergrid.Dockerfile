FROM node:20

VOLUME [ "/data" ]
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000

RUN npm run build

WORKDIR /data
ENTRYPOINT [ "node", "/usr/src/app/bin.js"]
