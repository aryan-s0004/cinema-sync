package com.cinemasync.cinemaSync.domain;

public record User(String id, String name, String email, String passwordHash) {}
