# Mulai dari base image Python yang ramping
FROM python:3.12-slim

# Set variabel agar proses instalasi tidak macet
ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Install dependensi sistem yang dibutuhkan oleh WeasyPrint
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangoft2-1.0-0 libgdk-pixbuf2.0-0 libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Tetapkan direktori kerja di dalam container
WORKDIR /app

# Salin file requirements dari root konteks build (yaitu, dari folder backend/)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Salin kode Python Anda dari folder app/ yang ada di dalam backend/
COPY ./app /app/app

# Perintah untuk menjalankan aplikasi menggunakan Gunicorn
CMD [ "gunicorn", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "--timeout", "400", "app.main:app" ]