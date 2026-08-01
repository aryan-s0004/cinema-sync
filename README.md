# CinemaSync

CinemaSync is a Spring Boot 4 movie-booking prototype with a static HTML/CSS/JavaScript frontend.

## Current Capabilities

- Register users with BCrypt-hashed passwords.
- Log in with email and password.
- Browse a public movie catalog.
- Lock sample seats through an authenticated booking endpoint.
- Validate API inputs and return structured JSON errors.

## Run Locally

```bash
cmd /c mvnw.cmd spring-boot:run
```

Open `http://localhost:8080`.

## Test

```bash
cmd /c mvnw.cmd test -DskipTests=false
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `SERVER_PORT` | `8080` | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/cinemasync_db` | MongoDB connection string |
| `MONGODB_DATABASE` | `cinemasync_db` | MongoDB database name |
| `APP_LOG_LEVEL` | `INFO` | Application package log level |

## Notes

The current repository implementation is in-memory. MongoDB dependencies and configuration are present, but persistence repositories still need to be implemented before production use.
