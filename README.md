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
