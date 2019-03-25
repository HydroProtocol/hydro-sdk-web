FROM node:11.10.0 AS build

ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ARG REACT_APP_HYDRO_PROXY_ADDRESS
ARG REACT_APP_HYDRO_TOKEN_ADDRESS

COPY . /app/starter-kit-web
WORKDIR /app/starter-kit-web

RUN yarn install
RUN yarn run build

FROM pierrezemb/gostatic:latest
COPY --from=build /app/starter-kit-web/build /srv/http
