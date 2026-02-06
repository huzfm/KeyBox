# KeyBox

A license key manager that generates, validates, and revokes access to your software

This Turborepo contains:

- **Backend API** (Node.js)
- **Frontend Dashboard** (Next.js)
- **SDKs**
     - Node.js SDK
     - Python FastAPI SDK
     - Dotnet SDK

---

## Repository Structure

```
KeyBox/
├── apps/
│   ├── server/                 # Backend API (Node.js)
│   └── web/                    # Frontend dashboard (Next.js)
│   └── sdk/
│       ├── node-sdk/           # Node.js SDK
│       └── python-sdk/         # Python FastAPI SDK
│       └── dotnet-sdk/         # Dotnet SDK
├── packages/
│       ├── eslint-config/
│       ├── typescript-config/
│       ├── ui/
├── .github/
├── .vscode/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Python 3.10+ (for Python SDK) 
- Dotent (for Dotnet SDK)

---

### Install dependencies

```bash
pnpm install
```

---

### Run all apps (dev mode)

```bash
pnpm turbo dev
```

---

## Backend – `apps/server`

The server handles:

- License activation
- License validation
- Client/project management
- Authentication

Run only backend:

```bash
pnpm --filter server dev
```

---

## Frontend – `apps/web`

The dashboard lets users:

- Manage clients & projects
- Create licenses
- Access SDK usage docs

Run only frontend:

```bash
pnpm --filter web dev
```

## Contributing

Pull requests and ideas are welcome.
