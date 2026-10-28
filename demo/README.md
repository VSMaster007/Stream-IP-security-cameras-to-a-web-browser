# Demo stream

Demo mode publishes a generated picture and tone to MediaMTX. No camera is required.

MediaMTX path `cam1` stays configured as `source: publisher`. This process is the publisher. It must not run when `STREAM_SOURCE_MODE=rtsp`, because a real camera and this publisher would both target `cam1`.

## Codec choices

MediaMTX does not transcode an arbitrary camera codec into something a browser can play. The demo stream is encoded as:

- H.264 Baseline, level 3.1, `yuv420p`, no B-frames, a keyframe every 30 frames at 15 fps
- Opus stereo at 48 kHz

Those settings match the codecs commonly accepted by Chrome, Firefox, and Safari for WebRTC. H.265, MJPEG, and AAC are not used here because browser WebRTC support for them is incomplete. A physical camera must already send a browser-compatible video codec, or a separate transcoder has to be added. This project does not add one.

## Run against a local MediaMTX

Start MediaMTX with `mediamtx/mediamtx.yml`, then:

```bash
./demo/publish.sh
```

The default publish URL is `rtsp://127.0.0.1:8554/cam1`. Override it when MediaMTX is not on that address:

```bash
RTSP_PUBLISH_URL=rtsp://mediamtx:8554/cam1 ./demo/publish.sh
```

The path is ready when the Control API reports `"online": true` for `cam1`. `ready` is still present in v1.21.3 but is deprecated; `online` is the current field.

## Container

`demo/Dockerfile` is based on `alpine:3.22.2` and runs the same script. Docker Compose profile `demo` wires this publisher to `rtsp://mediamtx:8554/cam1`. See the Docker section of [../docs/setup.md](../docs/setup.md).

The publisher has no camera credentials. Do not put an RTSP URL with a password in the shell history if you reuse this script for a real camera. Real cameras are pulled by MediaMTX, not published by this script.
