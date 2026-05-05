# Snapsite Microservice

Snapsite is a lightweight Node.js microservice designed to capture website screenshots using Puppeteer and Headless Chromium. It automatically attempts to close common pop-ups (cookie banners, GDPR notices) before taking a clean screenshot. It can return single images or generate a whole ZIP archive containing screenshots for multiple predefined device resolutions.

## Features

- **High-performance Headless Chromium** (based on `ghcr.io/puppeteer/puppeteer` docker image).
- **Auto Popup Closer**: Injects a heuristic script to click "Accept" buttons and hide obtrusive cookie banners/overlays.
- **Multi-resolution Presets**: Generate screenshots for 4K, Desktop, Tablets, and Phones with a single API call.
- **Zero-config Docker setup**: Easy to run and deploy anywhere.

## How to use the API

Run the container and expose port `3000`. Make HTTP GET requests to the `/screenshot` endpoint.

### 1. Single Screenshot (Custom Dimensions)
By default, the API will return a direct `image/png` response.

```bash
curl "http://localhost:3000/screenshot?url=https://google.com" > snapshot.png
```

You can optionally pass `width` and `height` parameters:
```bash
curl "http://localhost:3000/screenshot?url=https://google.com&width=1920&height=1080" > fhd.png
```

### 2. Multi-resolution ZIP Archive
You can request multiple specific device formats at once using the `preset` parameter.
When you use a preset, the API will return an `application/zip` file containing all requested screenshots.

To generate **ALL** available dimensions:
```bash
curl -o screenshots.zip "http://localhost:3000/screenshot?url=https://google.com&preset=all"
```

To request **specific** presets (comma-separated):
```bash
curl -o specific.zip "http://localhost:3000/screenshot?url=https://google.com&preset=4k,tablet_portrait,phone_small_landscape"
```

#### Available Presets:
- `4k`: 3840x2160
- `2k`: 2560x1440
- `fhd`: 1920x1080
- `hd`: 1280x720
- `1024`: 1024x768
- `tablet_portrait`: 768x1024
- `tablet_landscape`: 1024x768
- `phone_large_portrait`: 414x896
- `phone_large_landscape`: 896x414
- `phone_small_portrait`: 375x667
- `phone_small_landscape`: 667x375

---

## How to run locally (via Docker)

You don't need Node.js installed locally. You only need Docker.

**1. Build the image**
```bash
docker build -t snapsite:local .
```

**2. Run the container**
```bash
docker run -d -p 3000:3000 --name snapsite snapsite:local
```

The service is now running on `http://localhost:3000`. You can test it by opening your browser to `http://localhost:3000/health`.

---

## How to run locally (Native Node.js)

If you prefer to run it natively without Docker:

**1. Install dependencies**
```bash
npm install
```

**2. Start the server**
```bash
npm start
```
*Note: Make sure you have Chromium/Chrome installed on your system, as Puppeteer will try to use it.*

---

## CI/CD (GitHub Actions)

This repository is pre-configured to automatically build and push the Docker image to Docker Hub whenever you push to the `main` branch.

To enable this:
1. Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**
2. Add the following repository secrets:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username.
   - `DOCKERHUB_TOKEN`: Your Docker Hub Access Token (or password).

Once configured, the Action will push the image as `yourusername/snapsite:latest`. You can then deploy it to any VPS using:
```bash
docker run -d -p 3000:3000 yourusername/snapsite:latest
```
