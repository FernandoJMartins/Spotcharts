FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ build-base

# Install dependencies first (cacheable) then copy source and build
COPY package*.json ./
RUN npm install --silent

COPY . ./
RUN npm run build

# Serve build with a small static server
RUN npm install -g serve --silent
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
