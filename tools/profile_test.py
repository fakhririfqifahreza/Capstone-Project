import requests
import time

BASE = 'http://127.0.0.1:5000'

print('Starting interactive test against', BASE)

# wait for server
for i in range(15):
    try:
        r = requests.get(BASE + '/')
        print('GET / ->', r.status_code)
        break
    except Exception as e:
        print('Server not up yet, retrying...', i, str(e))
        time.sleep(1)
else:
    print('Server did not start within timeout. Exiting.')
    raise SystemExit(1)

# endpoints to check
endpoints = ['/', '/login', '/profile', '/static/js/profile.js']
for ep in endpoints:
    url = BASE + ep
    try:
        r = requests.get(url, allow_redirects=True, timeout=5)
        print(f'GET {ep} ->', r.status_code, 'len=', len(r.text))
        if ep == '/profile':
            # show if redirected to login
            if r.url.endswith('/login'):
                print('  -> /profile redirected to /login (not authenticated)')
    except Exception as e:
        print(f'GET {ep} failed:', e)

# attempt calling change_password without auth
try:
    r = requests.post(BASE + '/change_password', json={'current_password':'x','new_password':'y'})
    print('/change_password POST ->', r.status_code)
    try:
        print('  json:', r.json())
    except Exception:
        print('  response text:', r.text[:200])
except Exception as e:
    print('/change_password request failed:', e)

print('Interactive test finished.')
