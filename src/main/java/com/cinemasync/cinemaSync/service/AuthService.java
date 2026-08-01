package com.cinemasync.cinemaSync.service;

import com.cinemasync.cinemaSync.domain.User;
import com.cinemasync.cinemaSync.dto.LoginRequest;
import com.cinemasync.cinemaSync.dto.RegisterRequest;
import com.cinemasync.cinemaSync.dto.UserResponse;
import com.cinemasync.cinemaSync.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.UUID;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    public UserResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.findByEmail(email) != null) {
            throw new ResponseStatusException(CONFLICT, "Email is already registered");
        }

        String hash = passwordEncoder.encode(request.password());
        User user = new User(UUID.randomUUID().toString(), request.name().trim(), email, hash);
        userRepository.save(user);
        return new UserResponse(user.id(), user.email(), user.name());
    }

    public UserResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));

        var user = userRepository.findByEmail(email);
        if (user == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid email or password");
        }
        return new UserResponse(user.id(), user.email(), user.name());
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
