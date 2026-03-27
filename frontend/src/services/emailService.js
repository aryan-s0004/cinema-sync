export const emailService = {
  openSupportEmail: ({ to = "support@cinemasync.com", subject = "CinemaSync support", body = "" } = {}) => {
    const params = new URLSearchParams({ subject, body });
    window.location.href = `mailto:${to}?${params.toString()}`;
  }
};

export default emailService;
