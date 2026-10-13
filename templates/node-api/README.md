# {{projectName}}

If a packed Forgix CLI omitted `.gitignore`, copy the bundled `_gitignore`
to `.gitignore` before committing your project (`cp _gitignore .gitignore`,
or `Copy-Item _gitignore .gitignore` in PowerShell). The pack-safe fallback
is provided because npm excludes `.gitignore` from archives; automatic
materialization needs the pending CLI integration. Source-checkout generation
already includes `.gitignore`. Remove `_gitignore` after copying if desired.

A minimal Express 5 JavaScript API, not a production service.
Node.js 22.12+ and npm are required. No database or authentication is included.

## Setup and run

```sh
npm ci --ignore-scripts
npm run build
npm test
npm start
```

The API listens on http://127.0.0.1:3000. GET `/` returns a greeting;
GET `/health` returns `{"status":"ok"}`; unknown routes return a JSON 404.
To use another address: `HOST=0.0.0.0 PORT=3001 npm start` (POSIX shell),
or set those environment variables in your shell before starting.
The default loopback binding is intentional; set HOST explicitly for a container.

`npm run dev` runs Node in watch mode for local development.
`npm run build` checks JavaScript syntax.
`npm test` exercises Express request dispatch and HTTP serialization in memory:
root, health, HEAD and 404 responses. It does not open a listening socket.

## Structure and limits

Edit `app.js` to add routes; `index.js` owns startup.
The application uses ESM (type: module).
Before public deployment, add appropriate request validation, body-size limits,
logging, rate limiting, authentication and deployment-specific TLS.
No install hooks, secrets or external services are needed for this starter.
Plugins copy files only; follow their separate instructions rather than assuming
that dependencies or framework integrations are installed automatically.
