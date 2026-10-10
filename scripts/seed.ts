import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { query } from "../lib/db";
import { normalizeCacheKey } from "../lib/cache";

const FORTUNE_500_TOP_20 = {
  query: "Fortune 500 Top 20",
  note: "Top 20 companies by revenue from the Fortune 500 list (2024 edition).",
  columns: [
    "Rank",
    "Company",
    "Industry",
    "Headquarters",
    "Revenue (USD billions)",
    "CEO",
  ],
  rows: [
    { Rank: 1, Company: "Walmart", Industry: "General Merchandisers", Headquarters: "Bentonville, Arkansas", "Revenue (USD billions)": 648.1, CEO: "Doug McMillon" },
    { Rank: 2, Company: "Amazon", Industry: "Internet Services and Retailing", Headquarters: "Seattle, Washington", "Revenue (USD billions)": 574.8, CEO: "Andy Jassy" },
    { Rank: 3, Company: "Apple", Industry: "Technology", Headquarters: "Cupertino, California", "Revenue (USD billions)": 383.3, CEO: "Tim Cook" },
    { Rank: 4, Company: "UnitedHealth Group", Industry: "Health Care", Headquarters: "Minnetonka, Minnesota", "Revenue (USD billions)": 371.6, CEO: "Andrew Witty" },
    { Rank: 5, Company: "Berkshire Hathaway", Industry: "Financials", Headquarters: "Omaha, Nebraska", "Revenue (USD billions)": 364.5, CEO: "Warren Buffett" },
    { Rank: 6, Company: "CVS Health", Industry: "Health Care", Headquarters: "Woonsocket, Rhode Island", "Revenue (USD billions)": 357.8, CEO: "Karen Lynch" },
    { Rank: 7, Company: "ExxonMobil", Industry: "Petroleum Refining", Headquarters: "Spring, Texas", "Revenue (USD billions)": 344.6, CEO: "Darren Woods" },
    { Rank: 8, Company: "Alphabet", Industry: "Technology", Headquarters: "Mountain View, California", "Revenue (USD billions)": 307.4, CEO: "Sundar Pichai" },
    { Rank: 9, Company: "McKesson", Industry: "Wholesalers: Health Care", Headquarters: "Irving, Texas", "Revenue (USD billions)": 276.7, CEO: "Brian Tyler" },
    { Rank: 10, Company: "Cencora", Industry: "Wholesalers: Health Care", Headquarters: "Conshohocken, Pennsylvania", "Revenue (USD billions)": 269.4, CEO: "Steven Collis" },
    { Rank: 11, Company: "Costco Wholesale", Industry: "General Merchandisers", Headquarters: "Issaquah, Washington", "Revenue (USD billions)": 242.3, CEO: "Ron Vachris" },
    { Rank: 12, Company: "JPMorgan Chase", Industry: "Commercial Banks", Headquarters: "New York, New York", "Revenue (USD billions)": 239.4, CEO: "Jamie Dimon" },
    { Rank: 13, Company: "Microsoft", Industry: "Technology", Headquarters: "Redmond, Washington", "Revenue (USD billions)": 211.9, CEO: "Satya Nadella" },
    { Rank: 14, Company: "Cardinal Health", Industry: "Wholesalers: Health Care", Headquarters: "Dublin, Ohio", "Revenue (USD billions)": 205.0, CEO: "Jason Hollar" },
    { Rank: 15, Company: "Chevron", Industry: "Petroleum Refining", Headquarters: "San Ramon, California", "Revenue (USD billions)": 200.9, CEO: "Michael Wirth" },
    { Rank: 16, Company: "Ford Motor", Industry: "Motor Vehicles & Parts", Headquarters: "Dearborn, Michigan", "Revenue (USD billions)": 176.2, CEO: "Jim Farley" },
    { Rank: 17, Company: "General Motors", Industry: "Motor Vehicles & Parts", Headquarters: "Detroit, Michigan", "Revenue (USD billions)": 171.8, CEO: "Mary Barra" },
    { Rank: 18, Company: "Elevance Health", Industry: "Health Care", Headquarters: "Indianapolis, Indiana", "Revenue (USD billions)": 171.3, CEO: "Gail Boudreaux" },
    { Rank: 19, Company: "Citigroup", Industry: "Commercial Banks", Headquarters: "New York, New York", "Revenue (USD billions)": 157.9, CEO: "Jane Fraser" },
    { Rank: 20, Company: "Centene", Industry: "Health Care", Headquarters: "St. Louis, Missouri", "Revenue (USD billions)": 154.0, CEO: "Sarah London" },
  ],
  model: "Gemini",
};

async function main() {
  console.log("Seeding database with Fortune 500 Top 20...");

  try {
    // 1. Insert into datasets table
    const datasetSql = `
      INSERT INTO datasets (query, note, columns, rows, row_count, model)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;

    const res = await query(datasetSql, [
      FORTUNE_500_TOP_20.query,
      FORTUNE_500_TOP_20.note,
      JSON.stringify(FORTUNE_500_TOP_20.columns),
      JSON.stringify(FORTUNE_500_TOP_20.rows),
      FORTUNE_500_TOP_20.rows.length,
      FORTUNE_500_TOP_20.model,
    ]);

    console.log(`Saved dataset inserted with ID: ${res.rows[0].id}`);

    // 2. Pre-seed both fast and verified generation cache
    const cachedPayload = {
      query: FORTUNE_500_TOP_20.query,
      note: FORTUNE_500_TOP_20.note,
      columns: FORTUNE_500_TOP_20.columns,
      rows: FORTUNE_500_TOP_20.rows,
      model: FORTUNE_500_TOP_20.model,
      cached: true,
    };

    const cacheKey = normalizeCacheKey(FORTUNE_500_TOP_20.query);

    const cacheSql = `
      INSERT INTO generation_cache (cache_key, response, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (cache_key) DO UPDATE
      SET response = EXCLUDED.response,
          created_at = NOW();
    `;

    await query(cacheSql, [cacheKey, JSON.stringify(cachedPayload)]);

    console.log("Cached responses pre-seeded successfully!");
    console.log("Seeding finished.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

main();
