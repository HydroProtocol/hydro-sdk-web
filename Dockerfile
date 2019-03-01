FROM node:11.10.0 AS build

RUN mkdir -p /app/starter-kit-web
WORKDIR /app/starter-kit-web

COPY . /app/starter-kit-web
RUN yarn install
RUN yarn run build

FROM nginx:stable
COPY --from=build /app/starter-kit-web/build /usr/share/nginx/html