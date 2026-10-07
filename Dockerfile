# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tar \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development
COPY . .
EXPOSE 4321
CMD ["sh", "-c", "npm ci && npm run dev -- --host 0.0.0.0"]

FROM dependencies AS build
COPY . .
ARG SITE_URL=http://localhost:8080
ARG BASE_PATH=/
ENV SITE_URL=${SITE_URL} BASE_PATH=${BASE_PATH}
RUN npm run build
# Generate the matching server mount from the same base used by Astro.
RUN node --input-type=module -e 'import fs from "node:fs"; const base = process.env.BASE_PATH.replace(/\/+$/, ""); if (base && (!base.startsWith("/") || !/^\/[A-Za-z0-9_/-]+$/.test(base))) throw new Error("BASE_PATH must be an absolute URL path containing letters, digits, underscores, hyphens, or slashes"); const template = fs.readFileSync("nginx.conf.template", "utf8"); fs.writeFileSync("/tmp/default.conf", template.replaceAll("__BASE__", base).replaceAll("__BASE_REDIRECT__", base ? `location = ${base} { return 308 ${base}/$is_args$args; }` : "").replaceAll("__OUTSIDE_BASE__", base ? "location / { return 404; }" : "")); fs.mkdirSync(`/tmp/site${base}`, { recursive: true }); fs.cpSync("dist", `/tmp/site${base}`, { recursive: true });'

FROM nginxinc/nginx-unprivileged:stable-alpine AS production
COPY --from=build /tmp/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /tmp/site/ /usr/share/nginx/html/
EXPOSE 8080
