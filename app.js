import puppeteer from 'puppeteer';
import fs from 'fs';
import urls from './urls.json' assert { type: "json" };
import client from 'https';

const basePath = './images';

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        client.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                // Consume response data to free up memory
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));

            }
        });
    });
}

function retrieveImages() {
    const images = document.querySelectorAll('img');
    const urls = [];
    images.forEach((image) => {
        if (image.width === 12 && image.height === 12) return;
        if (image.width < 200) return;
        urls.push(image.src);
    });
    return urls;
}

fs.readdirSync(basePath).forEach((file) => {
    if (file === '.gitkeep' || file === '.gitignore') return;
    fs.rmSync(`${basePath}/${file}`, { recursive: true, force: true });
});

for (const key in urls) {
    if (!fs.existsSync(`${basePath}/${key}`)) {
        fs.mkdirSync(`${basePath}/${key}`);
    }

    const browser = await puppeteer.launch({
        headless: "new",
    });

    const page = await browser.newPage();

    await page.goto(urls[key], { waitUntil: 'networkidle2' });

    const images = await page.evaluate(retrieveImages);

    images.forEach(async (url, index) => {
        if (!url.includes('base64')) {
            downloadImage(url, `./${basePath}/${key}/image${index}.png`)
                .then((filepath) => {
                    console.log(`Downloaded File: ${filepath}`);
                })
                .catch((err) => {
                    console.error(`Failed to Download File: ${err}`);
                });
        } else {
            const base64Image = url.split(';base64,').pop();
            if (!base64Image) return;
            fs.writeFileSync(`./${basePath}/${key}/image${index}.png`, base64Image, { encoding: 'base64' });
            console.log(`Downloaded File: ./images/${key}/image${index}.png (base64)`);
        }
    });

    await browser.close();
}