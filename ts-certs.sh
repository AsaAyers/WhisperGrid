#!/bin/sh
set -x

/usr/local/bin/containerboot &

alias ts="tailscale --socket /var/lib/tailscale/tailscaled.sock"
DOMAIN=$(ts cert 2>&1 | egrep '[^"]+.ts.net' -o)

while [ -z "$DOMAIN" ] ; do
  ts cert 2>&1 | tee /tmp/cert.log
  DOMAIN=$(egrep '[^"]+.ts.net' -o /tmp/cert.log)
  sleep 2
done

echo "DOMAIN: $DOMAIN"

# ntfy on port :4433 uses these certs
ts cert \
  --cert-file /var/lib/tailscale/cert.pem \
  --key-file /var/lib/tailscale/key.pem \
  $DOMAIN

ts serve --bg http://localhost:9001/

wait -n
exit $?