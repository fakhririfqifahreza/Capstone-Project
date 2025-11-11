from app import app

print('Running in-process tests using Flask test_client')

with app.test_client() as client:
    try:
        r = client.get('/')
        print('GET / ->', r.status_code)
    except Exception as e:
        print('GET / failed:', e)

    try:
        r = client.get('/login')
        print('GET /login ->', r.status_code)
    except Exception as e:
        print('GET /login failed:', e)

    try:
        r = client.get('/profile', follow_redirects=False)
        print('GET /profile ->', r.status_code)
        if r.status_code in (301,302):
            print('  Location:', r.headers.get('Location'))
    except Exception as e:
        print('GET /profile failed:', e)

    try:
        r = client.post('/change_password', json={'current_password':'x','new_password':'y'})
        print('POST /change_password ->', r.status_code)
        try:
            print('  json:', r.get_json())
        except Exception:
            print('  text:', r.data[:200])
    except Exception as e:
        print('POST /change_password failed:', e)

print('In-process tests completed.')
