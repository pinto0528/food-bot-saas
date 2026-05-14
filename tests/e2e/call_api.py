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
try:
    resp = urllib.request.urlopen(req, timeout=30)
    raw = resp.read()
    data = json.loads(raw.decode('utf-8'))
    print(json.dumps(data, ensure_ascii=False))
except Exception as e:
    print(json.dumps({'error': str(e)}, ensure_ascii=False))
