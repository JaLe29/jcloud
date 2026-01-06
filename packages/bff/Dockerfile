### BUILD
FROM node:22-alpine AS build

WORKDIR /usr/app

COPY ./.yarn/cache													./.yarn/cache
COPY ./.yarn/releases												./.yarn/releases
COPY ./.yarnrc.yml													./
COPY ./package.json													./
COPY ./tsconfig.base.json											./
COPY ./yarn.lock													./

COPY ./packages/backend-shared										./packages/backend-shared
COPY ./packages/bff 												./packages/bff
COPY ./packages/client												./packages/client
COPY ./packages/db													./packages/db

ENV DATABASE_URL=dockerbuildisempty

RUN yarn install && \
	yarn workspace @jcloud/db prisma:generate && \
	yarn workspace @jcloud/backend-shared build && \
	yarn workspace @jcloud/client build && \
	yarn workspace @jcloud/bff build && \
	yarn workspaces focus @jcloud/bff --production

# ### PRODUCTION
FROM node:22-alpine
WORKDIR /usr/app

COPY --from=build /usr/app/package.json								./package.json

COPY --from=build /usr/app/packages/bff/package.json				./packages/bff/package.json
COPY --from=build /usr/app/packages/bff/dist						./packages/bff/dist

COPY --from=build /usr/app/packages/backend-shared	/package.json				./packages/backend-shared	/package.json
COPY --from=build /usr/app/packages/backend-shared	/dist						./packages/backend-shared	/dist

COPY --from=build /usr/app/packages/client/dist						./packages/client/dist

COPY --from=build /usr/app/node_modules								./node_modules

ENV TZ=Europe/Prague
ENV NODE_ENV=production

RUN apk add --no-cache tzdata \
	&& ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

USER 1000:1000

CMD [ "sh", "-c", "node --enable-source-maps ./packages/bff/dist/main.js" ]