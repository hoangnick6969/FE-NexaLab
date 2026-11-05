# Student UI round-two checks

- `npm run test:regression` runs pure Node regression checks for assignment-scoped Continue selection, open-lesson activity routing, history URLs and the static lab import graph. It requires Node 22 or 24 and is included in CI.
- `npm run lint` and `npm run build` check TypeScript and production bundling.
- With a Vite dev server running on loopback, run `npm run test:ui-browser`. Set `TEST_WEB` for another loopback port and `CHROME_PATH` if Chrome is not on the default channel.

The browser script uses an empty HTML shell, local synthetic props and intercepted API responses. All unknown or write API requests are aborted and cause failure. It does not log in, submit learning work, create LabRuns or modify shared data. Intentional rejected imports and render errors exercise the activity boundary; the checks then assert retry/reload controls and preserved props. Dashboard cases verify scoped assignment completion, actual video resume and an unavailable completion API.

The Node dashboard helper test uses node:test, so Playwright collection explicitly ignores that file. The progress helper test lives beside the source and is outside the Playwright test directory.
