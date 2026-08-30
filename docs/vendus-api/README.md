# Vendus API — OpenAPI specs

Official OpenAPI 3.0 specifications for the Cegid Vendus POS API, downloaded from
`https://www.vendus.pt/ws/{version}/api.jsonapi` (the JSON source behind the
Redoc docs viewer at https://www.vendus.pt/ws/). No API key is required to fetch them.

| File | Version | Notes |
|---|---|---|
| `vendus-api-v1.1.openapi.json` | v1.1 | Current **default** API version (70 paths, 108 schemas) |
| `vendus-api-v1.2.openapi.json` | v1.2 | **Latest** version (111 paths, 167 schemas) — adds QR code, VendusPay, ATCUD fields |

## Refreshing

```sh
scripts/fetch-vendus-api-docs.sh
git diff docs/vendus-api/   # shows what changed upstream
```

After a spec change, regenerate the TypeScript client that is built from it:
`cd vendus && bun run openapi:generate` (see `vendus/README.md`).

The server sends no ETag/Last-Modified headers, so change detection is by content
diff: the script pretty-prints with sorted keys for stable diffs.

## Caveats

- `servers` in the specs is empty — the real base URL is `https://www.vendus.pt/ws/{version}/`.
- `components.securitySchemes` is empty — authentication (API key via Bearer header,
  Basic auth, or `?api_key=` query param) is documented only in the spec's
  `info.description` prose.
- API access requires a Vendus **Flex** or **Pro** plan; the key is generated per
  user under **Apps > API** and carries that user's full (write-capable) permissions.
