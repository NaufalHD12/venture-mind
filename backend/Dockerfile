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

# Salin file requirements dan install semua library Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Salin semua kode Python Anda
COPY ./app /app/app

# Perintah untuk menjalankan aplikasi menggunakan Gunicorn
CMD [ "gunicorn", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "--timeout", "400", "app.main:app" ]