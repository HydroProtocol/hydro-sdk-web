FROM node:11.10.0 AS build

ENV REACT_APP_API_URL http://localhost:3001
ENV REACT_APP_WS_URL ws://localhost:3002
ENV REACT_APP_HYDRO_PROXY_ADDRESS 0x04f67e8b7c39a25e100847cb167460d715215feb
ENV REACT_APP_HYDRO_TOKEN_ADDRESS 0x4c4fa7e8ea4cfcfc93deae2c0cff142a1dd3a218

COPY . /app/starter-kit-web
WORKDIR /app/starter-kit-web

RUN yarn install
RUN yarn run build

FROM pierrezemb/gostatic:latest
COPY --from=build /app/starter-kit-web/build /srv/http
