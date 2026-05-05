const express = require('express');
const puppeteer = require('puppeteer');
const archiver = require('archiver');

const app = express();
const port = process.env.PORT || 3000;

const PRESETS = {
    '4k': { width: 3840, height: 2160 },
    '2k': { width: 2560, height: 1440 },
    'fhd': { width: 1920, height: 1080 },
    'hd': { width: 1280, height: 720 },
    '1024': { width: 1024, height: 768 },
    'tablet_portrait': { width: 768, height: 1024 },
    'tablet_landscape': { width: 1024, height: 768 },
    'phone_large_portrait': { width: 414, height: 896 },
    'phone_large_landscape': { width: 896, height: 414 },
    'phone_small_portrait': { width: 375, height: 667 },
    'phone_small_landscape': { width: 667, height: 375 }
};

async function closePopups(page) {
    try {
        await page.evaluate(() => {
            // Hide elements with common popup/cookie classes or IDs
            const hideSelectors = [
                '#cookie-notice', '.cookie-notice', '#cookie-bar', '.cookie-bar', 
                '#cookie-banner', '.cookie-banner', '#cc-main', '.cc-window', 
                '#gdpr-banner', '.gdpr-banner', '#tarteaucitronRoot', '.osano-cm-window'
            ];
            document.querySelectorAll(hideSelectors.join(',')).forEach(el => el.style.display = 'none');

            // Find and click accept buttons
            const keywords = ['accept', 'agree', 'allow', 'got it', 'ok', 'akceptuję', 'zgadzam się', 'rozumiem'];
            const elements = Array.from(document.querySelectorAll('button, a, [role="button"]'));
            
            for (const el of elements) {
                const text = (el.innerText || '').toLowerCase().trim();
                const isMatch = keywords.some(kw => text === kw || text.includes(' ' + kw) || text.includes(kw + ' '));
                if (isMatch && el.offsetHeight > 0) {
                    try { el.click(); } catch (e) {}
                }
            }
            
            // Heuristic: Hide fixed elements at the bottom or top that look like banners
            const allElements = document.querySelectorAll('div, section, aside');
            for (const el of allElements) {
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed' || style.position === 'sticky') {
                    const zIndex = parseInt(style.zIndex);
                    if (zIndex > 50 || style.bottom === '0px' || style.top === '0px') {
                        // Just hide it to be safe and clean the screenshot
                        el.style.opacity = '0';
                        el.style.pointerEvents = 'none';
                    }
                }
            }
        });
        // Wait a short moment for animations/hiding to take effect
        await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
        console.error('Error closing popups:', err);
    }
}

app.get('/screenshot', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required. Example: ?url=https://example.com' });
    }

    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
    }

    try { new URL(targetUrl); } catch (e) {
        return res.status(400).json({ error: 'Invalid URL provided' });
    }

    const presetNames = req.query.preset ? req.query.preset.split(',') : null;
    const isAll = req.query.preset === 'all';
    
    // Determine which sizes to process
    let sizesToProcess = {};
    if (isAll) {
        sizesToProcess = PRESETS;
    } else if (presetNames) {
        for (const p of presetNames) {
            if (PRESETS[p]) sizesToProcess[p] = PRESETS[p];
        }
    } else {
        // Default to a single size if no preset specified
        const width = parseInt(req.query.width) || 1280;
        const height = parseInt(req.query.height) || 800;
        sizesToProcess['custom'] = { width, height };
    }

    if (Object.keys(sizesToProcess).length === 0) {
        return res.status(400).json({ error: 'Invalid preset(s). Available presets: ' + Object.keys(PRESETS).join(', ') });
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
        });

        const page = await browser.newPage();
        
        // Single size mode (returns raw image)
        if (Object.keys(sizesToProcess).length === 1) {
            const sizeName = Object.keys(sizesToProcess)[0];
            const size = sizesToProcess[sizeName];
            
            await page.setViewport({ width: size.width, height: size.height });
            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await closePopups(page);
            
            const screenshot = await page.screenshot({ type: 'png' });
            res.set('Content-Type', 'image/png');
            return res.send(screenshot);
        }

        // Multiple sizes mode (returns ZIP archive)
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename="screenshots.zip"`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);

        // Load the page once
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await closePopups(page);

        // Take screenshots for all requested sizes
        for (const [name, dims] of Object.entries(sizesToProcess)) {
            await page.setViewport({ width: dims.width, height: dims.height });
            // Wait a brief moment for responsive layout to adjust
            await new Promise(r => setTimeout(r, 500));
            const screenshotBuffer = await page.screenshot({ type: 'png' });
            archive.append(screenshotBuffer, { name: `${name}_${dims.width}x${dims.height}.png` });
        }

        await archive.finalize();

    } catch (error) {
        console.error('Screenshot error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to capture screenshot', details: error.message });
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(port, () => console.log(`Snapsite listening on port ${port}`));
