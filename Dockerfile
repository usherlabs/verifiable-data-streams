FROM node:18-slim

WORKDIR /home/node/airbyte
RUN npm install -g pnpm

#COPY lerna.json .tsconfig.json package.json package-lock.json ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# filter node modules
COPY ./sources ./sources
COPY ./destinations ./destinations


ARG path
RUN test -n "$path" || (echo "'path' argument is not set, e.g --build-arg path=destinations/airbyte-faros-destination" && false)
ENV CONNECTOR_PATH $path

RUN echo $CONNECTOR_PATH


# we will copy to ./tmp, delete all then copy back to root
RUN mkdir ./tmp/$CONNECTOR_PATH -p
RUN mv ./$CONNECTOR_PATH/* ./tmp/$CONNECTOR_PATH/
RUN rm -rf ./sources/* ./destinations/*

RUN mv ./tmp/* ./

RUN pnpm install
RUN pnpm --C $CONNECTOR_PATH build

RUN apt-get clean && rm -rf /var/lib/apt/lists/*

RUN ln -s "/home/node/airbyte/$CONNECTOR_PATH/bin/main.js" "/home/node/airbyte/main.js"

RUN chmod +x /home/node/airbyte/main.js

ENV AIRBYTE_ENTRYPOINT "/home/node/airbyte/main.js"
ENTRYPOINT ["/home/node/airbyte/main.js"]