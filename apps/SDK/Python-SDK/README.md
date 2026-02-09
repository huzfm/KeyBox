# KeyBox License Management SDK (Python)

Official Python SDK for [KeyBox](https://keybox.dev). Integrate license generation, validation, and management with ease.

## Installation

```bash
pip install keybox-sdk
```

## Quick Start (FastAPI)

```python
from fastapi import FastAPI
from keybox_sdk import protect_fastapi_app

app = FastAPI()

protect_fastapi_app(
    app=app,
    product_name="MyPythonApp",
    key="YOUR_LICENSE_KEY",
)

@app.get("/")
def read_root():
    return {"message": "Protected App"}
```

## Features

- **Automated Validation**: Automatic background license checks every 15 minutes.
- **Easy Integration**: Built-in support for FastAPI.
- **Secure**: Cryptographically secure validation.
