const API_URL = 'http://localhost:8000'; // adjust to your backend URL

/**
 * Register a new user
 * @param {{ username:string, email:string, password:string }} user
 */
export async function signupUser(user) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail || data.message || 'Signup failed';
    throw new Error(msg);
  }
  return data;
}

/**
 * Log in an existing user
 * @param {{ email:string, password:string }} creds
 */
export async function loginUser(creds) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail || data.message || 'Login failed';
    throw new Error(msg);
  }
  return data;
}