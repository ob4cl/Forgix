# Contributing

Use Node.js 22.13 or newer. Install with `npm ci --ignore-scripts` and run `npm test`.

Keep changes focused and use pull requests. Include the problem, resulting behavior, verification, and any limitations. Changes to filesystem boundaries, output, template resolution, or execution controls should include regression coverage.

For templates, verify the generated project rather than only the template files: install dependencies, run the documented build/tests, and smoke-test the application. Never put credentials or personal contact details in examples.

Run `npm pack --dry-run` when changing packaging. Framework dependencies belong to the templates that use them. Avoid generic flags that imply integration across unsupported stacks.
