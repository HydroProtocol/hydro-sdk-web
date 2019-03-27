FROM node:11.10.0 AS builder
COPY . /app/starter-kit-web
WORKDIR /app/starter-kit-web
RUN yarn install
RUN yarn run build

FROM wlchn/gostatic:latest
ENV CONFIG_FILE_PATH /srv/http
COPY --from=builder /app/starter-kit-web/build /srv/http
COPY ./env.sh /env.sh
ENTRYPOINT ["sh", "/env.sh"]
CMD ["/goStatic"]