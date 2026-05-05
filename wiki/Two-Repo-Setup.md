# Two-Repo Setup (Arena-RC Project)

This setup separates **Type-AAS / Blueprints** and **generated DPPs** into two independent BaSyx repository stacks. The AAS Generator writes to the DPP repo while reading blueprints from the Type repo.

---

## Local Development

### 1. Start the infrastructure

Use the VS Code launch script **"Start Arena-RC2026"** or run:

```bash
docker compose -f docker-compose/compose.arena-rc.yml -p mnestix-arena up
```

### 2. Configure Mnestix Infrastructure Settings

After startup, open the Mnestix Browser and head to **Settings → Infrastructures**. Add both repositories:

**Type-Repo:**

| Field                   | Value                                |
| ----------------------- | ------------------------------------ |
| AAS Repository URL      | `http://localhost:5066/repo`         |
| Submodel Repository URL | `http://localhost:5066/repo`         |
| Discovery URL           | `http://localhost:5066/discovery`    |
| API Key                 | your `MNESTIX_BACKEND_API_KEY` value |

**DPP-Repo:**

| Field                   | Value                                |
| ----------------------- | ------------------------------------ |
| AAS Repository URL      | `http://localhost:5065/repo`         |
| Submodel Repository URL | `http://localhost:5065/repo`         |
| Discovery URL           | `http://localhost:5065/discovery`    |
| API Key                 | your `MNESTIX_BACKEND_API_KEY` value |

Make sure to set the API key for the DPP-Repo in the **Security Settings** as well.

> [!IMPORTANT]
> The **default infrastructure** should only have the AAS Generator configured. The following environment variables must be **empty** (not set) in `.env.development.local`:
>
> ```
> AAS_REPO_API_URL
> SUBMODEL_REPO_API_URL
> CONCEPT_DESCRIPTION_REPO_API_URL
> DISCOVERY_API_URL
> REGISTRY_API_URL
> SUBMODEL_REGISTRY_API_URL
> SERIALIZATION_API_URL
> ```

### 3. Set additional environment variables

For local development, add this to `.env.development.local`:

```env
OVERRIDE_RC_ATTACHMENT_REPO=http://localhost:5065/repo
```

This is required because both repos share the same host (`localhost`) and only differ by port — the attachment upload needs to target the DPP repo explicitly.

> [!TIP]
> If you encounter authentication issues after configuring the repos, delete the SQLite database file (`prisma/database/`) and verify that `SECRET_ENC_KEY` is set correctly in your environment.

### 4. Create Blueprints

```bash
yarn setup-blueprints
```

This creates the default blueprints in the Type repo's submodel environment and writes their IDs into `.env.development.local` (`FILE_UPLOAD_BLUEPRINTS_VEC` and `FILE_UPLOAD_BLUEPRINTS_KBL`).

---

## Production Deployment

The production deployment differs from the local `compose.arena-rc.yml` in several ways:

| Aspect                         | Local (`compose.arena-rc.yml`)                                   | Production                                                                                    |
| ------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Networking**                 | Single shared `mnestix-network`, ports exposed directly          | Isolated networks per repo (`mnestix-dpp-repo`, `mnestix-type-repo`) + external `traefik-net` |
| **Ingress / TLS**              | Direct port access (5065, 5066, 8081, etc.)                      | [Traefik](https://traefik.io/) reverse proxy with automatic TLS (`certresolver`)              |
| **Service discovery**          | Not included                                                     | `discovery_sync` sidecar per repo (polls repo and registers AAS in discovery)                 |
| **AAS Generator `ServerUrls`** | Points to internal proxy (`http://mnestix-proxy-dpp:5065/repo/`) | Points to public DPP proxy URL (`https://api.dpp.<domain>/repo`)                              |
| **Browser → Repos**            | Connects via `localhost:<port>`                                  | Connects via Traefik hostnames configured in Mnestix settings UI                              |
| **Auto-updates**               | Manual rebuild                                                   | Watchtower labels for automatic image pulls                                                   |
| **Images**                     | Local build / dev tags                                           | Published GHCR image (`ghcr.io/arena2036/thls-dpp-mnestix-browser:robotik-challenge-main`)    |

### Network Topology

```
Internet
  │
  ▼
Traefik (TLS termination)
  ├── robotik-challenge.arena2036.app        → mnestix-browser:3000
  ├── api.dpp.<domain>                       → mnestix-proxy-dpp-repo:5065
  └── api.type.<domain>                      → mnestix-proxy-type-repo:5065
                                                      │
                                    ┌─────────────────┼─────────────────┐
                                    ▼                                   ▼
                          DPP Repo Network                    Type Repo Network
                     ┌──────────────────────┐          ┌──────────────────────┐
                     │ aas-environment-dpp  │          │ aas-environment-type │
                     │ aas-discovery-dpp    │          │ aas-discovery-type   │
                     │ mongodb-dpp          │          │ mongodb-type         │
                     │ discovery_sync_dpp   │          │ discovery_sync_type  │
                     └──────────────────────┘          └──────────────────────┘
                                    ▲
                                    │
                          mnestix-aas-generator
                          (shared, writes to DPP repo)
```

### Key Environment Variables (Browser — Production)

```env
MNESTIX_AAS_GENERATOR_API_URL=http://mnestix-proxy-type-repo:5065
MNESTIX_BACKEND_API_KEY=${API_KEY}
FILE_UPLOAD_BLUEPRINTS_VEC='["<blueprint-id-1>", ..., "<blueprint-id-7>"]'
FILE_UPLOAD_BLUEPRINTS_KBL='["<blueprint-id-1>", ..., "<blueprint-id-7>"]'
```

> [!NOTE]
> In production, each repo stack is fully isolated on its own Docker network. Only the Traefik network bridges external traffic to the proxy containers. The `discovery_sync` service ensures the AAS Discovery stays in sync with the repository without relying on the generator's built-in registry middleware.

---

## Compose Files

| File                                  | Purpose                                                  |
| ------------------------------------- | -------------------------------------------------------- |
| `docker-compose/compose.arena-rc.yml` | Local two-repo development (both repos + AAS Generator)  |
| Production compose (not in repo)      | Adds Traefik labels, `discovery_sync`, isolated networks |
