# Pinned Alpine release. The ffmpeg package comes from that Alpine version's
# repository. Feature verification of the built image is recorded in the docs
# when Docker is available.
FROM alpine:3.22.2

RUN apk add --no-cache ffmpeg \
  && ffmpeg -hide_banner -encoders | grep -E 'libx264|libopus'

COPY publish.sh /usr/local/bin/publish-demo
RUN chmod 755 /usr/local/bin/publish-demo

ENTRYPOINT ["/usr/local/bin/publish-demo"]
