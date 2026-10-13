# Forgix tailwind file-only asset

This copies a Tailwind 4 CSS entry and HTML demo into tooling/tailwind/.
It does not install dependencies, change framework configs or import CSS
into your application. Do not mix it blindly with an existing Tailwind setup
(in particular, shadcn-next already has its own complete Tailwind setup).

```sh
npm install --save-dev --ignore-scripts --save-exact tailwindcss@4.3.3 @tailwindcss/cli@4.3.3
npx --no-install @tailwindcss/cli -i tooling/tailwind/input.css -o public/tailwind.css --minify
```

Open tooling/tailwind/demo.html directly to see the generated CSS (no server
required). For your app, import/link the output deliberately and add the CSS
build step to your scripts. @source paths cover src/, app/ and index.html;
adjust for your layout. This standalone CLI recipe is not automatic Vite,
Next.js, PostCSS or shadcn/ui integration. No remote hooks are included.

Forgix copies files only. Dependencies and integration remain manual.
