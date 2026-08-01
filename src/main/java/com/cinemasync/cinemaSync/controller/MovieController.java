package com.cinemasync.cinemaSync.controller;

import com.cinemasync.cinemaSync.dto.MovieResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class MovieController {

    @GetMapping("/movies")
    public ResponseEntity<List<MovieResponse>> getMovies() {
        List<MovieResponse> movies = List.of(
                new MovieResponse("movie-1", "Inception", 8.8, "Sci-Fi"),
                new MovieResponse("movie-2", "The Matrix", 8.7, "Sci-Fi"),
                new MovieResponse("movie-3", "Interstellar", 8.6, "Sci-Fi")
        );
        return ResponseEntity.ok(movies);
    }
}
