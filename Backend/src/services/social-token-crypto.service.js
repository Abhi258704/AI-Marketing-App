import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getEncryptionKey() {
  const raw = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY is not configured.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function validateSocialTokenEncryptionConfig() {
  getEncryptionKey();
  return true;
}

export function encryptSocialToken(token) {
  if (!token || typeof token !== "string") throw new Error("A valid social access token is required.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSocialToken(encrypted) {
  if (!encrypted?.ciphertext || !encrypted?.iv || !encrypted?.authTag) {
    throw new Error("Stored social token is missing or invalid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(encrypted.iv, "base64"));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function getSocialAccountToken(account, field = "accessToken") {
  const encrypted = account?.[field + "Encrypted"];
  if (encrypted?.ciphertext) return decryptSocialToken(encrypted);
  return account?.[field] || null;
}

export function setSocialAccountToken(account, field, token) {
  account[field + "Encrypted"] = token ? encryptSocialToken(token) : null;
  account[field] = null;
}
