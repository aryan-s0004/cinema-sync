const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");

const DEFAULT_TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "Pass@12345";

const requireMongoUri = () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in backend/.env");
  }
  return process.env.MONGO_URI;
};

const connect = async () => {
  const uri = requireMongoUri();
  await mongoose.connect(uri);
};

const ensureLocalUser = async ({ name, email, password }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    throw new Error(`Invalid email: ${email}`);
  }

  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    user = new User({
      name,
      email: normalizedEmail,
      password,
      authProvider: "local",
      emailVerified: true,
      phoneVerified: false,
      role: "user",
    });
  } else {
    user.name = name;
    user.password = password;
    user.authProvider = "local";
    user.emailVerified = true;
    user.phoneVerified = Boolean(user.phoneVerified);
    user.refreshToken = null;
  }

  await user.save();
  return user;
};

const seedRequestedUsers = async () => {
  const users = [
    { name: "RAHUL JAIN", email: "aryansahu0004@gmail.com", password: DEFAULT_TEST_PASSWORD },
    { name: "JAMES SMITH", email: "aryanhashcoder009@gmail.com", password: DEFAULT_TEST_PASSWORD },
  ];

  for (const item of users) {
    const user = await ensureLocalUser(item);
    console.log(`UPSERTED: ${user.email} (${user.name})`);
  }
};

const deleteUser = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    throw new Error("Usage: node scripts/manageUsers.js delete-user <email>");
  }

  const result = await User.deleteOne({ email: normalizedEmail });
  if (result.deletedCount) {
    console.log(`DELETED: ${normalizedEmail}`);
  } else {
    console.log(`NOT_FOUND: ${normalizedEmail}`);
  }
};

const main = async () => {
  const command = process.argv[2];
  const arg = process.argv[3];

  await connect();

  if (command === "seed-test-users") {
    await seedRequestedUsers();
  } else if (command === "delete-user") {
    await deleteUser(arg);
  } else {
    console.log("Usage:");
    console.log("  node scripts/manageUsers.js seed-test-users");
    console.log("  node scripts/manageUsers.js delete-user <email>");
    process.exitCode = 1;
  }
};

main()
  .catch((error) => {
    console.error("manageUsers failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_err) {
      // ignore disconnect errors
    }
  });

