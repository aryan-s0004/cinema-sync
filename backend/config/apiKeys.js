const trim = (value) => String(value || "").trim();

const apiKeys = Object.freeze({
  movieApiKey: trim(process.env.MOVIE_API_KEY || process.env.WATCHMODE_API_KEY || process.env.TMDB_API_KEY),
  stripeSecretKey: trim(process.env.STRIPE_SECRET_KEY),
  stripePublishableKey: trim(process.env.STRIPE_PUBLISHABLE_KEY),
  stripeWebhookSecret: trim(process.env.STRIPE_WEBHOOK_SECRET),
  paymentWebhookSecret: trim(process.env.PAYMENT_WEBHOOK_SECRET),
  adminNotificationEmail: trim(process.env.ADMIN_NOTIFICATION_EMAIL),
});

const hasMovieApiKey = () => Boolean(apiKeys.movieApiKey);
const hasStripeSecrets = () => Boolean(apiKeys.stripeSecretKey && apiKeys.stripePublishableKey);

module.exports = {
  apiKeys,
  hasMovieApiKey,
  hasStripeSecrets,
};
