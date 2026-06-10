import requests

BASE_URL = "https://jsonplaceholder.typicode.com"

def test_get_post_valid():
    response = requests.get(f"{BASE_URL}/posts/1")
    assert response.status_code == 200

def test_get_invalid_endpoint():
    response = requests.get(f"{BASE_URL}/invalid")
    assert response.status_code == 404

def test_get_users():
    response = requests.get(f"{BASE_URL}/users")
    assert response.status_code == 200

def test_get_comments():
    response = requests.get(f"{BASE_URL}/comments")
    assert response.status_code == 200

def test_create_post():
    payload = {
        "title": "SQA Test",
        "body": "API Testing",
        "userId": 1
    }
    response = requests.post(f"{BASE_URL}/posts", json=payload)
    assert response.status_code == 201