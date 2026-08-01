package com.cinemasync.cinemaSync.repository;

import com.cinemasync.cinemaSync.domain.User;
import org.springframework.stereotype.Repository;

import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryUserRepository implements UserRepository {

    private final Map<String, User> byEmail = new ConcurrentHashMap<>();

    @Override
    public User findByEmail(String email) {
        if (email == null) {
            return null;
        }
        return byEmail.get(normalizeEmail(email));
    }

    @Override
    public User save(User user) {
        byEmail.put(normalizeEmail(user.email()), user);
        return user;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
