# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_GTM_ID=
ENV VITE_GTM_ID=$VITE_GTM_ID
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
