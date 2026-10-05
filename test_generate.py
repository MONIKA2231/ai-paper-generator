import urllib.request, json
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login', data=b'{"email":"faculty@apollouniversity.edu.in","password":"Faculty@123"}', headers={'Content-Type': 'application/json'}, method='POST')
token = json.loads(urllib.request.urlopen(req).read())['access_token']
req2 = urllib.request.Request('http://127.0.0.1:8000/api/papers/generate', data=b'{"subject_id":1,"total_questions":2,"total_marks":10,"generation_mode":"ai"}', headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}, method='POST')
print(urllib.request.urlopen(req2).read().decode())
