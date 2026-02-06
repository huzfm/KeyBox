# KeyBox SDK for Node.js

Official Node.js SDK for [KeyBox](https://keybox.dev). Securely generate, validate, and manage software licenses in your Node.js applications.

## Installation

```bash
npm install keybox-sdk
```

## Quick Start (Express)

Integrate license protection into your Express application effortlessly:

```javascript
import express from "express";
import { protectNodeApp } from "keybox-sdk";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
       res.send("KeyBox app running");
});

// Run the app with protection
await protectNodeApp({
       app,
       port: PORT,
       productName: "MyNodeApp",
       key: process.env.KEYBOX_LICENSE_KEY,
       intervalSeconds: 86400, // Validate license every 24 hours
});
```

## Features

- **Automated Validation**: Automatic background checks at configurable intervals.
- **Easy Integration**: Built-in support for Express server lifecycle.
- **Safe Lifecycle**: Automatically stops the server and exits the process if the license becomes invalid.
