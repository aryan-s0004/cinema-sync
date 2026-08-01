const BASE_URL = window.location.origin;

function parseJsonResponse(response) {
  return response.json().then((body) => {
    if (!response.ok) {
      throw new Error(body.message || 'Request failed');
    }
    return body;
  });
}

function register() {
  const user = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
  };

  fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  })
    .then(parseJsonResponse)
    .then(() => {
      alert('Registered successfully');
      window.location = 'login.html';
    })
    .catch((error) => alert(error.message));
}

function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const credentials = btoa(`${email}:${password}`);

  fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
    .then(parseJsonResponse)
    .then((user) => {
      sessionStorage.setItem('userId', user.id);
      sessionStorage.setItem('basicAuth', credentials);
      alert('Login successful');
      window.location = 'movies.html';
    })
    .catch((error) => alert(error.message));
}
