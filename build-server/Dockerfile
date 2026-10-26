FROM node:20-alpine

RUN apk add --no-cache git bash

RUN mkdir -p /home/app && chown -R node:node /home/app

WORKDIR /home/app
COPY --chown=node:node sandbox.js ./

USER node
ENV HOME=/home/app
ENV NPM_CONFIG_CACHE=/home/app/.npm

ENTRYPOINT ["node", "/home/app/sandbox.js"]
