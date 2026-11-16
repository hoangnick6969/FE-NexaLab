# MediaPipe assets

`wasm/` is copied from the installed `@mediapipe/tasks-vision` npm package: the SIMD and no-SIMD variants only. `FilesetResolver.forVisionTasks("/vision/wasm")` is called without `useModule`, so the `_module` variant (12 MB) is never requested and is not shipped (perf review 2026-11-16 item 5). Vercel serves `/vision/*` with a 7-day `Cache-Control`. `hand_landmarker.task` is the Google MediaPipe Hand Landmarker float16 model, version 1, downloaded from:

https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task

Source and licensing information: https://github.com/google-ai-edge/mediapipe (Apache-2.0). Retain the upstream license and notices when distributing. The browser loads these assets from this project. Camera frames stay on the client; no frame upload or recording code is present.

The current demo maps hand horizontal position to rotation, vertical position to explode and a new pinch to next selected part. Other interactions retain mouse/keyboard equivalents. Processing is capped near 10 fps on the main thread; worker offload is a future optimization.
