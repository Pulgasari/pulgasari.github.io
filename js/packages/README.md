# @pulgasari

utility packages published on [JSR](https://jsr.io) under the `@pulgasari`
scope. this directory is a [deno workspace](https://docs.deno.com/runtime/fundamentals/workspaces/):
each member has its own `deno.json` (name, version, exports, license) and
members reference each other by their package name, resolved locally in the
workspace and recorded as `jsr:` dependencies on publish.

## packages

| package             | version | depends on                    |
| ------------------- | ------- | ----------------------------- |
| `@pulgasari/is`     | 1.0.1   | —                             |
| `@pulgasari/logger` | 1.0.0   | —                             |
| `@pulgasari/num`    | 1.0.0   | —                             |
| `@pulgasari/obj`    | 1.0.0   | `@pulgasari/str` (CanonicalMap) |
| `@pulgasari/str`    | 1.0.0   | —                             |
| `@pulgasari/url`    | 1.0.0   | `@pulgasari/is`, `@pulgasari/str` |

## what jsr needs

- **config** (`deno.json` or `jsr.json`): required `name` (scoped) and
  `exports`; `version` is required to publish. optional `license` (an spdx id,
  shown on the package page) and `publish` (include/exclude, or `false` to skip
  a workspace member). there is **no** `description` or `keywords` field.
- **description**: not in the config — set it per package in the jsr.io web ui
  (package → settings). it feeds search and the package card.
- **readme**: each package's `README.md` is rendered as its overview page.
- **docs**: symbol docs are generated from jsdoc comments; a leading module
  jsdoc block becomes the module overview.
- **score**: jsr rates each package (has readme, has description, documents all
  symbols, no slow types, provenance, etc.) — the items above raise it.

## prerequisites (one-time, on jsr.io)

1. create the `@pulgasari` scope at <https://jsr.io/new>.
2. create each package (`@pulgasari/is`, `@pulgasari/logger`, …) at
   <https://jsr.io/new>. a package must exist before its first publish.
3. for repo publishing: in each package's jsr settings, link the github repo
   `pulgasari/pulgasari.github.io`. this enables oidc auth (no tokens) and
   provenance.

## publishing from the repo

the workflow `.github/workflows/jsr-publish.yml` publishes the whole workspace
via oidc. run it manually (actions → "publish to jsr" → run workflow). it needs
`id-token: write` and executes `deno publish` in this directory.

## publishing locally

```sh
cd js/packages
deno publish              # publishes every member
deno publish --dry-run    # validate without uploading
```

## releasing again

jsr versions are immutable — you cannot overwrite a published version. to
release, bump the `version` in the member's `deno.json` first. `deno publish`
publishes every workspace member, so when releasing only one package, set
`"publish": false` on the members you are not releasing (or publish from that
member's own directory), otherwise the already-published versions error out.
first publish of `@pulgasari/obj` and `@pulgasari/url` requires their
dependencies to be published too — a full-workspace `deno publish` handles this
in one pass.
