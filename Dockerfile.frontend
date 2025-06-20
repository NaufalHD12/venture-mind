# 1. Mulai dari fondasi Node.js yang ringan
FROM node:18-alpine

# 2. Install program web server sederhana
RUN npm install -g http-server

# 3. Buat folder kerja
WORKDIR /app

# 4. (PERBAIKAN KUNCI) Salin HANYA folder 'static' ke dalam folder kerja
COPY ./static .

# 5. Jalankan web server dari folder kerja ini
CMD [ "http-server", "-p", "8080", "-c-1" ]