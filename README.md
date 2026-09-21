# Key / Lab

Keyboard reaction and key-finding experiment. The initial repository contained only `spec.MD`; this implementation uses vanilla JavaScript ES modules, Vite, Lucide icons, Node's test runner, ESLint, and Playwright browser checks.

## Run

```sh
npm install
npm run dev
npm test
npm run lint
npm run build
npx playwright test
```

## Cloud deployment with Docker Compose

On a Linux cloud VM with Docker Engine and Docker Compose v2 installed, run
these commands from the project directory:

```sh
docker compose up -d --build
docker compose ps
curl --fail http://localhost:8080/healthz
docker compose logs --tail=100 web
```

The default address is `http://SERVER_IP:8080`. For a different host port:

```sh
PORT=80 docker compose up -d --build
```

You can also create a `.env` file using the settings documented in
`.env.example`. `BIND_ADDRESS=127.0.0.1` restricts the published port to a
reverse proxy running on the same VM. The default `0.0.0.0` allows a cloud
load balancer to reach the service; configure the VM firewall/security group
to allow that load balancer on the selected port.

For public use, configure your cloud HTTPS load balancer or TLS reverse proxy
to forward to HTTP port 8080 (or the configured host port), with `/healthz`
as its health-check path. Point your domain to that endpoint and attach a TLS
certificate. HTTPS is recommended for public deployment. Session IDs use
`crypto.randomUUID()` when available, with a UUID v4 fallback using
`crypto.getRandomValues()` on HTTP origins. This Compose file serves HTTP
and does not provision DNS or TLS.

The image builds with Node and serves only `dist/` using Nginx as a non-root
user. Compose adds a read-only filesystem, temporary writable storage, a
health check, log rotation, and restart on process exit. Unhealthy status is
reported to monitoring; Compose does not automatically restart a process
solely because its health check fails. No database or persistent volume is
required: session results stay in the browser and are exported by the user.

After updating the source, redeploy using `docker compose up -d --build`.
Stop the service with `docker compose down`. Initial image builds require
access to Docker Hub and npm. Deployment files are `Dockerfile`,
`compose.yaml`, `deploy/nginx.conf`, `.dockerignore`, and `.env.example`.

## Implementation

- `src/keyboard/thaiKedmanee.js`: 94 base/shift entries across standard Thai Kedmanee positions, including punctuation on that layout. Source: [Microsoft KBDTH0](https://github.com/MicrosoftDocs/globalization/blob/main/globalization/keyboards/kbdth0.html).
- `src/keyboard/definitions.js`: English QWERTY, numbers, symbols, F1-F12, editing, navigation, and modifier pools. English can use lowercase or Shift-required uppercase.

The Thai experiment pool includes only Thai Unicode characters. ASCII symbols in the full Kedmanee mapping are excluded from that pool to avoid ambiguous visible targets with different Thai and US physical positions in mixed sessions.

- `src/keyboard/matcher.js`: validates physical `KeyboardEvent.code` and exact modifier flags. Thai `ก` matches `KeyD` regardless of `event.key` or the OS input language. Generic Shift/Ctrl/Alt accepts either side. Required modifier preludes are logged but not scored as errors.
- `src/session.js`: explicit READY/RUNNING/PAUSED/COMPLETED states; SETUP is owned by the application. Randomization cycles shuffled categories and consumes shuffled key bags. The sequence is generated once per session. Start input and auto-repeat never answer a trial.
- `src/analytics.js`: mean, median, min/max, accuracy, population standard deviation, category and key aggregates, CSV and complete JSON exports.
- `src/main.js`, `src/style.css`, `index.html`: configuration, minimal testing view, pause/resume, sortable results, charts, and exports.
- `tests/core.test.js`, `tests/browser.spec.js`: matching, timing, pause, analytics, randomization, export and browser flow coverage.

## Measurement

After synchronously updating the target DOM, a requestAnimationFrame callback records `performance.now()`. Input before that callback is ignored. Each correct response subtracts the same start timestamp; wrong attempts do not reset it. Browser rendering and device latency still limit precision: this is not hardware-calibrated stimulus timing.

Wrong keydowns retain code, generated key, all four modifier states, monotonic timestamp and time from target. Required Shift preludes are retained in the timeline. The next target is rendered immediately without a success delay.

Hesitation is a trial strictly above `max(1000 ms, median + population standard deviation)`. Accuracy is completed trials divided by completed trials plus incorrect attempts. Key charts show mean reaction time; most-mistaken keys use total errors.

Blur/hidden-document events pause the session. Resume restarts the current trial. Invalidated partial attempts remain in JSON but are excluded from scores. Wall duration includes pauses; JSON also contains the sum of valid reaction times. JSON includes session identity, ISO timestamps, settings, sequence, pauses, per-trial events and summaries. No personal information or server submission is used.

CSV has a UTF-8 BOM, quoted cells and escaped quotes. Formula-like text receives an apostrophe prefix for spreadsheet safety; JSON preserves exact target strings. Exports are the durable record; refreshing closes the in-memory session.

## Browser limitations

Cancelable keyboard defaults are prevented only while READY/RUNNING, including repeat events. OS-reserved shortcuts, some browser-reserved function keys, Fn/media keys, remapped keyboards and input-method interception cannot always be captured or blocked. F5 works where the browser delivers a cancelable keydown. Physical desktop/laptop keyboards are required; no on-screen replacement is provided. Thai uses Kedmanee, English/symbols use US QWERTY positions. Caps Lock does not substitute for physical Shift. The Thai font is loaded from Google Fonts with local sans-serif fallback.

UX interaction reference: https://reactiontimetests.org/typing (visual design is original).
