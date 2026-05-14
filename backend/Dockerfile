FROM python:3.11-slim

WORKDIR /workspace/select/backend

# System deps for asyncpg + git (useful in devcontainer)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev git curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source — in devcontainer this is overridden by volume mount
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
