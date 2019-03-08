FROM node:11.10.0 AS build

ENV REACT_APP_API_ADDRESS https://api-dev.i.ddex.io
ENV REACT_APP_WS_ADDRESS wss://ws-dev.i.ddex.io
ENV REACT_APP_HYDRO_PROXY_ADDRESS 0x1b9540F50b3B9DDE35CEA9A403026a78965234aC
ENV REACT_APP_HOT_CONTRACT_ADDRESS 0x6829f329f8f0768ad62a65477514deEd90825564

RUN mkdir -p /app/starter-kit-web
WORKDIR /app/starter-kit-web

COPY . /app/starter-kit-web
RUN yarn install
RUN yarn run build

FROM nginx:alpine
COPY --from=build /app/starter-kit-web/build /usr/share/nginx/html
