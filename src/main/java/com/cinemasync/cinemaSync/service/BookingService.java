package com.cinemasync.cinemaSync.service;

import com.cinemasync.cinemaSync.dto.BookingRequest;
import com.cinemasync.cinemaSync.dto.BookingResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class BookingService {

    public BookingResponse lock(BookingRequest request, String authenticatedEmail) {
        return new BookingResponse(
                UUID.randomUUID().toString(),
                authenticatedEmail,
                request.movieId(),
                List.copyOf(request.seats())
        );
    }
}
