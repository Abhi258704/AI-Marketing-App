"use client";

import { GoogleLogin } from "@react-oauth/google";

export default function Home() {
  const handleSuccess = async (credentialResponse) => {
    console.log("Google credential received");

    try {
      const response = await fetch(
        "http://localhost:8000/api/auth/google",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            credential: credentialResponse.credential,
          }),
        }
      );

      const data = await response.json();

      console.log("Backend response:", data);

      if (!response.ok) {
        console.error("Login failed:", data);
        return;
      }

      localStorage.setItem("token", data.token);

      console.log("Login successful!");
    } catch (error) {
      console.error("Request failed:", error);
    }
  };

  return (
    <main>
      <h1>AI Marketing Platform</h1>

      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => {
          console.log("Google Login Failed");
        }}
      />
    </main>
  );
}