from locust import HttpUser, task, between
import random
import string

class VirtCloudUser(HttpUser):
    wait_time = between(1, 3)  # Simulate realistic wait times between requests
    credentials = []  # Store credentials created during signup
    token = None  # Store the authentication token

    @task(1)
    def signup(self):
        """Simulate user signup"""
        email = f"user{random.randint(1, 10000)}@example.com"
        username = ''.join(random.choices(string.ascii_lowercase, k=8))
        password = "securepassword"
        response = self.client.post(
            "/auth/signup",
            json={"email": email, "username": username, "password": password}
        )
        if response.status_code == 201:
            # Store the credentials for login
            self.credentials.append({"email": email, "password": password})

    @task(1)
    def login(self):
        """Simulate user login"""
        if self.credentials:
            # Use the most recently created credentials
            creds = random.choice(self.credentials)
            response = self.client.post(
                "/auth/login",
                json={"email": creds["email"], "password": creds["password"]}
            )
            if response.status_code == 200:
                self.token = response.json().get("access_token")

    @task(1)
    def load_homepage(self):
        """Simulate loading the homepage"""
        self.client.get("/")
