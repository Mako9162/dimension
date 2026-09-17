FROM node:20-alpine

# Instalar Python3, pip y dependencias del sistema para Pillow/ReportLab
RUN apk add --no-cache python3 py3-pip py3-pillow
RUN pip3 install reportlab pillow --break-system-packages

WORKDIR /app

# Copiar archivos de dependencias e instalar
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copiar el resto del código fuente del backend
COPY . .

# Generar cliente de Prisma
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

CMD ["npm", "start"]
