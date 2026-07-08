FROM ghcr.io/berriai/litellm:main-stable

COPY config.yaml /app/gateway-config.yaml

CMD ["--config", "/app/gateway-config.yaml", "--port", "4000"]
