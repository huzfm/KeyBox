# KeyBox SDK for Node.js

Official Node.js SDK for [KeyBox](https://keybox.dev). Securely generate, validate, and manage software licenses in your Node.js applications.

## Installation

```bash
npm install keybox-sdk
```

## Quick Start (Express)

Integrate license protection into your Express application effortlessly:

```javascript
import express from "express"
import { protectNodeApp } from "keybox-sdk"

const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
        res.send("KeyBox app running")
})

// Run the app with protection
await protectNodeApp({
        app,
        port: PORT,
        productName: "MyNodeApp",
        key: process.env.KEYBOX_LICENSE_KEY,
})
```

## Features

- **Automated Validation**: Automatic background checks every 15 minutes.
- **Easy Integration**: Built-in support for Express server lifecycle.
- **Request Gating on Inactive Licenses**: When a license is expired or revoked, every request is rejected with **HTTP 402 Payment Required** and the message *"Please pay your developer"*. The process stays alive — when the license is renewed, the next request succeeds without a restart.
- **State Manager**: Inspect or override the current license state at runtime via `getLicenseState()` / `setLicenseState()`. States are `valid`, `expired`, `revoked`, `invalid`, `unknown`.
- **Custom Guard**: Mount `licenseGuard({ bypassPaths })` on selected routes for fine-grained control. `protectNodeApp` registers it globally by default.

## 402 response shape

```json
{
  "error": "LICENSE_INACTIVE",
  "state": "expired",
  "message": "Please pay your developer",
  "renewContact": "support@keybox.dev"
}
```
