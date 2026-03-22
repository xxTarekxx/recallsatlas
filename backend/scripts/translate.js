"use strict";

const fs = require("fs");
const path = require("path");

/* -------------------------------------------------- */
/* ENV */
/* -------------------------------------------------- */

function loadEnv() {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) return;

    const content = fs.readFileSync(envPath, "utf8");

    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;

        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();

        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);

        process.env[key] = val;
    }
}

loadEnv();

/* -------------------------------------------------- */
/* CONFIG */
/* -------------------------------------------------- */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

const MODEL = "gpt-4.1-mini";
const RATE_LIMIT_MS = 50;

const INPUT_FILE = path.join(__dirname, "breakingnews.json");
const PARTIAL_FILE = path.join(__dirname, "breakingnews.partial.json");

const TRANSLATABLE_KEYS = new Set([
    "headline",
    "description",
    "subtitle",
    "text",
    "textContinuationNote",
    "stats",
    "keywords",
    "caption"
]);

const SUPPORTED_LANGUAGES = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "de", name: "German" },
    { code: "ja", name: "Japanese" },
    { code: "fr", name: "French" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "it", name: "Italian" },
    { code: "nl", name: "Dutch" },
    { code: "pl", name: "Polish" },
    { code: "tr", name: "Turkish" },
    { code: "fa", name: "Persian" },
    { code: "zh", name: "Chinese" },
    { code: "vi", name: "Vietnamese" },
    { code: "id", name: "Indonesian" },
    { code: "cs", name: "Czech" },
    { code: "ko", name: "Korean" },
    { code: "uk", name: "Ukrainian" },
    { code: "hu", name: "Hungarian" },
    { code: "ar", name: "Arabic" }
];

/* -------------------------------------------------- */
/* GLOBAL STATE */
/* -------------------------------------------------- */

let workingData = null;

let progressState = {
    articleIndex: 0,
    totalArticles: 0,
    languageIndex: 0,
    totalLanguages: 0,
    translatedElements: 0,
    totalElements: 0,
    currentLanguage: ""
};

let lastRenderTime = 0;
const RENDER_INTERVAL = 300;

/* -------------------------------------------------- */
/* UTILS */
/* -------------------------------------------------- */

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function saveProgress() {
    if (!workingData) return;

    fs.writeFileSync(PARTIAL_FILE, JSON.stringify(workingData, null, 2));
    fs.writeFileSync(INPUT_FILE, JSON.stringify(workingData, null, 2));
}

function getLanguageName(code) {
    return SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code;
}

function getTargetLanguages() {
    return SUPPORTED_LANGUAGES.filter(l => l.code !== "en").map(l => l.code);
}

function hasRealLanguageContent(article, langCode) {
    const lang = article.languages?.[langCode];
    return lang && (lang.headline || lang.description || lang.content?.length);
}

/* -------------------------------------------------- */
/* PROGRESS BAR */
/* -------------------------------------------------- */

function progressBar(current, total, width = 30) {

    if (total <= 0) total = 1;

    const safeCurrent = Math.max(0, Math.min(current, total));
    const ratio = safeCurrent / total;

    const filled = Math.round(ratio * width);
    const safeFilled = Math.max(0, Math.min(width, filled));

    const empty = width - safeFilled;

    const bar =
        "█".repeat(safeFilled) +
        "░".repeat(empty);

    return `[${bar}] ${Math.round(ratio * 100)}%`;
}

function showStatus(articleId) {

    process.stdout.write("\x1Bc");

    const safeCurrent = Math.min(
        progressState.translatedElements,
        progressState.totalElements
    );

    const remaining = Math.max(
        0,
        progressState.totalElements - safeCurrent
    );

    console.log("========================================================");

    console.log(
        `ARTICLE ${progressState.articleIndex + 1} / ${progressState.totalArticles}`
    );

    console.log(`ID: ${articleId}`);

    console.log(
        `Languages completed: ${progressState.languageIndex} / ${progressState.totalLanguages}`
    );

    console.log(
        `Languages remaining: ${progressState.totalLanguages - progressState.languageIndex
        }`
    );

    console.log("");
    console.log(`Translating: ${progressState.currentLanguage}`);
    console.log("");

    console.log(
        `Elements translated: ${safeCurrent} / ${progressState.totalElements}`
    );

    console.log(`Remaining: ${remaining}`);
    console.log("");

    console.log(progressBar(safeCurrent, progressState.totalElements));

    console.log("========================================================");
}

/* -------------------------------------------------- */
/* COUNT */
/* -------------------------------------------------- */

function countTranslatableElements(node) {

    let count = 0;

    function walk(n) {

        if (!n) return;

        if (Array.isArray(n)) {
            n.forEach(walk);
            return;
        }

        if (typeof n !== "object") return;

        for (const key of Object.keys(n)) {

            const val = n[key];

            if (TRANSLATABLE_KEYS.has(key)) {

                if (typeof val === "string") count++;

                if (Array.isArray(val)) {
                    val.forEach(v => {
                        if (typeof v === "string") count++;
                    });
                }
            }

            if (typeof val === "object") walk(val);
        }
    }

    walk(node);
    return count;
}

/* -------------------------------------------------- */
/* OPENAI */
/* -------------------------------------------------- */

async function translateText(text, language) {

    if (!text || typeof text !== "string") return text;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {

        const res = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                input: `Translate into ${language}. Keep HTML and URLs unchanged.\n\n${text}`
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) return text;

        const data = await res.json();

        return (
            data.output?.[0]?.content?.[0]?.text ||
            data.output_text ||
            text
        ).trim();

    } catch {
        return text;
    }
}

/* -------------------------------------------------- */
/* RECURSIVE */
/* -------------------------------------------------- */

async function translateRecursive(node, language, articleId) {

    if (!node) return;

    if (Array.isArray(node)) {

        for (let i = 0; i < node.length; i++) {

            if (typeof node[i] === "string") {

                await delay(RATE_LIMIT_MS);

                node[i] = await translateText(node[i], language);

                progressState.translatedElements++;

                const now = Date.now();
                if (now - lastRenderTime > RENDER_INTERVAL) {
                    showStatus(articleId);
                    lastRenderTime = now;
                }

                saveProgress();

            } else {
                await translateRecursive(node[i], language, articleId);
            }
        }

        return;
    }

    if (typeof node !== "object") return;

    for (const key of Object.keys(node)) {

        const val = node[key];

        if (!TRANSLATABLE_KEYS.has(key)) {
            if (typeof val === "object") {
                await translateRecursive(val, language, articleId);
            }
            continue;
        }

        if (typeof val === "string") {

            await delay(RATE_LIMIT_MS);

            node[key] = await translateText(val, language);

            progressState.translatedElements++;

            const now = Date.now();
            if (now - lastRenderTime > RENDER_INTERVAL) {
                showStatus(articleId);
                lastRenderTime = now;
            }

            saveProgress();

        } else if (Array.isArray(val)) {

            for (let i = 0; i < val.length; i++) {

                if (typeof val[i] === "string") {

                    await delay(RATE_LIMIT_MS);

                    val[i] = await translateText(val[i], language);

                    progressState.translatedElements++;

                    const now = Date.now();
                    if (now - lastRenderTime > RENDER_INTERVAL) {
                        showStatus(articleId);
                        lastRenderTime = now;
                    }

                    saveProgress();

                } else {
                    await translateRecursive(val[i], language, articleId);
                }
            }
        }
    }
}

/* -------------------------------------------------- */
/* MAIN */
/* -------------------------------------------------- */

async function main() {

    workingData = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

    if (fs.existsSync(PARTIAL_FILE)) {
        workingData = JSON.parse(fs.readFileSync(PARTIAL_FILE, "utf8"));
        console.log("⚡ Resuming from partial file");
    }

    const languages = getTargetLanguages();

    progressState.totalArticles = workingData.length;
    progressState.totalLanguages = languages.length;

    for (let i = 0; i < workingData.length; i++) {

        const wrapper = workingData[i];

        progressState.articleIndex = i;
        progressState.languageIndex = 0;

        if (!wrapper.languages) wrapper.languages = {};

        const english = deepClone(wrapper.languages.en);

        for (const langCode of languages) {

            if (hasRealLanguageContent(wrapper, langCode)) {
                progressState.languageIndex++;
                continue;
            }

            const languageName = getLanguageName(langCode);

            progressState.translatedElements = 0;
            progressState.totalElements =
                countTranslatableElements(english) + 10;

            progressState.currentLanguage = `${languageName} (${langCode})`;

            const translated = deepClone(english);

            await translateRecursive(translated, languageName, wrapper.articleId);

            showStatus(wrapper.articleId);
            console.log(`✔ Finished ${langCode}`);

            translated.language = langCode;

            wrapper.languages[langCode] = translated;

            progressState.languageIndex++;

            saveProgress();
        }
    }

    saveProgress();

    if (fs.existsSync(PARTIAL_FILE)) fs.unlinkSync(PARTIAL_FILE);

    console.log("\n✅ COMPLETE");
}

/* -------------------------------------------------- */
/* CTRL+C */
/* -------------------------------------------------- */

process.on("SIGINT", () => {
    console.log("\n⚠ Saving before exit...");
    saveProgress();
    process.exit();
});

/* -------------------------------------------------- */

main().catch(console.error);