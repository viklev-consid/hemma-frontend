import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/auth/session", () => {
    return HttpResponse.json(null, { status: 401 });
  }),

  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.email === "test@example.com" && body.password === "password123") {
      return HttpResponse.json({
        status: "Authenticated",
        user: {
          id: "test-user-id",
          email: "test@example.com",
          role: "User",
        },
      });
    }

    if (body.email === "2fa@example.com" && body.password === "password123") {
      return HttpResponse.json({
        status: "TwoFactorRequired",
        challengeToken: "test-challenge-token",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    }

    return HttpResponse.json(
      {
        type: "https://tools.ietf.household/html/rfc9110#section-15.5.2",
        title: "Invalid credentials",
        status: 401,
        detail: "The email or password is incorrect.",
      },
      { status: 401 },
    );
  }),

  http.post("/api/auth/login/two-factor", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    if (
      body.challengeToken === "test-challenge-token" &&
      body.code === "123456"
    ) {
      return HttpResponse.json({
        status: "Authenticated",
        user: {
          id: "test-user-id",
          email: "2fa@example.com",
          role: "User",
        },
      });
    }

    return HttpResponse.json(
      {
        type: "https://tools.ietf.household/html/rfc9110#section-15.5.2",
        title: "Invalid code",
        status: 401,
        detail: "That verification code did not match.",
      },
      { status: 401 },
    );
  }),

  http.get("/api/proxy/v1/users/me", () => {
    return HttpResponse.json({
      id: "test-user-id",
      email: "test@example.com",
      displayName: "Test User",
      role: "User",
      permissions: [],
      onboardingCompleted: true,
    });
  }),

  http.get("/api/proxy/v1/me/notifications/unread-count", () => {
    return HttpResponse.json({ count: 0 });
  }),
];
