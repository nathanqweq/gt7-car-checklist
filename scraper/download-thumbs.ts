// scraper/download-thumbs.ts
import fs from "node:fs";
import path from "node:path";

const CARS_JSON = path.resolve("public/cars.json");
const OUT_DIR = path.resolve("public/thumbs");

// thumbs do site (padrão)
function thumbUrl(carId: string) {
  return `https://www.gran-turismo.com/common/dist/gt7/carlist/car_thumbnails/${carId}.png`;
}

// Ajuste fino
const CONCURRENCY = Number(process.env.THUMB_CONCURRENCY || "2"); // 1~3 é ideal
const RETRIES = Number(process.env.THUMB_RETRIES || "3");
const TIMEOUT_MS = Number(process.env.THUMB_TIMEOUT || "25000");
const SLEEP_BETWEEN_MS = Number(process.env.THUMB_SLEEP || "120"); // pausa leve entre requests

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ac.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function downloadOne(carId: string): Promise<"ok" | "skip" | "fail"> {
  const outPath = path.join(OUT_DIR, `${carId}.png`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) return "skip";

  const url = thumbUrl(carId);

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          headers: {
            // headers “humanos”
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36",
            Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            // muitas vezes isso faz diferença no anti-hotlink:
            Referer: "https://www.gran-turismo.com/gb/gt7/carlist/",
            "Accept-Language": "en-GB,en;q=0.9,pt-BR;q=0.8",
          },
        },
        TIMEOUT_MS
      );

      if (!res.ok) {
        // 403/429 é comum; vamos retry com backoff
        const code = res.status;
        const body = await res.text().catch(() => "");
        if (attempt === RETRIES) {
          console.error(`[FAIL] ${carId} HTTP ${code} ${body.slice(0, 80)}`);
          return "fail";
        }
        const wait = 500 + attempt * 1200;
        console.warn(`[WARN] ${carId} HTTP ${code} retry em ${wait}ms`);
        await sleep(wait);
        continue;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) {
        if (attempt === RETRIES) {
          console.error(`[FAIL] ${carId} arquivo pequeno (${buf.length} bytes)`);
          return "fail";
        }
        await sleep(600 + attempt * 900);
        continue;
      }

      fs.writeFileSync(outPath, buf);
      return "ok";
    } catch (e: any) {
      if (attempt === RETRIES) {
        console.error(`[FAIL] ${carId} erro: ${e?.message ?? e}`);
        return "fail";
      }
      const wait = 700 + attempt * 1200;
      console.warn(`[WARN] ${carId} erro (${e?.message ?? e}), retry em ${wait}ms`);
      await sleep(wait);
    }
  }

  return "fail";
}

// fila simples sem dependência externa
async function runPool<T>(items: T[], worker: (item: T) => Promise<any>, concurrency: number) {
  const queue = items.slice();
  const running: Promise<void>[] = [];

  async function runOne() {
    const item = queue.shift();
    if (!item) return;
    await worker(item);
    await runOne();
  }

  for (let i = 0; i < concurrency; i++) running.push(runOne());
  await Promise.all(running);
}

async function main() {
  if (!fs.existsSync(CARS_JSON)) {
    console.error(`Não achei ${CARS_JSON}. Rode primeiro: npm run scrape:gb`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const parsed = JSON.parse(fs.readFileSync(CARS_JSON, "utf-8"));
  const cars: Array<{ carId: string }> = parsed?.cars ?? [];

  const carIds = cars.map((c) => c.carId).filter(Boolean);

  console.log(`Cars: ${carIds.length}`);
  console.log(`Out:  ${OUT_DIR}`);
  console.log(`Conc: ${CONCURRENCY}  Retries: ${RETRIES}`);

  let ok = 0, skip = 0, fail = 0;
  let done = 0;

  await runPool(
    carIds,
    async (carId) => {
      const r = await downloadOne(carId);
      if (r === "ok") ok++;
      else if (r === "skip") skip++;
      else fail++;

      done++;
      if (done % 25 === 0) {
        console.log(`Progress: ${done}/${carIds.length}  ok=${ok} skip=${skip} fail=${fail}`);
      }

      // pequena pausa pra evitar rate-limit
      await sleep(SLEEP_BETWEEN_MS);
    },
    CONCURRENCY
  );

  console.log(`DONE  ok=${ok} skip=${skip} fail=${fail}`);
  console.log(`Exemplo de thumb local: public/thumbs/car1932.png`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
