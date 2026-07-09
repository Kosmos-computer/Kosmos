#!/usr/bin/env bash
# One-time Stripe setup for the control plane (test mode).
# Usage: STRIPE_SECRET_KEY=sk_test_... ./scripts/setup-stripe.sh
set -euo pipefail

: "${STRIPE_SECRET_KEY:?Set STRIPE_SECRET_KEY}"

PRODUCT_JSON=$(curl -s https://api.stripe.com/v1/products \
  -u "${STRIPE_SECRET_KEY}:" \
  -d name='Arco Bundle (test)' \
  -d description='Hosted Arco instance with $5 included inference credits')

PRODUCT_ID=$(echo "$PRODUCT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")
if [ -z "$PRODUCT_ID" ]; then
  echo "Failed to create product:" >&2
  echo "$PRODUCT_JSON" >&2
  exit 1
fi

PRICE_JSON=$(curl -s https://api.stripe.com/v1/prices \
  -u "${STRIPE_SECRET_KEY}:" \
  -d product="$PRODUCT_ID" \
  -d unit_amount=2500 \
  -d currency=usd \
  -d 'recurring[interval]=month')

PRICE_ID=$(echo "$PRICE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")
if [ -z "$PRICE_ID" ]; then
  echo "Failed to create price:" >&2
  echo "$PRICE_JSON" >&2
  exit 1
fi

echo "STRIPE_PRICE_ID=$PRICE_ID"
echo ""
echo "Next: register webhook at https://arco-control-plane.fly.dev/webhooks/stripe"
echo "Events: checkout.session.completed, customer.subscription.deleted, invoice.payment_failed"
echo "Then: fly secrets set --app arco-control-plane STRIPE_PRICE_ID=$PRICE_ID STRIPE_WEBHOOK_SECRET=whsec_..."
