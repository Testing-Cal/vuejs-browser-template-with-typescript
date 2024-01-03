# stage1 as builder
FROM node:16.13.2 as builder

# copy the package.json to install dependencies
COPY package.json package-lock.json ./

# Install the dependencies and make the folder
RUN npm install && mkdir /vuejs-ui && mv ./node_modules ./vuejs-ui

WORKDIR /vuejs-ui

COPY . .

# Build the project and copy the files
RUN npm run build



FROM nginx:alpine

ENV context ""
ARG DEFAULT_PORT 4020

ENV PORT ${DEFAULT_PORT}
#!/bin/sh
RUN apk add sudo && addgroup -S lazsa -g 1000 && adduser -u 1000 -S -G root lazsa
RUN echo "lazsa ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers.d/lazsa
RUN chown -R lazsa:root /etc/nginx/ \
    && chmod -R 775 /etc/nginx \
    && chown -R lazsa:root /run && chmod -R 775 /run \
    && chown -R lazsa:root /var/cache/nginx/ \
    && chmod -R 755 /var/cache/nginx/

## Remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy from the stahg 1
COPY --from=builder /vuejs-ui/dist /usr/share/nginx/html
COPY script.sh /
RUN chmod 777 ./script.sh

WORKDIR /

USER lazsa

CMD ["./script.sh"]

EXPOSE $PORT

