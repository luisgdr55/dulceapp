FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev
RUN npx prisma generate
COPY src ./src
COPY start.sh ./start.sh
RUN chmod +x start.sh
RUN DATABASE_URL="placeholder" npx prisma generate
EXPOSE 3000
CMD ["./start.sh"]
