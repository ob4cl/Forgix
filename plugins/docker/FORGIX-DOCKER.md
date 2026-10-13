# Forgix docker file-only asset

This Docker asset is for the built-in node-api and express-ts starters only.
It requires package-lock.json, npm run build and npm start. It builds first,
prunes development dependencies and runs as the non-root node user.
It is not a container recipe for Vite, Next.js, Python or arbitrary projects.

```sh
docker build -t starter-api .
docker run --rm -p 127.0.0.1:3000:3000 starter-api
# or
docker compose -f compose.yaml up --build
```

The image binds internally to 0.0.0.0; published host port stays loopback-only.
The file-only plugin copies Dockerfile, .dockerignore and compose.yaml; it does
not install Docker. Review existing files before adding; never overwrite a
custom container recipe. The Node 22 image tag receives upstream updates and
is not digest-pinned. Build/test the image in your own deployment environment.

Forgix copies files only. Dependencies and integration remain manual.
