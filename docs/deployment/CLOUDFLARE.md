# Deploying the web shell to Cloudflare Pages

The decision behind this document is
[`../adr/ADR-0010-hosting-on-cloudflare-pages.md`](../adr/ADR-0010-hosting-on-cloudflare-pages.md).
This is the runbook: what is already prepared in the repository, and the three
steps that need the account.

---

## 1. What is already in the repository

| Piece | Where | What it does |
|---|---|---|
| The security headers, one source | `config/security-headers.mjs` | The single list. The Next.js server reads it, Cloudflare gets it written out. |
| The generated header file | `public/_headers` | Written by `npm run generate:cloudflare-headers`, checked by `npm run check:cloudflare-headers` (a gate in the CI). |
| The function routes | `public/_routes.json` | Reserves `/api/*` for the Functions that the admin API and the round API will become. Everything else stays a free static request. |
| The Pages configuration | `wrangler.toml` | The project name, the build output directory (`out`) and the base path. |
| The deployment | `.github/workflows/deploy-cloudflare.yml` | Builds the WebAssembly module, builds the shell, checks the headers, uploads to Pages. |
| The base path as a variable | `config/security-headers.mjs`, `next.config.ts`, `src/core/phomu-core.ts` | `/Phomu` on GitHub Pages, empty on a Pages project. |

**The workflow skips itself** when the token is missing
(`if: ${{ secrets.CLOUDFLARE_API_TOKEN != '' }}`). The repository therefore
stays usable without a Cloudflare account.

---

## 2. The three steps that need your account

### 2.1 Create the account and the project

1. Create an account at <https://dash.cloudflare.com/sign-up>.
2. Add the project: **Workers & Pages → Create application → Pages → Connect
   to Git** — or, if you prefer the workflow to do the deployment, create it
   **without** a Git connection:
   - **Workers & Pages → Create application → Pages → Upload assets**
   - the project name has to be **`phomu`** — it decides the address
     `phomu.pages.dev`
   - the upload dialog is left open; the workflow does the real deployment
3. Copy the **account id**: **Workers & Pages → your account → Account ID**
   (or the right-hand side of the dashboard).

### 2.2 Create the API token

1. **My Profile → API Tokens → Create Token**
2. **Permissions**: `Account` → `Cloudflare Pages` → **Edit**
3. **Account Resources**: your account
4. Copy the token — it is shown only once.

### 2.3 Add both to the repository

**Repository → Settings → Secrets and variables → Actions → New repository
secret**:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from 2.2 |
| `CLOUDFLARE_ACCOUNT_ID` | the account id from 2.1 |

**Done.** The next push to `main` deploys to Cloudflare Pages. The workflow can
also be started by hand: **Actions → Deploy to Cloudflare Pages → Run
workflow**.

---

## 3. Checking the deployment

After the first successful run:

```bash
# The headers have to be there.
curl -sI https://phomu.pages.dev/ | grep -iE "content-security-policy|x-frame-options|strict-transport|x-content-type|referrer-policy|permissions-policy"

# The application has to start — the WebAssembly module is the first thing
# the browser fetches, and the game does not run without it.
curl -sI https://phomu.pages.dev/wasm/phomu_core_bg.wasm | head -3
```

The Content-Security-Policy has to contain **`'wasm-unsafe-eval'`**. Without
it the browser refuses to compile the module and the game does not start — that
is the one directive that exists only because of the shared Rust base.

---

## 4. A custom domain

The project is reachable at `phomu.pages.dev` without any further work. A
custom domain needs:

1. a domain in the same Cloudflare account (or a nameserver change to
   Cloudflare)
2. in the Pages project: **Custom domains → Set up a custom domain**
3. the certificate is issued automatically

**The base path changes with it.** On a custom domain the application is
served from the root, so `NEXT_PUBLIC_BASE_PATH` stays empty. If you want the
application under a subpath (`example.com/phomu/`), the variable in
`wrangler.toml` and in the workflow has to be set to `/phomu` — and the paths
inside the shell follow it, because the shell reads the same variable.

---

## 5. What is not covered yet

### The admin API

The admin API **writes files** (the cover images) and the Workers runtime has
no file system. It therefore needs an **R2 bucket** before it can run as a
Pages Function. The decision about the API itself is separate — see
[`../cr/CR-0002-admin-api-entscheidung.md`](../cr/CR-0002-admin-api-entscheidung.md).

### The round API

The answer key still travels to the browser. The base evaluates the round on
the device in the native shells; on the web it would need the server. The
function route `/api/*` is reserved for it.

### GitHub Pages

GitHub Pages stays deployed as the fallback. The two deployments are
independent — a failure of one does not touch the other.

---

## 6. Rolling back

The workflow deploys on every push to `main`. To go back to the previous
deployment:

**Workers & Pages → phomu → Deployments** — every deployment is listed with
its commit, and a previous one can be promoted again.

The GitHub Pages deployment is untouched by all of this: it is a separate
workflow, it builds the same commit, and it keeps working.
