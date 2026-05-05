FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /usr/src/app

# The puppeteer image runs as the "pptruser" user
# We need to copy files and set ownership
COPY --chown=pptruser:pptruser package*.json ./
RUN npm install

COPY --chown=pptruser:pptruser . .

EXPOSE 3000

CMD ["npm", "start"]
