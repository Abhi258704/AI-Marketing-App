# Cloudinary image storage

The post editor uses a two-stage image flow:

1. When an image is selected, the authenticated backend saves it temporarily under `Backend/public/temp/<userId>/<businessId>/`. No Cloudinary request is made at selection time.
2. When the post is scheduled or published, the backend transfers each staged JPG/PNG to Cloudinary, replaces its temporary reference in the post with the permanent `secure_url`, and removes the local temporary file.

## Configure Cloudinary

Add these values to `Backend/.env`:

```dotenv
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

The API secret is used only by the backend. Do not add it to frontend environment variables or commit `.env`.

## Limits and behavior

- JPG and PNG only.
- 8 MB maximum per image.
- Up to 10 images per post.
- Saving a draft keeps its staged files in temporary storage and does not contact Cloudinary.
- Scheduling or publishing promotes staged files to Cloudinary first.
- Promoted temporary files are removed from `Backend/public/temp`.
- Removing an image from a saved draft also removes its staged file.
- Instagram currently publishes only the first image. Facebook publishing remains text-only.

## Deployment storage note

The backend's `public/temp` directory is temporary staging. Render's default filesystem is ephemeral, so staged files can be lost on restart, deploy, or instance spin-down. To retain staged media between deployments, attach a Render persistent disk mounted at the backend's `public/temp` directory. Without one, schedule or publish drafts before the backend restarts or redeploys.
