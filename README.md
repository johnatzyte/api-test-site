# E-commerce Demo Site

A demo e-commerce application with a Flask API backend and Vanilla JS frontend.

## Features
- Product listing with pagination
- Product details
- Partial, case-insensitive product search by name or SKU
- Filtering by category and stock status
- Sorting by name, price, or rating
- Select up to three products for comparison
- On-demand product availability checks
- Security features:
  - CORS restriction
  - User-Agent blocking
  - Referer checking
  - JavaScript challenge (Anti-bot)

## Running the Application

### Development
To run the development server:
```bash
uv run main.py
```

### Production
To run with Gunicorn (Production Server):
```bash
uv run gunicorn -c gunicorn.conf.py main:app
```

## API

The product list accepts these optional query parameters:

- `q` — partial name, ID, or SKU search
- `category` — exact category filter
- `in_stock=true` — show products with stock available
- `sort` — `name_asc`, `price_asc`, `price_desc`, or `rating_desc`

Product availability is returned by:

```text
GET /api/products/<id>/availability
```

## Chromium CDP tunnel

For browser automation from the remote host, run this script on the machine
where Chromium should run:

```bash
./scripts/start-chromium-cdp-tunnel.sh user@remote-host
```

It starts an isolated Chromium profile and creates a reverse SSH tunnel. The
remote host can then connect to `http://127.0.0.1:9222`. Stop the script with
`Ctrl-C` to close the tunnel and the browser.
