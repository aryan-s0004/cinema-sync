package com.cinemasync.cinemaSync.controller;

import com.cinemasync.cinemaSync.dto.BookingRequest;
import com.cinemasync.cinemaSync.dto.BookingResponse;
import com.cinemasync.cinemaSync.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping("/booking/lock")
    public ResponseEntity<BookingResponse> lockBooking(@Valid @RequestBody BookingRequest request,
                                                       @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(bookingService.lock(request, userDetails.getUsername()));
    }
}
