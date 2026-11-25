# parkpick-api (FastAPI) - 빌드 컨텍스트: backend/ (프런트엔드와 완전 분리)
# 로컬: docker compose up --build (docker-compose.yml 이 context: ./backend 지정)
# Render: Root Directory = backend, Dockerfile Path = backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
