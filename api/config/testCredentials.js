/**
 * CinemaSync Test Credentials
 * These are for TEST MODE only.
 * Never use real card details here.
 */

const testCredentials = {
  stripe: {
    cards: [
      {
        type: "Success Card",
        number: "4242 4242 4242 4242",
        expiry: "12/28",
        cvv: "424",
        notes: "Generic success card",
      },
      {
        type: "International Card",
        number: "4000 0566 5566 5556",
        expiry: "01/30",
        cvv: "000",
        notes: "Verified international card",
      },
      {
        type: "Declined Card",
        number: "4000 0000 0000 0002",
        expiry: "12/28",
        cvv: "000",
        notes: "Specifically triggers a card_declined error",
      },
      {
        type: "Incorrect CVV",
        number: "4242 4242 4242 4242",
        expiry: "12/28",
        cvv: "111",
        notes: "Use with 111 CVV to trigger incorrect_cvv",
      }
    ],
    upi: {
      success: "success@stripe",
      fail: "fail@stripe",
    }
  },
  admin: {
    email: "admin@cinemasync.com",
    password: "Password123!",
  },
  testUser: {
    email: "user@example.com",
    password: "Password123!",
  }
};

module.exports = testCredentials;
