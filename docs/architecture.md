# Architecture

The browser receives video directly from MediaMTX. The Node.js API never proxies media packets.

```text
RTSP Camera or FFmpeg Demo Source
                 |
                 | RTSP
                 v
          +-------------+
          |   MediaMTX  |
          | Media Server|
          +-------------+
             |       |
             |       +------------------+
             |                          |
             | WebRTC / WHEP            | Private Control API
             v                          v
       Browser Player              Node.js Backend
             |                          |
             +------------+-------------+
                          |
                     React Dashboard
```

Three states stay separate:

- Backend health: the API process is up.
- Source readiness: MediaMTX reports whether path `cam1` is online.
- Browser playback: the WebRTC reader and the video element report what the page is actually playing.

The data model uses one camera, `cam1`. Additional cameras can be added later as more path records. This repository does not claim multi-camera operation.

MediaMTX is pinned to v1.21.3. Configuration field names are taken from the [v1.21.3 configuration reference](https://mediamtx.org/docs/references/configuration-file). The browser uses the official `MediaMTXWebRTCReader` against the WHEP endpoint `http://<host>:8889/cam1/whep`.
