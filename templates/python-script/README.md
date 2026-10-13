# {{projectName}}

If a packed Forgix CLI omitted `.gitignore`, copy the bundled `_gitignore`
to `.gitignore` before committing your project (`cp _gitignore .gitignore`,
or `Copy-Item _gitignore .gitignore` in PowerShell). The pack-safe fallback
is provided because npm excludes `.gitignore` from archives; automatic
materialization needs the pending CLI integration. Source-checkout generation
already includes `.gitignore`. Remove `_gitignore` after copying if desired.

A dependency-free Python command-line starter. Python 3.10+ is recommended.

```sh
python main.py
python main.py --name Starter
python main.py --help
python -m unittest discover -s tests -v
```

The script prints a greeting and exits. `main(argv=None)` is directly testable:
three tests cover a named greeting, the default and invalid arguments.
Extend `main.py` with your own work; no package installation or virtual
environment is needed. `.gitignore` excludes Python caches, local virtual
environments and local environment files. This is a script, not a web app.
