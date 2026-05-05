# test.ps1
Write-Host "Starting Docker container..."
$containerId = docker run -d -p 3000:3000 snapsite:local

# Wait for the server to be ready
Write-Host "Waiting for server to start..."
Start-Sleep -Seconds 5

Write-Host "Taking screenshot of google.com..."
try {
    Invoke-WebRequest -Uri "http://localhost:3000/screenshot?url=https://google.com" -OutFile "google.png" -UseBasicParsing
    Write-Host "Screenshot saved as google.png successfully!"
} catch {
    Write-Host "Failed to take screenshot: $_"
}

Write-Host "Cleaning up container..."
docker stop $containerId
docker rm $containerId
Write-Host "Test complete."
