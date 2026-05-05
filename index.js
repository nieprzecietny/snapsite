const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

app.get('/screenshot', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required. Example: ?url=https://example.com' });
    }

    // Basic URL validation
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
    }

    try {
        new URL(targetUrl);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid URL provided' });
    }

    const width = parseInt(req.query.width) || 1280;
    const height = parseInt(req.query.height) || 800;

    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
        });

        const page = await browser.newPage();
        await page.setViewport({ width, height });
        
        // Go to URL and wait until there are no more than 2 network connections for at least 500 ms
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        const screenshot = await page.screenshot({ type: 'png' });
        
        res.set('Content-Type', 'image/png');
        res.send(screenshot);
    } catch (error) {
        console.error('Screenshot error:', error);
        res.status(500).json({ error: 'Failed to capture screenshot', details: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Snapsite listening on port ${port}`);
});
