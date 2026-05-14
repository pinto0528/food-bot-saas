#!/usr/bin/env python3
"""call_api.py - Send message to FoodBot chat API and print JSON response.

Usage: python call_api.py <api_base> <restaurant_id> <message> <cart_json> <history_json>
"""
import json
import sys
import urllib.request

api_base = sys.argv[1]
restaurant_id = sys.argv[2]
message = sys.argv[3]
cart = json.loads(sys.argv[4])
history = json.loads(sys.argv[5])

body = json.dumps({
    'message': message,
    'restaurantId': restaurant_id,
    'cart': cart,
    'history': history,
}).encode('utf-8')

req = urllib.request.Request(
    f'{api_base}/api/chat',
    data=body,
    headers={'Content-Type': 'application/json'},
    method='POST',
)
import os
os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

try:
    resp = urllib.request.urlopen(req, timeout=30)
    raw = resp.read()
    text = raw.decode('utf-8', errors='replace')
    data = json.loads(text)
    out = json.dumps(data, ensure_ascii=False)
    sys.stdout.buffer.write(out.encode('utf-8'))
    sys.stdout.buffer.write(b'\n')
except Exception as e:
    err = json.dumps({'error': str(e)}, ensure_ascii=False)
    sys.stdout.buffer.write(err.encode('utf-8'))
    sys.stdout.buffer.write(b'\n')
