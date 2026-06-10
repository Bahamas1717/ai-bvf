# Dockerfile for deploying aibvf-mcp on Glama.
#
# aibvf-mcp is a stdio MCP server: it speaks MCP over stdin/stdout, exposes no
# network port, and requires no configuration or secrets to run. Glama builds
# this image, runs the container, and connects over stdio to enumerate the
# tools and score them.
#
# We install the published, provenance-signed package rather than building from
# source so the deployed image is byte-for-byte what `npx aibvf-mcp` users get.
# Bump the pinned version when you cut a new release.

FROM node:20-slim

# Install the published MCP server globally.
RUN npm install -g aibvf-mcp@0.4.0

# Anonymous usage telemetry is on by default and is opt-out. Glama's build
# environment is ephemeral infrastructure, not a real user, so disable it here
# to avoid polluting install metrics with deployment/inspection runs.
ENV AIBVF_TELEMETRY_DISABLE=1

# Run the server on stdio. The `aibvf-mcp` bin launches node dist/index.js,
# which uses StdioServerTransport; the startup banner goes to stderr.
ENTRYPOINT ["aibvf-mcp"]
