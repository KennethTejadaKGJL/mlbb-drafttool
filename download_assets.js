const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');

// --- PATHS ---
const TARGET_DIR = path.join(__dirname, 'client', 'public', 'images');
const HEROES_FILE = path.join(__dirname, 'client', 'app', 'heroes.json');

// Ensure directory exists
if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });

(async () => {
    try {
        const localHeroes = require(HEROES_FILE);
        console.log(`⚡ Launching API Downloader for ${localHeroes.length} heroes...`);
        console.log(`📂 Saving to: ${TARGET_DIR}\n`);

        let successCount = 0;

        for (const hero of localHeroes) {
            // 1. Ask the API for the image URL directly
            // We request a thumbnail size of 600px (good for your app)
            const apiUrl = `https://mobile-legends.fandom.com/api.php?action=query&titles=${encodeURIComponent(hero.name)}&prop=pageimages&format=json&pithumbsize=600`;

            try {
                const response = await axios.get(apiUrl);
                const pages = response.data.query.pages;
                
                // The API returns the page ID as a key (e.g., "-1" or "12345")
                const pageId = Object.keys(pages)[0];
                const pageData = pages[pageId];

                if (pageId === "-1" || !pageData.thumbnail) {
                    console.log(`⚠️  [API Fail] Could not find image for: ${hero.name}`);
                    continue; // Skip to next hero
                }

                const imgUrl = pageData.thumbnail.source;
                
                // 2. Setup file path
                const fileName = hero.image.replace('/images/', '').replace('/', '');
                const filePath = path.join(TARGET_DIR, fileName);

                // 3. Download
                await downloadImage(imgUrl, filePath);
                console.log(`🟢 [OK] ${hero.name}`);
                successCount++;

            } catch (err) {
                console.log(`🔴 [FAIL] ${hero.name}: ${err.message}`);
            }

            // No huge delay needed for API, just a tiny breather
            await new Promise(r => setTimeout(r, 100));
        }

        console.log(`\n🎉 DONE! Saved ${successCount} images.`);

    } catch (e) {
        console.error("Critical Error:", e.message);
    }
})();

// Helper: Download File
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, response => {
            if (response.statusCode !== 200) {
                reject(new Error(`Status ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', err => {
            fs.unlink(filepath, () => {}); 
            reject(err);
        });
    });
}