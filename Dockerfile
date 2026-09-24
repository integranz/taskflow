# syntax=docker/dockerfile:1

FROM dhi.io/node:22-dev AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src

FROM dhi.io/node:22
WORKDIR /app
ARG VERSION=0.0.0-local
ARG COMMIT=unknown
LABEL org.opencontainers.image.title="taskflow" \
      org.opencontainers.image.source="https://github.com/integranz/taskflow" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}"
ENV VERSION="${VERSION}" \
    NODE_ENV=production \
    PORT=3000
COPY --from=build --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=build --chown=65532:65532 /app/package.json ./
COPY --from=build --chown=65532:65532 /app/src ./src
USER 65532
EXPOSE 3000
CMD ["node", "--import", "tsx", "src/index.ts"]
