import io
import random
import string
from app import app, db

# Helper to generate random email
def rand_email():
    return 'test+' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6)) + '@example.com'

PASSWORD = 'TestPass123!'

with app.test_client() as client:
    # 1) Register new user
    email = rand_email()
    name = 'E2E Tester'
    phone = '081234567890'
    resp = client.post('/register', data={
        'name': name,
        'email': email,
        'phone': phone,
        'password': PASSWORD,
        'confirm_password': PASSWORD,
    }, follow_redirects=True)
    print('Register ->', resp.status_code)

    # find created user
    user = db.users.find_one({'email': email})
    if not user:
        print('User not found in DB after register; aborting')
        raise SystemExit(1)
    user_id = str(user['_id'])
    print('User created:', user_id)

    # 2) Login
    r = client.post('/login', data={'email': email, 'password': PASSWORD})
    print('Login POST ->', r.status_code, 'json->', r.get_json())
    if not r.get_json() or not r.get_json().get('success'):
        print('Login failed')
        raise SystemExit(1)

    # 3) Update profile with avatar upload
    avatar_bytes = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"0"*1024)  # small fake PNG header + data
    data = {
        'name': 'E2E Tester Modified',
        'phone': '081298765432',
        'avatar': (avatar_bytes, 'avatar.png')
    }
    r2 = client.post('/profile', data=data, content_type='multipart/form-data')
    print('/profile POST ->', r2.status_code)

    # reload user
    updated = db.users.find_one({'_id': user['_id']})
    print('Updated phone:', updated.get('phone'))
    print('Updated avatar_url:', updated.get('avatar_url'))

    # cleanup: remove test user and uploaded avatar file
    try:
        avatar_url = updated.get('avatar_url')
        if avatar_url:
            import os
            path = os.path.join(os.getcwd(), avatar_url.replace('/', os.sep))
            if os.path.exists(path):
                os.remove(path)
                print('Removed uploaded avatar:', path)
    except Exception as e:
        print('Error removing avatar file:', e)

    db.users.delete_one({'_id': user['_id']})
    print('Cleaned up test user')
