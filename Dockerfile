FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy project definition
COPY pyproject.toml .
# Copy lock file if it exists (it's okay if it doesn't for the build, uv sync will generate it)
# COPY uv.lock . 

# Install dependencies
# We use uv sync to install dependencies into a virtual environment
RUN uv sync

# Copy the rest of the application
COPY . .

# Expose the port
EXPOSE 5001

# Run the application using uv run to ensure we use the virtual environment
# We override the bind address to 0.0.0.0 to make it accessible outside the container
CMD ["uv", "run", "gunicorn", "-c", "gunicorn.conf.py", "--bind", "0.0.0.0:5001", "main:app"]
