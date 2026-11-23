# Social account token encryption

The backend encrypts Instagram and Facebook access tokens (and any social refresh tokens) at rest with AES-256-GCM.

## Required environment variable

Set `SOCIAL_TOKEN_ENCRYPTION_KEY` to a base64-encoded 32-byte random key. Generate one locally from the Backend directory:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Add the generated value to the local `Backend/.env` and to the backend service's production environment (for example, Render). Never commit the key, paste it into source code, or share it in chat. Keep a secure backup: encrypted tokens cannot be recovered if this key is lost or changed.

## Existing database records

After deploying the code with the same key configured, run this once from the Backend directory:

```bash
npm run migrate:social-tokens
```

The migration encrypts existing plaintext social tokens and clears the plaintext fields. The application temporarily supports reading legacy plaintext records during rollout, so existing accounts continue to work until migration is complete.

Do not rotate or replace the key without first implementing and running a dedicated re-encryption migration.
