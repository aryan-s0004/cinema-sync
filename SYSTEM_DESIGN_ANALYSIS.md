# CinemaSync System Design Analysis

## 1. Project Summary

CinemaSync is a lightweight movie-booking web application built as a Spring Boot + MongoDB service with a vanilla JavaScript frontend. The current implementation supports the core user journey:

> Security note (2026-07-29): the design documentation has been expanded to include a formal architecture view, sequence diagrams, deployment guidance, and a security assessment. The current application should be treated as an MVP with significant authentication and authorization gaps until the documented remediation steps are implemented.

1. Register a user
2. Log in
3. Browse movies
4. Lock seats for a booking
5. Confirm the booking

The architecture is intentionally simple and layered, with clear separation between controllers, services, repositories, and static web assets.

---

## 2. High-Level Architecture

### Runtime View

Client browser -> Spring Boot REST API -> Spring Data MongoDB -> MongoDB database

### Main Layers

- Presentation layer
  - Static HTML pages served by Spring Boot
  - JavaScript files that call REST endpoints

- Application layer
  - Controllers for authentication, movies, booking, and payment
  - Services implementing business rules

- Data layer
  - MongoDB repositories for users, movies, and bookings

- Infrastructure layer
  - Spring Boot runtime
  - Embedded/static resources served from the app
  - Local MongoDB instance

---

## 3. Technology Stack

### Backend
- Java 21
- Spring Boot 4.0.4
- Spring Web
- Spring Data MongoDB
- Lombok
- Maven Wrapper

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API

### Database
- MongoDB
- Connection target: mongodb://localhost:27017/cinemasync_db

---

## 4. Project Structure

```text
cinemaSync/
├── pom.xml
├── mvnw / mvnw.cmd
├── src/
│   ├── main/
│   │   ├── resources/
│   │   │   ├── application.properties
│   │   │   ├── static/
│   │   │   │   ├── css/
│   │   │   │   ├── js/
│   │   │   │   ├── login.html
│   │   │   │   ├── movies.html
│   │   │   │   ├── register.html
│   │   │   │   └── index.html
│   │   │   └── templates/
│   └── test/
├── frontend/
├── k6_load_test.js
└── README.md
```

---

## 5. End-to-End System Flow

### A. User Registration

1. User opens the registration page.
2. The browser JavaScript sends a POST request to `/auth/register`.
3. The request body contains the user name, email, and password.
4. The backend controller forwards the request to the authentication service.
5. The service saves the new user through the user repository.
6. The response returns the created user object.

### B. User Login

1. The user submits credentials on the login page.
2. The frontend sends a POST request to `/auth/login`.
3. The backend validates the credentials against the database.
4. On success, the backend returns the user object.
5. The frontend stores the returned user ID in localStorage.
6. The user is redirected to the movies page.

### C. Movie Browsing

1. The movies page loads and calls `/movies`.
2. The backend retrieves all movies from MongoDB.
3. The service sorts them by IMDb rating in descending order.
4. The API response is rendered into the browser as movie cards.

### D. Seat Locking

1. The user clicks Book on a movie.
2. The frontend creates a booking payload containing:
   - userId
   - movieId
   - seats (currently hard-coded as A1 and A2)
3. The browser POSTs this payload to `/booking/lock`.
4. The booking service creates a booking with a locked state.
5. A booking ID is returned to the client.

### E. Booking Confirmation

1. The client calls `/booking/confirm/{id}`.
2. The backend fetches the booking by ID.
3. The booking state is updated from locked to confirmed.
4. The confirmed booking is saved back to MongoDB.

### F. Payment Flow

The application also includes payment endpoints for future or stubbed processing:

- `/payment/pay/{id}`
- `/payment/refund/{id}`

These are not fully implemented as a real gateway integration yet.

---

## 6. Core Components

### Controllers

The application is organized around these controllers:

- AuthController
  - Handles registration and login

- MovieController
  - Handles fetching and adding movies

- BookingController
  - Handles booking lock and booking confirmation

- PaymentController
  - Handles payment-related operations

### Services

Each controller is backed by a service layer:

- AuthService
  - Handles authentication business logic

- MovieService
  - Handles movie retrieval and creation

- BookingService
  - Handles seat locking and confirmation workflow

- PaymentService
  - Placeholder for payment logic

### Repositories

Spring Data repositories provide CRUD access to MongoDB collections:

- UserRepository
- MovieRepository
- BookingRepository

---

## 7. Data Model

### User
Represents a registered customer.

Fields include:
- id
- name
- email
- password

### Movie
Represents a movie that can be browsed and booked.

Fields include:
- id
- title
- imdbRating
- genre

### Booking
Represents a booking attempt or reservation.

Fields include:
- id
- userId
- movieId
- seats
- status
- lockTime

### DTOs
- LoginRequest
- BookingRequest

---

## 8. API Surface

### Authentication
- POST /auth/register
- POST /auth/login

### Movies
- GET /movies
- POST /movies

### Booking
- POST /booking/lock
- POST /booking/confirm/{id}

### Payment
- POST /payment/pay/{id}
- POST /payment/refund/{id}

---

## 9. Request Lifecycle Example

### Example: Login

Request from browser:

```json
{
  "email": "alice@example.com",
  "password": "pass123"
}
```

Flow:

```text
Browser -> AuthController.login() -> AuthService.login() -> UserRepository -> MongoDB
```

### Example: Lock Seats

Request from browser:

```json
{
  "userId": "123",
  "movieId": "456",
  "seats": ["A1", "A2"]
}
```

Flow:

```text
Browser -> BookingController.lock() -> BookingService.lock() -> BookingRepository -> MongoDB
```

---

## 10. Current Design Strengths

- Clear layered structure
- Simple and easy to understand
- Fast development cycle for a prototype or MVP
- Good separation of concerns between UI and API
- MongoDB fits the document-oriented nature of the app well

---

## 11. Current Risks and Gaps

### Security
- Passwords appear to be handled as plain values rather than securely hashed
- No JWT or stateless session mechanism is currently visible
- No role-based access control for admin operations

### Concurrency and Booking Safety
- Seat locking does not yet appear to prevent double-booking in a strongly atomic way
- No explicit expiry policy for locked seats

### Scalability
- The movie listing operation fetches and sorts all movies in memory
- The current design is suitable for a prototype but would need pagination and indexing for larger traffic

### Reliability
- No formal unit or integration test suite is evident in the current workspace snapshot
- No containerization or CI/CD pipeline is configured yet

---

## 12. Recommended Evolution Path

### Short Term
- Add password hashing
- Add JWT-based authentication
- Add validation for request bodies
- Add tests for controllers and services

### Medium Term
- Add seat conflict detection
- Add booking lock expiry
- Add pagination for movies
- Introduce proper error handling and HTTP status codes

### Long Term
- Add real payment gateway integration
- Add admin roles and protected management APIs
- Introduce show/screening and seat inventory modeling
- Deploy with Docker and a managed MongoDB instance

---

## 13. Final Assessment

CinemaSync is a solid educational and prototype-grade full-stack application. Its core flow is understandable and well-aligned with a typical booking platform MVP. The main opportunity is to evolve it from a simple demo into a production-ready system by strengthening security, concurrency handling, and operational robustness.
