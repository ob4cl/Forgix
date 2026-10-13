import unittest
from fastapi.testclient import TestClient
from main import app


class AppTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()

    def test_root(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'message': 'Welcome to {{projectName}}!'})

    def test_health(self):
        self.assertEqual(self.client.get('/health').json(), {'status': 'ok'})

    def test_not_found(self):
        self.assertEqual(self.client.get('/missing').status_code, 404)

    def test_openapi(self):
        response = self.client.get('/openapi.json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['info']['title'], '{{projectName}}')
        self.assertIn('/health', response.json()['paths'])


if __name__ == '__main__':
    unittest.main()
