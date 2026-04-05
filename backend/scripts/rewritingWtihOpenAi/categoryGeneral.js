const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

const BASE_URL = 'https://www.cpsc.gov/Recalls?search_combined_fields=&field_rc_date_value=2023-12-01&field_rc_date_value_1=2026-04-01&field_rc_hazards_target_id=All&field_rc_recall_by_product_target_id=All&field_rc_manufactured_in_value=&tab=csv';

const DATE_RANGE = '2023-12-01_2026-04-01';
const DOWNLOAD_DIR = path.join(__dirname, '..', 'generalRecalls', 'downloads');

/** Delay between actions: random from min to max (milliseconds). */
const RANDOM_WAIT_MIN_MS = 3000;
const RANDOM_WAIT_MAX_MS = 8000;

function formatCategory(name) {
    return name
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-')
        .trim();
}

function randomWait() {
    const span = RANDOM_WAIT_MAX_MS - RANDOM_WAIT_MIN_MS + 1;
    const ms = Math.floor(Math.random() * span) + RANDOM_WAIT_MIN_MS;
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    await fs.ensureDir(DOWNLOAD_DIR);

    const browser = await chromium.launch({ headless: false });

    const context = await browser.newContext({
        acceptDownloads: true,
    });

    const page = await context.newPage();

    console.log('Opening base page...');

    // STEP 1: Load base page
    await page.goto('https://www.cpsc.gov/Recalls', { waitUntil: 'domcontentloaded' });

    // STEP 2: Force URL with params (fix reset issue)
    await page.evaluate((url) => {
        window.location.href = url;
    }, BASE_URL);

    await page.waitForLoadState('domcontentloaded');

    // ✅ Random wait 3–8s before interacting
    await randomWait();

    console.log('Current URL:', page.url());

    // Wait for dropdown
    await page.waitForSelector('#edit-field-rc-recall-by-product-target-id--2');

    // Get category options
    const options = await page.$$eval(
        '#edit-field-rc-recall-by-product-target-id--2 option',
        opts =>
            opts
                .map(o => ({
                    value: o.value,
                    label: o.textContent.trim(),
                }))
                .filter(o => o.value !== 'All')
    );

    console.log(`Found ${options.length} categories`);

    for (const option of options) {
        const categoryName = option.label;
        const categorySlug = formatCategory(categoryName);

        console.log(`\nProcessing: ${categoryName}`);

        try {
            // Select category
            await page.selectOption(
                '#edit-field-rc-recall-by-product-target-id--2',
                option.value
            );

            await randomWait();

            // Click Apply
            await page.click('#edit-submit-recalls-list-filter-blocks');

            await randomWait();

            // 🚨 Check for maintenance page
            const maintenance = await page.$('div.content p');

            if (maintenance) {
                const text = await maintenance.textContent();

                if (text && text.toLowerCase().includes('maintenance')) {
                    console.log(`⚠️ Maintenance page — skipping: ${categoryName}`);

                    await page.goBack({ waitUntil: 'domcontentloaded' });
                    await randomWait();

                    continue;
                }
            }

            // Click Recalls tab
            await page.click('label[for="content-tab1"]');

            await randomWait();

            // 🚫 Check for "No results found"
            const noResults = await page.$('section.recalls-empty h3');

            if (noResults) {
                const text = await noResults.textContent();

                if (text && text.includes('No results found')) {
                    console.log(`Skipped (no results): ${categoryName}`);
                    continue;
                }
            }

            // Wait for CSV button
            await page.waitForSelector('.csv_download', { timeout: 10000 });

            // Download CSV
            const [download] = await Promise.all([
                page.waitForEvent('download'),
                page.click('.csv_download'),
            ]);

            const fileName = `${categorySlug}_${DATE_RANGE}.csv`;
            const filePath = path.join(DOWNLOAD_DIR, fileName);

            await download.saveAs(filePath);

            console.log(`Saved: ${fileName}`);

            await randomWait();

        } catch (err) {
            console.error(`Error with ${categoryName}:`, err.message);
        }
    }

    console.log('\nDone.');
    await browser.close();
})();