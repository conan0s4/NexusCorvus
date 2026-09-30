FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Build/runtime dependencies for mysqlclient (compiles if no wheel is
# available for this Python version).
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        pkg-config \
        default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x entrypoint.sh
# Executable bit is lost when files come from a Windows checkout; restore it
# for the Linux Chainsaw build (no-op when absent).
RUN chmod +x chainsaw_tool/chainsaw/chainsaw 2>/dev/null || true

EXPOSE 8000

CMD ["./entrypoint.sh"]