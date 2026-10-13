# Security

Forgix is an early-stage project. It is not a sandbox or a security auditing product.

Review template sources before allowing dependency lifecycle scripts or hooks. `--trust-remote` permits retrieving a remote template; it does not enable hooks or lifecycle scripts. Git uses your configured credentials. Do not include tokens in repository URLs.

Symbolic links are unsupported, project/plugin names are restricted, and composition paths must stay within their template. These checks do not protect against a malicious process changing files concurrently. Use isolated environments for untrusted inputs.

The governance checklist does not scan all application code or establish that a project is free of secrets or vulnerabilities.

If you find a vulnerability, use GitHub's private vulnerability reporting feature when enabled. Otherwise open an issue asking for a private reporting channel without including exploit details or credentials. Only the latest main-branch implementation receives fixes; no long-term support policy is established.
