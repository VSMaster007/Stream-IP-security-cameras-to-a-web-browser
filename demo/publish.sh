#!/bin/sh
# Publish a browser-friendly H.264 + Opus test pattern to MediaMTX path cam1.
# MediaMTX does not transcode. WebRTC playback needs codecs the browser can decode.
set -eu

RTSP_PUBLISH_URL="${RTSP_PUBLISH_URL:-rtsp://127.0.0.1:8554/cam1}"

exec ffmpeg \
  -hide_banner \
  -loglevel "${FFMPEG_LOGLEVEL:-warning}" \
  -re -f lavfi -i "testsrc=size=1280x720:rate=15" \
  -re -f lavfi -i "sine=frequency=440:sample_rate=48000" \
  -c:v libx264 \
  -preset veryfast \
  -tune zerolatency \
  -profile:v baseline \
  -level 3.1 \
  -pix_fmt yuv420p \
  -g 30 \
  -bf 0 \
  -x264-params "keyint=30:min-keyint=30:scenecut=0" \
  -c:a libopus \
  -ar 48000 \
  -ac 2 \
  -b:a 64k \
  -f rtsp \
  -rtsp_transport tcp \
  "${RTSP_PUBLISH_URL}"
