# {{projectName}}

Forgix materializes the bundled pack-safe ignore asset as `.gitignore` automatically.
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
