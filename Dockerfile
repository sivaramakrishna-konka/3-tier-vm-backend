FROM node:20-alpine
RUN apk add --no-cache bash
RUN mkdir /opt/server
RUN adduser -D -h /opt/server crud
RUN chown crud:crud -R /opt/server
WORKDIR /opt/server
COPY package.json ./
COPY *.js ./
RUN npm install --omit=dev
USER crud
EXPOSE 8080
CMD ["node", "server.js"]