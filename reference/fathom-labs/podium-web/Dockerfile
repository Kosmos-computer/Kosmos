FROM node:18.12.1

RUN mkdir -p /usr/src/nuxt-app
WORKDIR /usr/src/nuxt-app

# Install app dependencies
COPY package*.json ./
RUN npm install

COPY . .

RUN npm ci && npm cache clean --force
RUN npm run build

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NPM_CONFIG_LOGLEVEL=info


EXPOSE 3000 

RUN ls -a
#ENTRYPOINT ["node", ".output/server/index.mjs"]
CMD ["npm", "run", "start"]
