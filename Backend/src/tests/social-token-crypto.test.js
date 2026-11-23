import test from "node:test";
import assert from "node:assert/strict";
import {
  decryptSocialToken,
  encryptSocialToken,
  getSocialAccountToken,
  setSocialAccountToken,
} from "../services/social-token-crypto.service.js";

const originalKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;

test("social tokens encrypt and decrypt with AES-256-GCM", () => {
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  const token = "test-social-access-token";
  const encrypted = encryptSocialToken(token);

  assert.notEqual(encrypted.ciphertext, Buffer.from(token).toString("base64"));
  assert.equal(decryptSocialToken(encrypted), token);
});

test("social token helper supports encrypted documents and legacy plaintext", () => {
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString("base64");
  const account = { accessToken: "legacy-token", accessTokenEncrypted: null };
  assert.equal(getSocialAccountToken(account), "legacy-token");

  setSocialAccountToken(account, "accessToken", "new-token");
  assert.equal(account.accessToken, null);
  assert.equal(getSocialAccountToken(account), "new-token");
});

test("tampered social token ciphertext is rejected", () => {
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
  const encrypted = encryptSocialToken("sensitive");
  encrypted.ciphertext = Buffer.from("tampered").toString("base64");
  assert.throws(() => decryptSocialToken(encrypted));
});

test.after(() => {
  if (originalKey === undefined) delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  else process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = originalKey;
});
