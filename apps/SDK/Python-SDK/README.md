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
    interval_seconds=86400, # Validation check once per day
)

@app.get("/")
def read_root():
    return {"message": "Protected App"}
```

## Features

- **Automated Validation**: Set background license checks with configurable intervals.
- **Easy Integration**: Built-in support for FastAPI.
- **Secure**: Cryptographically secure validation.

## Documentation

Visit [keybox.dev/docs](https://keybox.dev/docs) for full documentation.
