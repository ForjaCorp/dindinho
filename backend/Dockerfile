FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV CI=true
RUN npm --prefix packages/shared run build
RUN npm --prefix backend run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/prisma.config.js ./backend/prisma.config.js
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
EXPOSE 3333
CMD ["sh", "-c", "echo 'Iniciando container...' && rm -f .env backend/.env && node -e 'if(!process.env.DATABASE_URL){console.error(\"DATABASE_URL ausente\");process.exit(1);}const net=require(\"net\");const {URL}=require(\"url\");const url=new URL(process.env.DATABASE_URL);const host=url.hostname;const port=Number(url.port||3306);let attempts=30;const wait=1000;let count=0;let lastError=\"\";const tryConnect=()=>{count+=1;console.log(\"Aguardando MySQL... tentativa \"+count+\"/\"+attempts+\" (\"+host+\":\"+port+\")\");const socket=net.connect({host,port},()=>{socket.end();console.log(\"MySQL pronto\");process.exit(0);});socket.on(\"error\",(err)=>{lastError=String(err&&err.code?err.code:err&&err.message?err.message:err);if(count>=attempts){console.error(\"Banco indisponível após \"+attempts+\" tentativas. Último erro: \"+lastError);process.exit(1);}setTimeout(tryConnect,wait);});};tryConnect();' && cd backend && npx prisma migrate deploy && node dist/server.js"]
