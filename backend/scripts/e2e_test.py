import httpx
API='http://127.0.0.1:8000/api/v1'
email='e2e_test@example.com'
password='TestPass123!'
print('Registering user...')
with httpx.Client() as c:
    r=c.post(f'{API}/auth/register', json={'email':email,'password':password,'full_name':'E2E Tester'})
    print('register status:', r.status_code, r.text)
    print('Logging in...')
    r2=c.post(f'{API}/auth/login', data={'username':email,'password':password})
    print('login status:', r2.status_code, r2.text)
    if r2.status_code==200:
        data=r2.json()
        token=data.get('access_token')
        print('access token present?', bool(token))
        headers={'Authorization':f'Bearer {token}'}
        r3=c.get(f'{API}/notes', headers=headers)
        print('notes status', r3.status_code)
        print('notes body', r3.text)
