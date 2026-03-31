# CinemaSync Installation & Setup Guide 🎬

Follow these steps to run the complete CinemaSync platform locally with the premium Stripe integration and our high-trust UX overhaul.

---

## 🏗 Prerequisites
1.  **Node.js**: v18.x or higher
2.  **MongoDB**: Local instance running at `mongodb://localhost:27017`
3.  **Stripe Account**: Created for testing (keys already provided in .env)

---

## 🛠 Step 1: Backend Setup
Open a terminal in the `/backend` directory.

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Database Seeding (IMPORTANT)**:
    Initialize the database with movies, shows, and seats:
    ```bash
    npm run seed
    ```
3.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    *Server will start on: http://localhost:5000*

---

## 🎨 Step 2: Frontend Setup
Open a NEW terminal in the `/frontend` directory.

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    *Frontend will be live at: http://localhost:5173*

---

## 🧪 Step 3: Testing the Flow
1.  **Register/Login**: Use the redesigned split-screen auth pages.
2.  **Pick a Movie**: Select the "CinemaSync Launch Night" movie.
3.  **Choose Seats**: Select your preferred seats on the interactive map.
4.  **Premium Payment**: 
    - Enter any valid email.
    - Use Stripe test card: `4242 4242 4242 4242` with any future expiry and `123` CVV.
5.  **Get Ticket**: Download your PDF ticket from the 3D-styled success page!

---

## 🔧 Frequently Asked Questions

**Q: Where are the API keys?**
A: They are pre-configured in `backend/.env` and `frontend/.env`. You don't need to change anything for the test mode.

**Q: Database connection fails?**
A: Ensure your local MongoDB is running. If your URI is different, update `MONGO_URI` in `backend/.env`.

**Q: Webhooks not working?**
A: Locally, Stripe webhooks require the Stripe CLI. However, the system is designed to "Auto-Fix" transaction statuses upon redirection to the success page even if webhooks are delayed.

---

### ✅ What's Fixed & Finalized:
- **Redundant Code**: Removed old mock OTP logic for payments (replaced by 3D Secure/Stripe).
- **Authentication**: Refined the 3-step Password Reset flow (Forgot → Verify OTP → Reset).
- **UX**: Premium brand panels introduced in Login/Register.
- **Integration**: Full end-to-end connectivity between Booking, Payment, and Ticket generation.

**Enjoy your CinemaSync Premium Experience!**
