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
| The Rust installation | `scripts/install-rust-toolchain.sh` | Brings the toolchain and the `wasm32` target into a build image that has none. |
| The deployment | `.github/workflows/deploy-cloudflare.yml` | The second path: GitHub builds the module, the shell and the headers and uploads them. |
| The base path as a variable | `config/security-headers.mjs`, `next.config.ts`, `src/core/phomu-core.ts` | `/Phomu` on GitHub Pages, empty on a Pages project. |

**The workflow skips itself** when the token is missing
(`if: ${{ secrets.CLOUDFLARE_API_TOKEN != '' }}`). The repository therefore
stays usable without a Cloudflare account.

---

## 2. The two ways to deploy

Both are prepared. They differ in **who builds**.

### Path A — the Git integration (the build runs at Cloudflare)

The repository is connected to the Pages project and Cloudflare builds it on
every push.

**Set the build command in the dashboard as well**
(**Workers & Pages → phomu → Settings → Builds & deployments**):

| Setting | Value |
|---|---|
| Build command | `bash scripts/install-rust-toolchain.sh && npm run build` |
| Build output directory | `out` |
| Root directory | `/` (the repository root) |
| Environment variables | `NEXT_PUBLIC_BASE_PATH` = *(empty)* |

The same values are in `wrangler.toml`, so that a project created from the
command line gets them too. The dashboard is authoritative for a project that
was created in the dashboard.

```toml
[build]
command = "bash scripts/install-rust-toolchain.sh && npm run build"
output_dir = "out"
```

**WHY the toolchain is installed first:** the shell loads the shared Rust base
as a WebAssembly module, and the module has to be built before the shell can
resolve the import. The build image of the Pages service carries no Rust
toolchain — without the installation the build dies with
`cargo build --release --target wasm32-unknown-unknown -p phomu-wasm failed`.

The installation takes two to three minutes on the first build. Cloudflare
caches the build output, and the toolchain is installed again on every build —
if the build time matters, Path B is faster.

### Which path should you use?

**Path B — the GitHub Actions workflow — unless you have a reason not to.**

The workflow brings three things the Pages build image does not have:

- the Rust toolchain, installed and cached by the action
- the quality gates: the deployment is refused when the security headers in
  `public/_headers` do not match their source
- the check of the project name, which turns a guess into a fact

The Pages build image carries none of that. It can be made to work — the
command installs the toolchain — but every build then downloads and unpacks
the toolchain again, and the gates do not run.

**If you keep the Git integration**, set the build command in the dashboard to

```
bash scripts/install-rust-toolchain.sh && npm run build
```

and accept that the dashboard shows the build of the Git integration next to
the deployments of the workflow. Two build paths for one project are a source
of confusion — disconnecting the Git integration
(**Workers & Pages → phomu → Settings → Builds & deployments →
Git → Disconnect**) leaves the workflow as the only deployer, and the
deployments of the workflow still show up in the same list.

### Path B — the GitHub Actions workflow (the build runs at GitHub)

The workflow installs the toolchain through `dtolnay/rust-toolchain`, builds
the module, the shell and the headers, and uploads the result with
`wrangler`. It needs the two repository secrets (section 3) and **no** Git
connection in Cloudflare: the project is created with
**Workers & Pages → Create application → Pages → Upload assets**, and the
workflow takes it from there.

The workflow **skips itself** when the token is missing, so the repository
stays usable without a Cloudflare account.

---

## 3. The three steps that need your account

### 3.1 Create the account and the project

1. Create an account at <https://dash.cloudflare.com/sign-up>.
2. Add the project: **Workers & Pages → Create application → Pages**
   - for Path A: **Connect to Git** and pick the repository
   - for Path B: **Upload assets**, the project name has to be **`phomu`** —
     it decides the address `phomu.pages.dev`; the upload dialog is left open
3. Copy the **account id**: **Workers & Pages → your account → Account ID**
   (or the right-hand side of the dashboard).
4. Note the **name of the project**. It has to match exactly — Cloudflare
   lowercases it, and a name that does not exist fails with
   *"Project not found"* (code 8000007). The workflow reads it from the
   repository variable `CLOUDFLARE_PROJECT_NAME` and falls back to `phomu`.
   If your project has a different name, add the variable:
   **Repository → Settings → Secrets and variables → Actions → Variables →
   `CLOUDFLARE_PROJECT_NAME`**.

   The workflow checks the name against the account before it uploads and
   lists the projects that do exist — so a wrong name is reported with the
   right one next to it.

### 3.2 Create the API token

1. **My Profile → API Tokens → Create Token**
2. **Permissions**: `Account` → `Cloudflare Pages` → **Edit**
3. **Account Resources**: your account
4. Copy the token — it is shown only once.

### 3.3 Add both to the repository

**Repository → Settings → Secrets and variables → Actions → New repository
secret**:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from 3.2 |
| `CLOUDFLARE_ACCOUNT_ID` | the account id from 3.1 |

**Done.** The next push to `main` deploys to Cloudflare Pages — through the
Git integration (Path A) or through the workflow (Path B). The workflow can
also be started by hand: **Actions → Deploy to Cloudflare Pages → Run
workflow**.

---

## 4. Checking the deployment

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

## 4a. When the build fails

| Message | Meaning | What to do |
|---|---|---|
| `cargo build --release --target wasm32-unknown-unknown -p phomu-wasm failed` | The build image has no Rust toolchain | The build command has to start with `bash scripts/install-rust-toolchain.sh` — check the build command in the dashboard |
| `Module not found: Can't resolve 'phomu_wasm_bg.wasm'` | The module was not built before the shell | The build command has to run `npm run build` and not `npx next build` — the package script runs the `prebuild` step |
| `Project not found ... [code: 8000007]` | The project name or the account id is wrong | The workflow now lists the projects of the account. Check `CLOUDFLARE_PROJECT_NAME` and `CLOUDFLARE_ACCOUNT_ID` |
| `A request to the Cloudflare API ... failed` | The token has the wrong permission | The token needs **Cloudflare Pages: Edit** for the account |
| The build succeeds, the page stays empty | The output directory is wrong | It has to be `out`, not `.next` |

---

## 5. A custom domain

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

## 6. What is not covered yet

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

## 7. Rolling back

The workflow deploys on every push to `main`. To go back to the previous
deployment:

**Workers & Pages → phomu → Deployments** — every deployment is listed with
its commit, and a previous one can be promoted again.

The GitHub Pages deployment is untouched by all of this: it is a separate
workflow, it builds the same commit, and it keeps working.

The same applies to the Pages deployment: **Workers & Pages →
phomu → Deployments** lists every deployment with its commit, and an earlier one can
be promoted again.
