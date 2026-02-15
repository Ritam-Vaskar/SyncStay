FROM node:20-alpine

WORKDIR /app

# Accept build-time env vars (values provided by docker-compose.yml)
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_RAZORPAY_KEY_ID

# Vite inlines these at build time
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Install lightweight static server
RUN npm i -g serve

EXPOSE 3000

# Serve the built files (-s enables SPA fallback)
CMD ["serve", "-s", "dist", "-l", "3000"]
