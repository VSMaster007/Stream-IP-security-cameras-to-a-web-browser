# WebRTC player

The dashboard uses the official MediaMTX browser reader from release v1.21.3:

https://github.com/bluenviron/mediamtx/blob/v1.21.3/internal/servers/webrtc/reader.js

The file is vendored at `frontend/src/lib/mediamtx/reader.js` and talks to the WHEP endpoint directly, for example `http://127.0.0.1:8889/cam1/whep`. Video packets do not pass through the Node.js API.

The upstream class retries forever after two seconds. This copy adds `automaticRetry`. The player sets it to `false`, closes the peer connection, and sends the WHEP `DELETE` that the reader already performs on failure. A later dashboard layer decides when to construct a new reader.

Playback state comes from the reader and the video element:

- `connecting` when the reader is constructed
- `live` when the video element fires `playing`
- `offline` when the reader reports `stream not found`
- `error` for other reader failures

Receiving a track is not enough to call the stream live. A successful backend health response is also not enough. Unmounting the player closes the reader and clears `srcObject`.

## Playback check

Headless Chrome loaded this reader against MediaMTX v1.21.3 and the demo publisher. The default ports on this machine were already used by another MediaMTX process, so the check used `127.0.0.1:18889` for WHEP and `127.0.0.1:18189` for ICE. The video element reported `live` at 1280x720, and MediaMTX logged a WebRTC reader on `cam1` with H264 and Opus. That check is not part of `npm test`.

