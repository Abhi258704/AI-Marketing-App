# Cloudinary image uploads

The post editor uses signed browser uploads. The backend authorizes each upload for a business the signed-in user owns, then signs a one-time unique public ID and a restricted image format list. The browser uploads the image directly to Cloudinary; the Cloudinary API secret never leaves the backend.

## Configure the backend

1. Create or sign in to a Cloudinary account.
2. In the Cloudinary Console, open **Dashboard** and copy the cloud name and API credentials.
3. Add these variables to `Backend/.env` (do not commit that file):

```dotenv
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4. Restart the backend server.

Do not prefix these variables with `NEXT_PUBLIC_`, and never add the API secret to the frontend environment.

## Upload behavior

- JPG and PNG images are accepted.
- The frontend enforces an 8 MB per-image limit and a maximum of 10 media URLs per post.
- Each upload gets a fresh server signature. The backend restricts signed uploads to the authenticated user's selected business folder.
- Successful uploads add the Cloudinary `secure_url` to the post's existing `mediaUrls` array.
- Existing public image URL entry remains available as a fallback.
- Removing an image from a post removes its URL from that post; it does not delete the Cloudinary asset. Asset cleanup can be added separately.

The implementation uses Cloudinary's signed Upload API, not an unsigned preset.
