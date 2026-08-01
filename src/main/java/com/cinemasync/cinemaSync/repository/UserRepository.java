package com.cinemasync.cinemaSync.repository;

import com.cinemasync.cinemaSync.domain.User;

public interface UserRepository {
    User findByEmail(String email);
    User save(User user);
}
