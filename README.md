# E-commerce Demo Site

A demo e-commerce application with a Flask API backend and Vanilla JS frontend.

## Features
- Product listing with pagination
- Product details
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
