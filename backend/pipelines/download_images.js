const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = "recallsatlas";
const COLLECTION = "recalls";

const IMAGE_DIR = path.join(
  __dirname,
  "../../frontend/public/images/recalls"
);

// create folder if missing
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

async function downloadImage(url, filepath) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function run() {
  const client = new MongoClient(MONGO_URI);

  await client.connect();
  const db = client.db(DB_NAME);
  const recalls = db.collection(COLLECTION);

  const cursor = recalls.find({});

  let processed = 0;

  for await (const recall of cursor) {
    try {
      if (!recall.source_url) continue;

      console.log("Processing:", recall.slug);

      const page = await axios.get(recall.source_url);
      const $ = cheerio.load(page.data);

      // find first recall image
      let imageUrl = $("figure img").first().attr("src");

      if (!imageUrl) {
        console.log("No image found");
        continue;
      }

      // handle relative URLs
      if (imageUrl.startsWith("/")) {
        imageUrl = "https://www.fda.gov" + imageUrl;
      }

      const filename = `${recall.slug}.webp`;
      const filepath = path.join(IMAGE_DIR, filename);

      // skip if image already exists
      if (fs.existsSync(filepath)) {
        console.log("Image exists, skipping");
        continue;
      }

      await downloadImage(imageUrl, filepath);

      const imagePath = `/images/recalls/${filename}`;

      await recalls.updateOne(
        { _id: recall._id },
        { $set: { image: imagePath } }
      );

      processed++;

      console.log("Saved:", filename);
    } catch (err) {
      console.log("Error:", err.message);
    }
  }

  console.log("Images processed:", processed);

  await client.close();
}

run();