const axios = require("axios");

const BASE_URL = "http://localhost:8080";

async function testAuthentication() {
  console.log("🧪 Testing Authentication System...\n");

  try {
    // Test 1: Register a new user
    console.log("1️⃣ Testing User Registration...");
    const registerData = {
      email: "test@example.com",
      password: "password123",
      firstName: "John",
      lastName: "Doe",
      preferredLanguage: "en",
    };

    const registerResponse = await axios.post(
      `${BASE_URL}/api/auth/register`,
      registerData
    );
    console.log("✅ Registration successful!");
    console.log("User ID:", registerResponse.data.user.id);
    console.log("Token:", registerResponse.data.token.substring(0, 50) + "...");
    console.log("");

    const token = registerResponse.data.token;

    // Test 2: Get user profile
    console.log("2️⃣ Testing Get Profile...");
    const profileResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Profile retrieved successfully!");
    console.log("Full Name:", profileResponse.data.user.fullName);
    console.log("Email:", profileResponse.data.user.email);
    console.log("");

    // Test 3: Update profile
    console.log("3️⃣ Testing Profile Update...");
    const updateData = {
      firstName: "Johnny",
      preferredLanguage: "es",
    };
    const updateResponse = await axios.put(
      `${BASE_URL}/api/auth/profile`,
      updateData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Profile updated successfully!");
    console.log(
      "New Name:",
      updateResponse.data.user.firstName +
        " " +
        updateResponse.data.user.lastName
    );
    console.log("New Language:", updateResponse.data.user.preferredLanguage);
    console.log("");

    // Test 4: Test login with existing user
    console.log("4️⃣ Testing Login...");
    const loginData = {
      email: "test@example.com",
      password: "password123",
    };
    const loginResponse = await axios.post(
      `${BASE_URL}/api/auth/login`,
      loginData
    );
    console.log("✅ Login successful!");
    console.log(
      "New Token:",
      loginResponse.data.token.substring(0, 50) + "..."
    );
    console.log("");

    // Test 5: Test token refresh
    console.log("5️⃣ Testing Token Refresh...");
    const refreshResponse = await axios.post(
      `${BASE_URL}/api/auth/refresh`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Token refresh successful!");
    console.log(
      "Refreshed Token:",
      refreshResponse.data.token.substring(0, 50) + "..."
    );
    console.log("");

    console.log("🎉 All authentication tests passed!");
  } catch (error) {
    console.error("❌ Authentication test failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Error:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

// Run the test
testAuthentication();





