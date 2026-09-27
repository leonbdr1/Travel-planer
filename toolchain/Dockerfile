# Toolchain image for fi-deck Fleet workers and CI (O1.3, architektur.md 14.1).
# Contains every dependency of M1–M10 so tests run with `--network none`.
#
# Operator: pin the base image by digest before publishing, e.g.
#   docker buildx imagetools inspect node:22.22.2-bookworm-slim
# and build with --build-arg NODE_IMAGE=node:22.22.2-bookworm-slim@sha256:<digest>.
ARG NODE_IMAGE=node:22.22.2-bookworm-slim
FROM ${NODE_IMAGE}

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
    CI=true

WORKDIR /workspace
COPY package.json package-lock.json .npmrc supply-chain-policy.json ./
COPY packages ./packages
COPY scripts/supply-chain-check.mjs ./scripts/supply-chain-check.mjs

RUN npm ci --ignore-scripts \
 && node scripts/supply-chain-check.mjs --rebuild \
 && npx playwright install --with-deps chromium

# Proof of hermeticity (operator): docker run --rm --network none <image> npm test
CMD ["npm", "test"]
