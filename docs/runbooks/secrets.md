# Runbook: Secrets

Secrets liegen ausschließlich in Bitwarden (Ordner `reiseplaner`) und als Worker-Secrets. Im Repository stehen nur Namen, nie Werte.

| Secret | Zweck | Bitwarden-Item | Umgebung |
|---|---|---|---|
| `LITEAPI_API_KEY` | Tarife, Inhalte, Buchung | `reiseplaner/liteapi-sandbox`, `reiseplaner/liteapi-live` | sandbox, live |
| `ANTHROPIC_API_KEY` | Laufzeit-Skills | `reiseplaner/anthropic-runtime` | sandbox, live |
| `ORS_API_KEY` | Fahrzeit-Matrix (personengebunden, BG-06) | `reiseplaner/heigit-ors` | sandbox, live |
| `RESEND_API_KEY` | E-Mail | `reiseplaner/resend` | sandbox, live |
| `SIGNING_KEY` | HMAC für Buchungs-Tokens | `reiseplaner/signing-key-<env>` | alle |
| `IP_HASH_SALT` | Salz für IP-Hashes | `reiseplaner/ip-hash-salt-<env>` | alle |
| `ALTCHA_HMAC_KEY` | Bot-Schutz | `reiseplaner/altcha-hmac-<env>` | alle |
| `OPS_HB_TOKEN` | Heartbeats an den Ops-Worker | `reiseplaner/ops-hb-token` | alle |

## Setzen

```bash
wrangler secret put SIGNING_KEY --env staging   # Wert aus Bitwarden einfügen
```

Lokal: `packages/worker/.dev.vars` (gitignored, wird von `npm run dev` mit Zufallswerten angelegt). Vorlage: `.dev.vars.example`.

## Regeln

- Schlüssel und Tokens werden nie geloggt; E-Mail-Adressen in Logs nur maskiert.
- Tests brauchen keine Secrets (feste, nicht geheime Testwerte in `packages/worker/test/bindings.ts`).
- gitleaks läuft als Pre-Commit-Hook (`git config core.hooksPath .githooks`) und in der CI.
