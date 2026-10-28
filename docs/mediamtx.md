# MediaMTX configuration

The gateway is [MediaMTX v1.21.3](https://github.com/bluenviron/mediamtx/releases/tag/v1.21.3). `mediamtx/mediamtx.yml` uses field names from the [v1.21.3 configuration reference](https://mediamtx.org/docs/references/configuration-file).

## What the file configures

| Setting | Value | Why |
| --- | --- | --- |
| Path | `cam1` | Single camera for this version of the dashboard |
| `source` | `publisher` | Demo FFmpeg publishes RTSP. Real-camera mode overrides this |
| `rtspTransports` | `tcp` | UDP RTP ports are unreliable behind Docker NAT |
| Control API | `:9997` | Backend reads path status. Do not publish this port |
| WebRTC HTTP | `:8889` | WHEP endpoint is `http://<host>:8889/cam1/whep` |
| ICE UDP | `:8189` | Media packets. Must be reachable by the browser |
| RTMP, HLS, SRT, MoQ | disabled | The dashboard does not use them |
| `all_others` | omitted | Unknown paths are rejected |

## Real-camera override

MediaMTX reads environment variables in the form `MTX_PARAMNAME`. A map entry uses underscores:

```bash
MTX_PATHS_CAM1_SOURCE='rtsp://USERNAME:PASSWORD@CAMERA_HOST:554/STREAM_PATH'
```

That replaces `source: publisher` for path `cam1`. The demo publisher must not run in that mode, or it will fight the camera for the same path.

Credentials belong in the environment or a secret store, not in `mediamtx.yml`.

## WebRTC address advertisement

`webrtcIPsFromInterfaces` is false. MediaMTX sends only `webrtcAdditionalHosts` to the browser. The default host is `127.0.0.1`, which matches a loopback port binding.

For a browser on another machine, set:

```bash
MTX_WEBRTCADDITIONALHOSTS=192.168.1.20
```

Use the address the browser uses to reach this computer, and publish `8189/udp` on that network. Add the dashboard origin to `webrtcAllowOrigins`. Since v1.21.1, MediaMTX rejects browser WHEP POST requests whose `Origin` is not allowed.

## Local binary check

Download the v1.21.3 archive from the MediaMTX releases page, extract it outside the repository, and run:

```bash
./mediamtx /absolute/path/to/mediamtx/mediamtx.yml
```

Then:

```bash
curl -sS http://127.0.0.1:9997/v3/paths/get/cam1
```

A ready path is not required for this check. A JSON document for `cam1` with `"ready": false` confirms that the configuration loaded and the Control API is answering on loopback.
