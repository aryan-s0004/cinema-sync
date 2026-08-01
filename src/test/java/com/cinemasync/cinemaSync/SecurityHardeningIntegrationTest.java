package com.cinemasync.cinemaSync;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityHardeningIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void registerAndLoginShouldCreateUserSession() throws Exception {
        String registerPayload = "{\"name\":\"Alice\",\"email\":\"ALICE@example.com\",\"password\":\"StrongPassword123!\"}";

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.email").value("alice@example.com"));

        String loginPayload = "{\"email\":\"ALICE@example.com\",\"password\":\"StrongPassword123!\"}";

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.email").value("alice@example.com"));
    }

    @Test
    void registerShouldRejectDuplicateEmail() throws Exception {
        String payload = "{\"name\":\"Bob\",\"email\":\"bob@example.com\",\"password\":\"StrongPassword123!\"}";

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email is already registered"));
    }

    @Test
    void registerShouldValidateRequiredEmail() throws Exception {
        String payload = "{\"name\":\"Missing Email\",\"email\":\"\",\"password\":\"StrongPassword123!\"}";

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    @Test
    void bookingEndpointShouldRejectUnauthenticatedRequest() throws Exception {
        String bookingPayload = "{\"userId\":\"unknown-user\",\"movieId\":\"movie-1\",\"seats\":[\"A1\",\"A2\"]}";

        mockMvc.perform(post("/booking/lock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingPayload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void bookingEndpointShouldUseAuthenticatedUserIdentity() throws Exception {
        String registerPayload = "{\"name\":\"Carol\",\"email\":\"carol@example.com\",\"password\":\"StrongPassword123!\"}";
        String bookingPayload = "{\"userId\":\"spoofed-user\",\"movieId\":\"movie-1\",\"seats\":[\"A1\",\"A2\"]}";

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerPayload))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/booking/lock")
                        .with(httpBasic("carol@example.com", "StrongPassword123!"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("carol@example.com"))
                .andExpect(jsonPath("$.movieId").value("movie-1"));
    }

    @Test
    void bookingEndpointShouldRejectEmptySeatSelection() throws Exception {
        String registerPayload = "{\"name\":\"Dana\",\"email\":\"dana@example.com\",\"password\":\"StrongPassword123!\"}";
        String bookingPayload = "{\"userId\":\"dana\",\"movieId\":\"movie-1\",\"seats\":[]}";

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerPayload))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/booking/lock")
                        .with(httpBasic("dana@example.com", "StrongPassword123!"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    @Test
    void moviesEndpointShouldBePublicAndReturnMovieCatalog() throws Exception {
        mockMvc.perform(get("/movies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").exists());
    }

    @Test
    void staticPagesShouldBePublic() throws Exception {
        mockMvc.perform(get("/login.html"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/movies.html"))
                .andExpect(status().isOk());
    }
}
