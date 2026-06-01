import { describe, it, expect, afterEach } from "vitest";
import {
  isSingleUserMode,
  getAllowedEmails,
  isEmailAllowed,
  isSignupEnabled,
  getPublicAuthConfig,
} from "@/lib/authConfig";

// The policy reads process.env fresh on every call, so each test can set the
// environment it needs and we restore it afterwards.
const ORIGINAL = {
  SINGLE_USER_MODE: process.env.SINGLE_USER_MODE,
  ALLOWED_EMAIL: process.env.ALLOWED_EMAIL,
};

function setEnv(mode: string | undefined, allowed: string | undefined) {
  if (mode === undefined) delete process.env.SINGLE_USER_MODE;
  else process.env.SINGLE_USER_MODE = mode;
  if (allowed === undefined) delete process.env.ALLOWED_EMAIL;
  else process.env.ALLOWED_EMAIL = allowed;
}

afterEach(() => {
  setEnv(ORIGINAL.SINGLE_USER_MODE, ORIGINAL.ALLOWED_EMAIL);
});

describe("isSingleUserMode", () => {
  it("defaults to false when unset (multi-user)", () => {
    setEnv(undefined, undefined);
    expect(isSingleUserMode()).toBe(false);
  });

  it("is true only for the literal string 'true' (case/space-insensitive)", () => {
    setEnv("true", undefined);
    expect(isSingleUserMode()).toBe(true);
    setEnv(" TRUE ", undefined);
    expect(isSingleUserMode()).toBe(true);
    setEnv("1", undefined);
    expect(isSingleUserMode()).toBe(false);
    setEnv("false", undefined);
    expect(isSingleUserMode()).toBe(false);
    setEnv("yes", undefined);
    expect(isSingleUserMode()).toBe(false);
  });
});

describe("getAllowedEmails", () => {
  it("returns [] when unset", () => {
    setEnv("true", undefined);
    expect(getAllowedEmails()).toEqual([]);
  });

  it("normalizes to lowercase and trims", () => {
    setEnv("true", "  Koushik@Example.COM ");
    expect(getAllowedEmails()).toEqual(["koushik@example.com"]);
  });

  it("supports a comma-separated list, dropping blanks", () => {
    setEnv("true", "a@x.com, B@x.com ,,c@x.com,");
    expect(getAllowedEmails()).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
  });
});

describe("isEmailAllowed", () => {
  it("allows everyone in multi-user mode (restores original behavior)", () => {
    setEnv("false", "");
    expect(isEmailAllowed("anyone@example.com")).toBe(true);
    expect(isEmailAllowed(null)).toBe(true);
    expect(isEmailAllowed(undefined)).toBe(true);
  });

  it("allows only the configured email in single-user mode", () => {
    setEnv("true", "user@example.com");
    expect(isEmailAllowed("user@example.com")).toBe(true);
    expect(isEmailAllowed("attacker@evil.com")).toBe(false);
  });

  it("matches the allowed email case-insensitively", () => {
    setEnv("true", "user@example.com");
    expect(isEmailAllowed("User@Example.com")).toBe(true);
  });

  it("honors a comma-separated allowlist", () => {
    setEnv("true", "a@x.com,b@x.com");
    expect(isEmailAllowed("b@x.com")).toBe(true);
    expect(isEmailAllowed("c@x.com")).toBe(false);
  });

  it("fails CLOSED when single-user mode is on but no email is configured", () => {
    setEnv("true", undefined);
    expect(isEmailAllowed("user@example.com")).toBe(false);
    setEnv("true", "   ");
    expect(isEmailAllowed("user@example.com")).toBe(false);
  });

  it("denies null/empty emails in single-user mode", () => {
    setEnv("true", "user@example.com");
    expect(isEmailAllowed(null)).toBe(false);
    expect(isEmailAllowed(undefined)).toBe(false);
    expect(isEmailAllowed("")).toBe(false);
  });
});

describe("isSignupEnabled", () => {
  it("is enabled in multi-user mode", () => {
    setEnv("false", undefined);
    expect(isSignupEnabled()).toBe(true);
  });

  it("is disabled in single-user mode", () => {
    setEnv("true", "user@example.com");
    expect(isSignupEnabled()).toBe(false);
  });
});

describe("getPublicAuthConfig", () => {
  it("exposes a serializable, client-safe view in single-user mode", () => {
    setEnv("true", "user@example.com");
    expect(getPublicAuthConfig()).toEqual({
      singleUserMode: true,
      signupEnabled: false,
      allowedEmail: "user@example.com",
    });
  });

  it("reports multi-user mode with signup enabled and no email hint", () => {
    setEnv("false", undefined);
    expect(getPublicAuthConfig()).toEqual({
      singleUserMode: false,
      signupEnabled: true,
      allowedEmail: null,
    });
  });

  it("uses the first allowed email as the displayed hint", () => {
    setEnv("true", "first@x.com,second@x.com");
    expect(getPublicAuthConfig().allowedEmail).toBe("first@x.com");
  });
});
