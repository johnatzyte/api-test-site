#!/usr/bin/env bash

set -eu

if [ "$#" -ne 1 ]; then
    printf 'Usage: %s user@remote-host\n' "$0" >&2
    exit 2
fi

remote_host=$1
cdp_port=${CDP_PORT:-9222}
profile_dir=${CHROMIUM_PROFILE:-"$HOME/.cache/chromium-cdp-profile"}

find_browser() {
    for browser in chromium-browser chromium google-chrome; do
        if command -v "$browser" >/dev/null 2>&1; then
            printf '%s' "$browser"
            return
        fi
    done
    printf 'No Chromium-compatible browser found.\n' >&2
    exit 1
}

browser=$(find_browser)
"$browser" \
    --remote-debugging-address=127.0.0.1 \
    --remote-debugging-port="$cdp_port" \
    --user-data-dir="$profile_dir" \
    --no-first-run \
    --no-default-browser-check >/dev/null 2>&1 &
browser_pid=$!

cleanup() {
    kill "$browser_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

printf 'Waiting for Chromium CDP on 127.0.0.1:%s...\n' "$cdp_port"
for _ in $(seq 1 30); do
    if curl --silent --fail "http://127.0.0.1:$cdp_port/json/version" >/dev/null; then
        break
    fi
    sleep 1
done

if ! curl --silent --fail "http://127.0.0.1:$cdp_port/json/version" >/dev/null; then
    printf 'Chromium did not start its CDP endpoint.\n' >&2
    exit 1
fi

printf 'Opening reverse tunnel to %s.\n' "$remote_host"
exec ssh \
    -N \
    -T \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=30 \
    -R "127.0.0.1:$cdp_port:127.0.0.1:$cdp_port" \
    "$remote_host"
