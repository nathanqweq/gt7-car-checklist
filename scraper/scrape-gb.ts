// scraper/scrape-gb.ts
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { chromium, type Page } from "playwright";
import pLimit from "p-limit";

const LIST_URL = "https://www.gran-turismo.com/gb/gt7/carlist";
const OUT = path.resolve("public/cars.json");
const THUMBS_DIR = path.resolve("public/thumbs");
const CONCURRENCY = Number(process.env.GB_CONCURRENCY || "4"); // 4 é seguro
const DL_TIMEOUT_MS = Number(process.env.GB_DL_TIMEOUT_MS || "20000");
const DL_RETRIES = Number(process.env.GB_DL_RETRIES || "2");

function ensureDir(p: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function ensureDirSelf(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function clean(s: unknown): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function parseNumberLoose(s: string): number | null {
  const t = clean(s);
  if (!t) return null;

  // 1) vírgula decimal -> ponto
  // 2) remove separador de milhar "1.650" -> "1650"
  const normalized = t
    .replace(/,/g, ".")
    .replace(/(\d)\.(\d{3})(\D|$)/g, "$1$2$3");

  const m = normalized.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const v = Number(m[0]);
  return Number.isFinite(v) ? v : null;
}

function yearFromText(text?: string): number | undefined {
  const t = clean(text);
  const m = t.match(/\b(19|20)\d{2}\b/);
  if (m) {
    const y = Number(m[0]);
    if (Number.isFinite(y)) return y;
  }
  const m2 = t.match(/'(\d{2})\b/);
  if (m2) {
    const yy = Number(m2[1]);
    if (Number.isFinite(yy)) return yy <= 30 ? 2000 + yy : 1900 + yy;
  }
  return undefined;
}

type GbIndexItem = {
  carId: string;
  thumb?: string; // URL absoluta do site
  detailUrl: string;
};

type Car = {
  id: string; // carId
  carId: string;

  maker?: string;
  model?: string;
  name: string;
  year?: number;

  thumb?: string; // agora será "/thumbs/carXXXX.png"
  detailUrl: string;

  pp?: number;
  group?: string;

  drivetrain?: string;
  aspiration?: string;
  displacement_cc?: number;

  max_power_value?: number;
  max_power_unit?: string;
  max_power_rpm?: number;

  max_torque_value?: number;
  max_torque_unit?: string;
  max_torque_rpm?: number;

  weight_kg?: number;
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;

  headline?: string;
  description?: string[];
  descriptionText?: string;
};

function parsePower(t?: string) {
  if (!t) return {};
  const value = parseNumberLoose(t) ?? undefined;
  const unit = (t.match(/\b(BHP|CV|HP)\b/i)?.[1] || "").toUpperCase() || undefined;
  const rpmPart = t.match(/\/\s*([0-9,.\s]+)\s*rpm/i)?.[1];
  const rpm = rpmPart ? parseNumberLoose(rpmPart) ?? undefined : undefined;
  return { value, unit, rpm };
}

function parseTorque(t?: string) {
  if (!t) return {};
  const value = parseNumberLoose(t) ?? undefined;
  const unit = (t.match(/\b(kgfm|mkgf|Nm)\b/i)?.[1] || "") || undefined;
  const rpmPart = t.match(/\/\s*([0-9,.\s]+)\s*rpm/i)?.[1];
  const rpm = rpmPart ? parseNumberLoose(rpmPart) ?? undefined : undefined;
  return { value, unit, rpm };
}

/**
 * Download robusto (timeout + retries).
 * Importante: o hotlink bloqueia no navegador, mas no Node geralmente funciona.
 */
function downloadImage(url: string, outPath: string, timeoutMs = DL_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }

        const file = fs.createWriteStream(outPath);
        res.pipe(file);

        file.on("finish", () => file.close(() => resolve()));
        file.on("error", (e) => reject(e));
      }
    );

    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout after ${timeoutMs}ms for ${url}`));
    });
  });
}

async function downloadWithRetries(url: string, outPath: string): Promise<void> {
  for (let attempt = 0; attempt <= DL_RETRIES; attempt++) {
    try {
      await downloadImage(url, outPath);
      return;
    } catch (e) {
      if (attempt === DL_RETRIES) throw e;
      // pequena espera incremental
      await new Promise((r) => setTimeout(r, 400 + attempt * 700));
    }
  }
}

/**
 * Baixa thumb e devolve o caminho local (/thumbs/xxx.png).
 * Se já existe, reaproveita.
 */
async function ensureThumbLocal(carId: string, thumbUrl?: string): Promise<string | undefined> {
  if (!thumbUrl) return undefined;

  ensureDirSelf(THUMBS_DIR);

  // normalmente é .png; mas vamos respeitar a extensão da URL se tiver
  const ext = (() => {
    try {
      const u = new URL(thumbUrl);
      const p = u.pathname;
      const m = p.match(/\.(png|jpg|jpeg|webp)$/i);
      return m ? m[0].toLowerCase() : ".png";
    } catch {
      return ".png";
    }
  })();

  const fileName = `${carId}${ext}`;
  const outPath = path.join(THUMBS_DIR, fileName);

  if (!fs.existsSync(outPath)) {
    await downloadWithRetries(thumbUrl, outPath);
  }

  // para o site (Vite + GH Pages), usar caminho relativo a /public
  return `/thumbs/${fileName}`;
}

async function scrapeIndex(page: Page): Promise<GbIndexItem[]> {
  await page.goto(LIST_URL, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);

  const items = (await page.evaluate(() => {
    const out: Array<{ carId: string; detailUrl: string; thumb?: string }> = [];
    const nodes = Array.from(document.querySelectorAll("[data-car-id]"));

    for (const el of nodes) {
      const carId = el.getAttribute("data-car-id");
      if (!carId) continue;

      const a = el.querySelector("a[href*='/gt7/carlist/id/']");
      const href = a?.getAttribute("href");
      if (!href) continue;

      const detailUrl = new URL(href, location.origin).toString();

      const img = el.querySelector("img");
      const src = img?.getAttribute("src");
      const thumb = src ? new URL(src, location.origin).toString() : undefined;

      out.push({ carId, detailUrl, thumb });
    }

    // dedupe
    const map = new Map<string, any>();
    for (const it of out) map.set(it.carId, it);
    return Array.from(map.values());
  })) as GbIndexItem[];

  return items;
}

async function scrapeDetailWithDom(page: Page, it: GbIndexItem): Promise<Car> {
  await page.goto(it.detailUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);

  await page.waitForSelector("h1", { timeout: 12000 }).catch(() => {});

  const raw = await page.evaluate(() => {
    const clean = (s: any) => String(s ?? "").replace(/\s+/g, " ").trim();

    const model = clean(document.querySelector("h1")?.textContent);

    // maker: tenta achar texto acima do h1 (mesmo bloco)
    let maker = "";
    const h1 = document.querySelector("h1");
    if (h1?.parentElement) {
      const parent = h1.parentElement;
      const kids = Array.from(parent.children).map((el) => clean(el.textContent));
      maker = kids.find((t) => t && t !== model) || "";
    }

    // fallback: link de fabricante
    if (!maker) {
      const a =
        document.querySelector("a[href*='/gt7/carlist/manufacturer/']") ||
        document.querySelector("a[href*='/gt7/carlist/maker/']") ||
        document.querySelector("a[href*='/gt7/carlist/brand/']");
      maker = clean(a?.textContent);
    }

    // ===== headline + description =====
    const hs = Array.from(
      document.querySelectorAll("main h2, main h3, #app-root h2, #app-root h3, h2, h3")
    )
      .map((h) => clean(h.textContent))
      .filter((t) => t && t.length >= 30 && t.length <= 180);

    const headline = hs[0] || "";

    const ps = Array.from(document.querySelectorAll("main p, #app-root p, p"))
      .map((p) => clean(p.textContent))
      .filter((t) => t && t.length >= 40);

    const seen = new Set<string>();
    const paragraphs: string[] = [];
    for (const t of ps) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      paragraphs.push(t);
    }

    // ===== Specs por label =====
    const LABELS = [
      "Displacement",
      "Max. Power",
      "Max. Torque",
      "Weight",
      "Length",
      "Width",
      "Height",
      "Drivetrain",
      "Aspiration",
    ] as const;

    function exactTextNodes(label: string): Element[] {
      const all = Array.from(document.querySelectorAll("*"));
      const out: Element[] = [];
      for (const el of all) {
        const t = clean(el.textContent);
        if (t === label) out.push(el);
      }
      return out;
    }

    function findValueNearLabel(label: string): string {
      const nodes = exactTextNodes(label);
      for (const node of nodes) {
        // 1) table td -> next td
        const td = (node as HTMLElement).closest("td");
        if (td && td.nextElementSibling) {
          const v = clean(td.nextElementSibling.textContent);
          if (v) return v;
        }

        // 2) sobe no DOM e tenta achar container com 2 lados
        let cur: Element | null = node;
        for (let up = 0; up < 8 && cur; up++) {
          const parent = cur.parentElement;
          if (!parent) break;

          const childrenTexts = Array.from(parent.children)
            .map((c) => clean(c.textContent))
            .filter(Boolean);

          if (childrenTexts.length >= 2) {
            const hasLabel = childrenTexts.some((t) => t === label);
            if (hasLabel) {
              const v = childrenTexts[childrenTexts.length - 1];
              if (v && v !== label) return v;
            }
          }

          cur = parent;
        }

        // 3) nextElementSibling
        const next = (node as HTMLElement).nextElementSibling;
        if (next) {
          const v = clean(next.textContent);
          if (v) return v;
        }
      }
      return "";
    }

    const pairs: Record<string, string> = {};
    for (const lab of LABELS) {
      const v = findValueNearLabel(lab);
      if (v) pairs[lab] = v;
    }

    // ===== PP + Group =====
    const bodyText = clean(document.body?.textContent);
    const pp = bodyText.match(/\bPP\s*([0-9]+(?:[.,][0-9]+)?)\b/i)?.[1] ?? "";

    // "Gr.X" como nó exato (evita pegar "Gr.B" perdido)
    let group = "";
    const grNode = Array.from(document.querySelectorAll("*"))
      .map((el) => clean(el.textContent))
      .find((t) => /^Gr\.[A-Z]$/.test(t));
    if (grNode) group = grNode;

    return { maker, model, headline, paragraphs, pairs, pp, group };
  });

  const maker = clean(raw.maker) || undefined;
  const model = clean(raw.model) || undefined;
  const name = clean(`${maker ?? ""} ${model ?? ""}`) || model || it.carId;

  const headline = clean(raw.headline) || undefined;
  const description = Array.isArray(raw.paragraphs)
    ? raw.paragraphs.map((x: any) => clean(x)).filter(Boolean)
    : [];
  const descriptionText = description.length ? description.join("\n\n") : undefined;

  const pp = raw.pp ? parseNumberLoose(raw.pp) ?? undefined : undefined;
  const group = clean(raw.group) || undefined;

  const pairs = raw.pairs ?? {};

  const drivetrain = clean(pairs["Drivetrain"]) || undefined;
  const aspiration = clean(pairs["Aspiration"]) || undefined;

  const displacement_cc = (() => {
    const v = clean(pairs["Displacement"]);
    const n = parseNumberLoose(v);
    return n === null ? undefined : n;
  })();

  const weight_kg = (() => {
    const v = clean(pairs["Weight"]);
    const n = parseNumberLoose(v);
    return n === null ? undefined : n;
  })();

  const length_mm = (() => {
    const v = clean(pairs["Length"]);
    const n = parseNumberLoose(v);
    return n === null ? undefined : n;
  })();
  const width_mm = (() => {
    const v = clean(pairs["Width"]);
    const n = parseNumberLoose(v);
    return n === null ? undefined : n;
  })();
  const height_mm = (() => {
    const v = clean(pairs["Height"]);
    const n = parseNumberLoose(v);
    return n === null ? undefined : n;
  })();

  const maxPowerTxt = clean(pairs["Max. Power"]) || undefined;
  const maxTorqueTxt = clean(pairs["Max. Torque"]) || undefined;

  const mp = parsePower(maxPowerTxt);
  const mt = parseTorque(maxTorqueTxt);

  // ✅ Baixa thumb e troca para caminho local (evita 403 no browser)
  let thumbLocal: string | undefined = undefined;
  try {
    thumbLocal = await ensureThumbLocal(it.carId, it.thumb);
  } catch {
    // se falhar, deixa undefined (não quebra o scraper)
    thumbLocal = undefined;
  }

  return {
    id: it.carId,
    carId: it.carId,

    maker,
    model,
    name,
    year: yearFromText(model),

    thumb: thumbLocal,
    detailUrl: it.detailUrl,

    pp,
    group,

    drivetrain,
    aspiration,
    displacement_cc,

    max_power_value: mp.value,
    max_power_unit: mp.unit,
    max_power_rpm: mp.rpm,

    max_torque_value: mt.value,
    max_torque_unit: mt.unit,
    max_torque_rpm: mt.rpm,

    weight_kg,
    length_mm,
    width_mm,
    height_mm,

    headline,
    description,
    descriptionText,
  };
}

async function main() {
  ensureDir(OUT);
  ensureDirSelf(THUMBS_DIR);

  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    extraHTTPHeaders: { "accept-language": "en-GB,en;q=0.9" },
  });

  // FIX: esbuild/tsx injeta __name(...) e o browser não tem isso
  await context.addInitScript(() => {
    // @ts-ignore
    (globalThis as any).__name = (fn: any) => fn;
  });

  // 1) index
  const page = await context.newPage();
  const index = await scrapeIndex(page);
  await page.close();

  console.log(`[gb] index: ${index.length} carros`);

  // 2) detalhes (concorrência controlada)
  const limit = pLimit(CONCURRENCY);
  let done = 0;

  const cars = await Promise.all(
    index.map((it) =>
      limit(async () => {
        const p = await context.newPage();
        try {
          const car = await scrapeDetailWithDom(p, it);
          return car;
        } finally {
          await p.close();
          done++;
          if (done % 25 === 0) console.log(`[gb] detalhes: ${done}/${index.length}`);
        }
      })
    )
  );

  cars.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const out = {
    generated_at: new Date().toISOString(),
    source: LIST_URL,
    cars,
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf-8");
  console.log(`OK: ${cars.length} -> ${OUT}`);
  console.log(`OK: thumbs -> ${THUMBS_DIR}`);

  await context.close();
  await browser.close();
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
