# test.ps1
Write-Host "Starting Docker container..."
$containerId = docker run -d -p 3000:3000 snapsite:local

# Wait for the server to be ready
Write-Host "Waiting for server to start..."
Start-Sleep -Seconds 5

Write-Host "Taking screenshots of google.com with all presets..."
try {
    Invoke-WebRequest -Uri "http://localhost:3000/screenshot?url=https://google.com&preset=all" -OutFile "screenshots.zip" -UseBasicParsing
    Write-Host "Screenshots saved as screenshots.zip successfully!"
} catch {
    Write-Host "Failed to take screenshots: $_"
}

Write-Host "Cleaning up container..."
docker stop $containerId
docker rm $containerId
Write-Host "Test complete."
