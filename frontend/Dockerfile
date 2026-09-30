FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

# Vite dev server with Hot Module Replacement, reachable inside Docker.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]