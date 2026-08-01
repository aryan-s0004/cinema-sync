package com.cinemasync.cinemaSync.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record BookingRequest(
        @NotBlank String userId,
        @NotBlank String movieId,
        @NotEmpty List<@NotBlank String> seats
) {}
