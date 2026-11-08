import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getEncryptionKey() {
  const raw = process.env.GSC_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("GSC_TOKEN_ENCRYPTION_KEY is not configured on the backend.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("GSC_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function validateSearchConsoleEncryptionConfig() {
  getEncryptionKey();
  return true;
}

export function encryptRefreshToken(refreshToken) {
  if (!refreshToken || typeof refreshToken !== "string") {
    throw new Error("A Google refresh token is required.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(refreshToken, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptRefreshToken(encrypted) {
  if (!encrypted?.ciphertext || !encrypted?.iv || !encrypted?.authTag) {
    throw new Error("The stored Google refresh token is missing or invalid.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(encrypted.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
