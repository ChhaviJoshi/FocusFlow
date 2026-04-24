const REQUIRED_ENV_DEFAULTS: Record<string, string> = {
  GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  GOOGLE_CALLBACK_URL: "http://localhost:3001/auth/google/callback",
  GEMINI_API_KEY: "test-gemini-key",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/focusflow",
  SESSION_SECRET: "test-session-secret",
  FRONTEND_URL: "http://localhost:3000",
  ENCRYPTION_KEY:
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
};

function setRequiredEnv(overrides: Record<string, string> = {}) {
  const merged = { ...REQUIRED_ENV_DEFAULTS, ...overrides };
  Object.entries(merged).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

describe("crypto.service", () => {
  beforeEach(() => {
    jest.resetModules();
    setRequiredEnv();
  });

  it("encrypt(text) returns a different string from input", async () => {
    const { encrypt } = await import("./crypto.service");
    const plaintext = "sensitive-value";
    const encrypted = encrypt(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(":");
  });

  it("decrypt(encrypt(text)) returns original text", async () => {
    const { encrypt, decrypt } = await import("./crypto.service");
    const plaintext = "roundtrip-value";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it("decrypting with wrong key throws an error", async () => {
    const { encrypt } = await import("./crypto.service");
    const encrypted = encrypt("cannot-decrypt-with-other-key");

    jest.resetModules();
    setRequiredEnv({
      ENCRYPTION_KEY:
        "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    });

    const { decrypt } = await import("./crypto.service");
    expect(() => decrypt(encrypted)).toThrow();
  });

  it("empty string encrypts and decrypts correctly", async () => {
    const { encrypt, decrypt } = await import("./crypto.service");
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe("");
  });
});
