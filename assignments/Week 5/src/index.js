import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import * as cheerio from "cheerio";
import { z } from "zod";

const BASE_URL = "https://books.toscrape.com/";
const CATALOGUE_START = new URL("catalogue/page-1.html", BASE_URL);
const CACHE_DIR = path.resolve("cache");
const OUTPUT_DIR = path.resolve("output");
const USER_AGENT = "FlyRankInternship-A9/1.0 (+https://github.com/YOUR_USERNAME/YOUR_REPO)";
const REQUEST_DELAY_MS = 600;
const TIMEOUT_MS = 8000;

const args = new Set(process.argv.slice(2));
const injectFailure = args.has("--inject-failure");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const RawRecordSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url(),
  price_text: z.string().min(1),
  availability_text: z.string().min(1),
  rating_text: z.string().min(1),
  description: z.string().nullable(),
  source_page: z.string().url(),
  fetched_at: z.string().datetime()
});

const BookSchema = RawRecordSchema.extend({
  price_gbp: z.number().nonnegative()
});

async function ensureDirs() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

function cacheNameForUrl(url) {
  const u = new URL(url);
  let name = u.pathname.replace(/^\/+|\/+$/g, "").replaceAll("/", "_");
  if (!name) name = "index";
  return `${name}.html`;
}

async function readCache(url) {
  try {
    return await fs.readFile(path.join(CACHE_DIR, cacheNameForUrl(url)), "utf8");
  } catch {
    return null;
  }
}

async function fetchHtml(url, stats, { forceFailure = false } = {}) {
  const cached = await readCache(url);
  if (cached !== null) {
    stats.cache_hits++;
    console.log(`CACHE HIT ${url} (${Buffer.byteLength(cached)} bytes)`);
    return { html: cached, fromCache: true, status: 200 };
  }

  await sleep(REQUEST_DELAY_MS);
  stats.pages_fetched++;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(forceFailure ? "https://books.toscrape.com/not-a-real-page-404.html" : url, {
      headers: { "User-Agent": USER_AGENT, "Accept": "text/html" },
      signal: controller.signal
    });

    if (response.status !== 200) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const html = await response.text();
    await fs.writeFile(path.join(CACHE_DIR, cacheNameForUrl(url)), html, "utf8");
    console.log(`FETCH ${url} (${Buffer.byteLength(html)} bytes)`);
    return { html, fromCache: false, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithOneRetry(url, stats, options = {}) {
  try {
    return await fetchHtml(url, stats, options);
  } catch (error) {
    const status = error.status;
    const retryable = status === undefined || (status >= 500 && status <= 599);
    if (!retryable) throw error;

    console.log(`RETRY ${url} after ${error.message}`);
    await sleep(1200);
    return await fetchHtml(url, stats, options);
  }
}

function absoluteUrl(href, baseUrl) {
  return new URL(href, baseUrl).href;
}

async function classifyTarget() {
  const robotsUrl = new URL("robots.txt", BASE_URL).href;
  const response = await fetch(robotsUrl, {
    headers: { "User-Agent": USER_AGENT }
  });

  console.log(`robots.txt status=${response.status}`);
  return {
    target: BASE_URL,
    robots_status: response.status,
    robots_result: response.ok ? "robots file found" : "no robots file found"
  };
}

async function discoverCataloguePages(stats) {
  const pages = [];
  const bookUrls = new Set();
  let currentUrl = CATALOGUE_START.href;

  for (let pageNumber = 1; pageNumber <= 3; pageNumber++) {
    const result = await fetchWithOneRetry(currentUrl, stats);
    const $ = cheerio.load(result.html);

    $("article.product_pod h3 a").each((_, el) => {
      const href = $(el).attr("href");
      if (href) bookUrls.add(absoluteUrl(href, currentUrl));
    });

    pages.push(currentUrl);

    const nextHref = $(".next a").attr("href");
    if (!nextHref || pageNumber === 3) break;

    currentUrl = absoluteUrl(nextHref, currentUrl);
  }

  return { pages, bookUrls: [...bookUrls] };
}

function cleanPrice(priceText) {
  const value = Number.parseFloat(priceText.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(value)) throw new Error(`Invalid price: ${priceText}`);
  return value;
}

function extractRawRecord(html, productUrl, sourcePage) {
  const $ = cheerio.load(html);
  const title = $("div.product_main h1").first().text().trim();
  const priceText = $("div.product_main .price_color").first().text().trim();
  const availabilityText = $("div.product_main .availability").first().text().replace(/\s+/g, " ").trim();

  const ratingClass = $("div.product_main .star-rating").attr("class") || "";
  const ratingText = ratingClass.replace("star-rating", "").trim();

  const descriptionHeader = $("#product_description").first();
  const description = descriptionHeader.length
    ? descriptionHeader.next("p").text().replace(/\s+/g, " ").trim() || null
    : null;

  return {
    title,
    product_url: productUrl,
    price_text: priceText,
    availability_text: availabilityText,
    rating_text: ratingText,
    description,
    source_page: sourcePage,
    fetched_at: new Date().toISOString()
  };
}

function normalizeAndValidate(raw) {
  const checkedRaw = RawRecordSchema.parse(raw);
  const normalized = {
    ...checkedRaw,
    price_gbp: cleanPrice(checkedRaw.price_text)
  };
  return BookSchema.parse(normalized);
}

function dedupeByCanonicalUrl(records) {
  const map = new Map();
  for (const record of records) map.set(record.product_url, record);
  return [...map.values()];
}

async function writeJson(filename, data) {
  await fs.writeFile(
    path.join(OUTPUT_DIR, filename),
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

async function main() {
  await ensureDirs();

  const started = new Date();
  const start = performance.now();

  const stats = {
    start_time: started.toISOString(),
    duration_seconds: 0,
    catalogue_pages: 0,
    discovered_urls: 0,
    unique_urls: 0,
    pages_fetched: 0,
    cache_hits: 0,
    valid_records: 0,
    invalid_records: 0,
    failed_pages: 0
  };

  const errors = [];

  try {
    const classification = await classifyTarget();
    console.log(`TARGET ${classification.target}`);
    console.log(`ROBOTS ${classification.robots_result}`);

    const discovery = await discoverCataloguePages(stats);
    stats.catalogue_pages = discovery.pages.length;
    stats.discovered_urls = discovery.bookUrls.length;
    stats.unique_urls = new Set(discovery.bookUrls).size;

    console.log(`catalogue_pages=${stats.catalogue_pages}`);
    console.log(`discovered=${stats.discovered_urls}`);
    console.log(`unique_urls=${stats.unique_urls}`);

    const urls = [...new Set(discovery.bookUrls)];
    if (injectFailure) urls.push("https://books.toscrape.com/not-a-real-page-404.html");

    const records = [];

    for (const productUrl of urls) {
      const sourcePage = discovery.pages.find((pageUrl) => {
        // The exact source page is known from discovery order; fallback to page 1.
        return true;
      }) ?? discovery.pages[0];

      try {
        const isFake = injectFailure && productUrl.includes("not-a-real-page-404");
        const result = await fetchWithOneRetry(productUrl, stats, { forceFailure: isFake });

        const raw = extractRawRecord(result.html, productUrl, sourcePage);
        const record = normalizeAndValidate(raw);

        records.push(record);
        stats.valid_records++;
      } catch (error) {
        stats.invalid_records += 1;
        stats.failed_pages += 1;

        errors.push({
          url: productUrl,
          reason: error?.message ?? String(error),
          status: error?.status ?? null,
          recorded_at: new Date().toISOString()
        });

        console.error(`SKIP ${productUrl}: ${error?.message ?? error}`);
      }
    }

    const uniqueRecords = dedupeByCanonicalUrl(records);
    await writeJson("books.json", uniqueRecords);
    await writeJson("errors.json", errors);

    stats.valid_records = uniqueRecords.length;
    stats.duration_seconds = Number(((performance.now() - start) / 1000).toFixed(2));

    await writeJson("run-report.json", {
      ...stats,
      failed_pages: errors.length,
      finished_at: new Date().toISOString()
    });

    console.log("\nRUN COMPLETE");
    console.log(JSON.stringify({
      catalogue_pages: stats.catalogue_pages,
      discovered: stats.discovered_urls,
      unique_urls: stats.unique_urls,
      valid_records: uniqueRecords.length,
      invalid_records: errors.length,
      failed_pages: errors.length,
      cache_hits: stats.cache_hits,
      duration_seconds: stats.duration_seconds
    }, null, 2));
  } catch (error) {
    stats.duration_seconds = Number(((performance.now() - start) / 1000).toFixed(2));
    await writeJson("run-report.json", {
      ...stats,
      failed_pages: stats.failed_pages + 1,
      fatal_error: error?.message ?? String(error),
      finished_at: new Date().toISOString()
    });
    console.error("FATAL:", error);
    process.exitCode = 1;
  }
}

main();
