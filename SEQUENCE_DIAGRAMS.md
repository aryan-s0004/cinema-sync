# CinemaSync Sequence Diagrams

> Security context (2026-07-29): the diagrams below document the current functional flow and the intended future hardening boundary where protected actions require authenticated sessions and server-side authorization.

## 1. User Registration Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser as Browser UI
    participant AuthController as AuthController
    participant AuthService as AuthService
    participant UserRepo as UserRepository
    participant MongoDB as MongoDB

    User->>Browser: Fill registration form
    Browser->>AuthController: POST /auth/register
    AuthController->>AuthService: register(user)
    AuthService->>UserRepo: save(user)
    UserRepo->>MongoDB: Insert user document
    MongoDB-->>UserRepo: Persisted document
    UserRepo-->>AuthService: Saved user
    AuthService-->>AuthController: Return user
    AuthController-->>Browser: JSON response
    Browser-->>User: Show success and redirect to login
```

## 2. User Login Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser as Browser UI
    participant AuthController as AuthController
    participant AuthService as AuthService
    participant UserRepo as UserRepository
    participant MongoDB as MongoDB

    User->>Browser: Enter email and password
    Browser->>AuthController: POST /auth/login
    AuthController->>AuthService: login(email, password)
    AuthService->>UserRepo: findByEmail(email)
    UserRepo->>MongoDB: Query user by email
    MongoDB-->>UserRepo: Matching user document
    UserRepo-->>AuthService: Return user
    AuthService-->>AuthController: Return authenticated user
    AuthController-->>Browser: JSON response
    Browser->>Browser: Store userId in localStorage
    Browser-->>User: Redirect to movies page
```

## 3. Movie Listing Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser as Browser UI
    participant MovieController as MovieController
    participant MovieService as MovieService
    participant MovieRepo as MovieRepository
    participant MongoDB as MongoDB

    User->>Browser: Open movies page
    Browser->>MovieController: GET /movies
    MovieController->>MovieService: getAll()
    MovieService->>MovieRepo: findAll()
    MovieRepo->>MongoDB: Read movie documents
    MongoDB-->>MovieRepo: Return movie list
    MovieRepo-->>MovieService: Return movies
    MovieService-->>MovieController: Return sorted movie list
    MovieController-->>Browser: JSON response
    Browser-->>User: Render movie cards
```

## 4. Seat Locking Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser as Browser UI
    participant BookingController as BookingController
    participant BookingService as BookingService
    participant BookingRepo as BookingRepository
    participant MongoDB as MongoDB

    User->>Browser: Click Book on a movie
    Browser->>BookingController: POST /booking/lock
    BookingController->>BookingService: lock(request)
    BookingService->>BookingRepo: save(booking)
    BookingRepo->>MongoDB: Insert booking document
    MongoDB-->>BookingRepo: Persist booking
    BookingRepo-->>BookingService: Return booking
    BookingService-->>BookingController: Return booking
    BookingController-->>Browser: JSON response with booking ID
    Browser-->>User: Show locked seat confirmation
```

## 5. Booking Confirmation Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser as Browser UI
    participant BookingController as BookingController
    participant BookingService as BookingService
    participant BookingRepo as BookingRepository
    participant MongoDB as MongoDB

    User->>Browser: Confirm booking
    Browser->>BookingController: POST /booking/confirm/{id}
    BookingController->>BookingService: confirm(id)
    BookingService->>BookingRepo: findById(id)
    BookingRepo->>MongoDB: Retrieve booking by id
    MongoDB-->>BookingRepo: Return booking
    BookingRepo-->>BookingService: Booking document
    BookingService->>BookingRepo: save(updatedBooking)
    BookingRepo->>MongoDB: Update booking status
    MongoDB-->>BookingRepo: Confirmation persisted
    BookingRepo-->>BookingService: Updated booking
    BookingService-->>BookingController: Return booking
    BookingController-->>Browser: JSON response
    Browser-->>User: Show confirmation result
```
