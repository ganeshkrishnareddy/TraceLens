# TraceLens API - build from the repository root:
#   docker compose build backend
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first so this layer caches across code changes.
COPY backend/requirements.txt /app/backend/requirements.txt
RUN python -m pip install --upgrade pip \
 && python -m pip install -r /app/backend/requirements.txt

# backend/app/config.py resolves ROOT as parents[2] and expects these siblings.
COPY backend /app/backend
COPY ml-engine /app/ml-engine
COPY scripts /app/scripts
COPY datasets /app/datasets
COPY models /app/models
COPY experiments /app/experiments
COPY reports /app/reports
RUN mkdir -p /app/logs

WORKDIR /app/backend
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
