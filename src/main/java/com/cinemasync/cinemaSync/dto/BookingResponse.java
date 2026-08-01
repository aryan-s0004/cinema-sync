package com.cinemasync.cinemaSync.dto;

public record BookingResponse(String id, String userId, String movieId, java.util.List<String> seats) {}
