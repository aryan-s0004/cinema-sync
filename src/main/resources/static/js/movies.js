const BASE_URL = window.location.origin;

function authHeader() {
  const credentials = sessionStorage.getItem('basicAuth');
  return credentials ? { Authorization: `Basic ${credentials}` } : {};
}

function loadMovies() {
  fetch(`${BASE_URL}/movies`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Unable to load movies');
      }
      return response.json();
    })
    .then((movies) => {
      const container = document.getElementById('movies');
      container.replaceChildren();

      movies.forEach((movie) => {
        const card = document.createElement('article');
        card.className = 'movie-card';

        const title = document.createElement('h3');
        title.textContent = movie.title;

        const meta = document.createElement('p');
        meta.textContent = `${movie.genre} | Rating: ${movie.imdbRating}`;

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Book';
        button.addEventListener('click', () => book(movie.id));

        card.append(title, meta, button);
        container.append(card);
      });
    })
    .catch((error) => alert(error.message));
}

function book(movieId) {
  const userId = sessionStorage.getItem('userId');
  if (!userId) {
    alert('Please log in before booking.');
    window.location = 'login.html';
    return;
  }

  const booking = {
    userId,
    movieId,
    seats: ['A1', 'A2'],
  };

  fetch(`${BASE_URL}/booking/lock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify(booking),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Unable to lock seats');
      }
      return response.json();
    })
    .then((bookingResponse) => {
      alert(`Seat lock created: ${bookingResponse.id}`);
    })
    .catch((error) => alert(error.message));
}

document.addEventListener('DOMContentLoaded', loadMovies);
