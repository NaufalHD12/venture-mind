FROM python:3.12-slim

# Set environment variables untuk mencegah prompt interaktif saat build
ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Install dependensi sistem yang dibutuhkan oleh WeasyPrint
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    libgobject-2.0-0 \
    gobject-introspection \
    libgirepository1.0-dev && \
    rm -rf /var/lib/apt/lists/*

# Tetapkan direktori kerja di dalam container
WORKDIR /app

# Salin file requirements dan install dependensi Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Salin sisa kode aplikasi Anda
# Asumsi kode Python ada di dalam subdirektori bernama 'app'
COPY ./app /app/app

# Salin Procfile (meskipun kita akan menggunakan perintah dari sini)
COPY Procfile .

# Ekspos port yang akan digunakan aplikasi
EXPOSE 8080

# Perintah untuk menjalankan aplikasi menggunakan Gunicorn
CMD [ "gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--timeout", "400", "app.main:app" ]