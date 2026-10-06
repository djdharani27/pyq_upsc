const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT_DIR = path.join(__dirname, "..", "data");
const QUESTIONS_FILE = path.join(OUT_DIR, "questions.json");
const FILTERS_FILE = path.join(OUT_DIR, "filters.json");
fs.mkdirSync(OUT_DIR, { recursive: true });

const APIS = [
  "https://pyq-project-backup.sxjeel.workers.dev/api/search",
  "https://pyq-project.in/api/search",
];
const LIMIT = 60;
const DELAY_MS = 800;
const MAX_TOTAL_FAILURES = 40;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; pyq-upsc/1.0)" } },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          return fetchUrl(next).then(resolve, reject);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({ status: res.statusCode, body });
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error("timeout"));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadQuestions() {
  if (fs.existsSync(QUESTIONS_FILE)) {
    try {
      const arr = JSON.parse(fs.readFileSync(QUESTIONS_FILE, "utf8"));
      return new Map(arr.map((q) => [q.id, q]));
    } catch {
      return new Map();
    }
  }
  return new Map();
}

function saveQuestions(map) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(Array.from(map.values())));
}

function balancedSlice(source, openIdx, openCh, closeCh) {
  let depth = 0,
    inStr = false,
    esc = false;
  for (let j = openIdx; j < source.length; j++) {
    const ch = source[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) return source.slice(openIdx, j + 1);
    }
  }
  return null;
}

function jsToJsonArray(lit) {
  // Convert unquoted keys to quoted, single to double quotes carefully
  const quotedKeys = lit.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":');
  const singleToDouble = quotedKeys.replace(/'/g, '"');
  return JSON.parse(singleToDouble);
}

function extractFilters() {
  const chunkFile = path.join(OUT_DIR, "chunk-561.js");
  if (!fs.existsSync(chunkFile)) {
    throw new Error("chunk-561.js missing");
  }
  const js = fs.readFileSync(chunkFile, "utf8");

  // Extract all JSON.parse('...') payloads
  const parsed = [];
  const re = /JSON\.parse\('([\s\S]*?)'\)/g;
  let m;
  while ((m = re.exec(js))) {
    try {
      const raw = m[1]
        .replace(/\\'/g, "'")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      parsed.push(JSON.parse(raw));
    } catch {}
  }

  let tags = {};
  let subjectTopics = {};
  for (const obj of parsed) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    const keys = Object.keys(obj);
    if (keys.includes("tags") && obj.tags && typeof obj.tags === "object") {
      tags = obj.tags;
    } else if (keys.length > 3 && keys.every((k) => Array.isArray(obj[k]))) {
      // subject -> topics[][]
      const mapped = {};
      for (const [k, v] of Object.entries(obj)) {
        mapped[k] = v.map((t) =>
          typeof t === "string" ? t : t.name || String(t)
        );
      }
      subjectTopics = mapped;
    }
  }

  // Extract let NAME = [{name:"...",count:N}, ...]
  const arrRe =
    /let\s+([A-Za-z_$][\w$]*)\s*=\s*(\[\{name:\s*"[^"]+",\s*count:\s*\d+\s*\}(?:\s*,\s*\{name:\s*"[^"]+",\s*count:\s*\d+\s*\})*)\s*\]/g;
  const namedArrays = {};
  while ((m = arrRe.exec(js))) {
    try {
      namedArrays[m[1]] = jsToJsonArray(m[2]);
    } catch {}
  }

  // Extract let NAME = ["2025","2024",...]
  const yearRe =
    /let\s+([A-Za-z_$][\w$]*)\s*=\s*(\[\s*"(?:19|20)\d{2}"(?:\s*,\s*"(?:19|20)\d{2}")*\s*\])/g;
  const namedYears = {};
  while ((m = yearRe.exec(js))) {
    try {
      namedYears[m[1]] = JSON.parse(m[2]);
    } catch {}
  }

  // Also try double-quoted years without quotes around via number array
  const yearNumRe =
    /let\s+([A-Za-z_$][\w$]*)\s*=\s*(\[\s*(?:19|20)\d{2}(?:\s*,\s*(?:19|20)\d{2})*\s*\])/g;
  while ((m = yearNumRe.exec(js))) {
    if (!namedYears[m[1]]) {
      try {
        namedYears[m[1]] = JSON.parse(m[2]);
      } catch {}
    }
  }

  // Heuristics based on minified export names from the bundle:
  // I.u0 = subjects, I.N4 = years, I.dr = exams, I.rm = subjectTopics
  // Variables inside module: S=subjects? Let's inspect named keys
  console.log("namedArrays vars:", Object.keys(namedArrays));
  console.log("namedYears vars:", Object.keys(namedYears));
  for (const [k, v] of Object.entries(namedArrays)) {
    console.log(
      "  array",
      k,
      "len",
      v.length,
      "sample",
      JSON.stringify(v.slice(0, 3)).slice(0, 200)
    );
  }
  for (const [k, v] of Object.entries(namedYears)) {
    console.log("  years", k, JSON.stringify(v).slice(0, 200));
  }

  // Find which array is exams vs subjects by looking at counts and names
  // Exams tend to be short codes; subjects tend to be longer descriptive names
  let exams = [];
  let subjects = [];
  let years = [];

  const arrays = Object.entries(namedArrays);
  for (const [name, arr] of arrays) {
    const avgLen =
      arr.reduce((s, x) => s + String(x.name || "").length, 0) / arr.length;
    const shortish = arr.filter((x) => String(x.name || "").length <= 18).length;
    const ratio = shortish / arr.length;
    console.log(
      `  analyze ${name}: len=${arr.length} avgNameLen=${avgLen.toFixed(1)} shortRatio=${ratio.toFixed(2)}`
    );
    if (ratio > 0.6) {
      exams = arr;
    } else {
      subjects = arr;
    }
  }

  // Prefer the longest year-like array
  const yearCandidates = Object.values(namedYears).filter(
    (a) => Array.isArray(a) && a.length >= 5
  );
  yearCandidates.sort((a, b) => b.length - a.length);
  if (yearCandidates.length) years = yearCandidates[0];

  // Fallback: derive years from tags
  if (!years.length) {
    const yearSet = new Set();
    for (const meta of Object.values(tags)) {
      if (meta && meta.year) yearSet.add(String(meta.year));
    }
    years = Array.from(yearSet).sort();
  }

  // Fallback subjects/exams from questions later if empty
  const filters = { tags, subjects, exams, years, subjectTopics };
  fs.writeFileSync(FILTERS_FILE, JSON.stringify(filters, null, 2));
  console.log("Saved filters.json", {
    subjects: subjects.length,
    exams: exams.length,
    years: years.length,
    tags: Object.keys(tags).length,
    subjectTopics: Object.keys(subjectTopics).length,
  });
  return filters;
}

function extractYearsFromTags(tags) {
  const yearSet = new Set();
  for (const meta of Object.values(tags || {})) {
    if (meta && meta.year) yearSet.add(String(meta.year));
  }
  return Array.from(yearSet).sort();
}

function extractExamYearFromTag(tag) {
  // tags look like "UPSC-CSE-Pre 2025"
  const y = tag.match(/(19|20)\d{2}/);
  return { year: y ? y[0] : null };
}

async function downloadQuestions(existing) {
  const all = existing || loadQuestions();
  let failures = 0;
  let consecutiveEmpty = 0;
  let maxOffsetSeen = 0;

  // First try empty query across full range, then fallback to query+year slices
  const strategies = [];

  // Strategy A: empty query full pagination (may hit rate limits)
  strategies.push({
    name: "empty-query",
    urls: (offset) =>
      APIS.map(
        (base) =>
          `${base}?q=&upscOnly=false&offset=${offset}&limit=${LIMIT}`
      ),
    offsets: () => {
      // resume from current unique count approx offset
      const start = Math.floor(all.size / LIMIT) * LIMIT;
      return start;
    },
  });

  // Strategy B: by exam (17 exams)
  strategies.push({
    name: "by-exam",
    build: (exam) => {
      // Use a common letter + exam filter; the API supports exams= when not upscOnly
      // Actually looking at client code, exams filter works with q empty via exams param
      return APIS.map(
        (base) =>
          `${base}?q=&upscOnly=false&offset=0&limit=${LIMIT}&exams=${encodeURIComponent(exam)}`
      );
    },
  });

  // We'll implement a more robust approach: iterate years × exams from tags metadata
  // Get unique exam/year pairs from tags
  const filters = fs.existsSync(FILTERS_FILE)
    ? JSON.parse(fs.readFileSync(FILTERS_FILE, "utf8"))
    : { tags: {}, exams: [], years: [] };

  const examYearPairs = [];
  const seenPairs = new Set();
  for (const [tag, meta] of Object.entries(filters.tags || {})) {
    const exam = meta && meta.exam;
    const year = meta && meta.year;
    if (!exam || !year) continue;
    const key = `${exam}||${year}`;
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    examYearPairs.push({ exam: String(year ? exam : exam), year: String(year), tag });
  }
  console.log(`exam/year pairs from tags: ${examYearPairs.length}`);
  if (!examYearPairs.length && Object.keys(filters.tags || {}).length) {
    // derive from tag strings
    for (const tag of Object.keys(filters.tags)) {
      const examMeta = filters.tags[tag];
      const exam = examMeta && examMeta.exam;
      const year = examMeta && examMeta.year;
      if (exam && year) {
        const key = `${exam}||${year}`;
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          examYearPairs.push({ exam, year: String(year) });
        }
      }
    }
    console.log(`derived pairs: ${examYearPairs.length}`);
  }

  async function fetchOne(url) {
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { status, body } = await fetchUrl(url);
        if (status === 429) {
          lastErr = new Error("429");
          await sleep(3000 + attempt * 2000);
          continue;
        }
        if (status !== 200) {
          lastErr = new Error(`HTTP ${status}`);
          await sleep(1000);
          continue;
        }
        return JSON.parse(body);
      } catch (e) {
        lastErr = e;
        await sleep(1500);
      }
    }
    throw lastErr || new Error("fetch failed");
  }

  // Primary: paginate empty query, alternating APIs
  console.log("Strategy: full pagination (empty query)");
  let offset = Math.max(0, Math.floor(all.size / LIMIT) * LIMIT);
  // Don't skip already-known ids at offset; just re-fetch from offset
  while (true) {
    const urls = [
      `${APIS[0]}?q=&upscOnly=false&offset=${offset}&limit=${LIMIT}`,
      `${APIS[1]}?q=&upscOnly=false&offset=${offset}&limit=${LIMIT}`,
    ];
    let data = null;
    let lastErr = null;
    for (const url of urls) {
      try {
        data = await fetchOne(url);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!data) {
      failures++;
      console.log(`  FAIL offset=${offset}: ${lastErr && lastErr.message}`);
      if (failures >= MAX_TOTAL_FAILURES) {
        console.log("Too many failures, switching strategy");
        break;
      }
      await sleep(2000);
      continue;
    }

    if (data.quotaExceeded || /quota|daily.*limit/i.test(data.error || "")) {
      console.log("Quota exceeded, will try backup/paired strategy");
      break;
    }

    const results = Array.isArray(data.results) ? data.results : [];
    if (!results.length) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= 3) break;
      offset += LIMIT;
      continue;
    }
    consecutiveEmpty = 0;

    let newCount = 0;
    for (const q of results) {
      if (q && q.id && !all.has(q.id)) {
        all.set(q.id, q);
        newCount++;
      } else if (q && q.id) {
        all.set(q.id, q);
      }
    }
    saveQuestions(all);
    console.log(
      `  offset=${offset} got=${results.length} new=${newCount} unique=${all.size}/${data.total ?? "?"}`
    );
    offset += LIMIT;
    if (data.hasMore === false) break;
    if (data.total && all.size >= data.total) break;
    if (offset > 20000) break;
    await sleep(DELAY_MS);
    failures = Math.max(0, failures - 1);
  }

  // Secondary: exam+year slices to catch any missing
  if (all.size < 7000 && examYearPairs.length) {
    console.log("Strategy: exam/year slices to fill gaps");
    // Group by exam to reduce requests
    const byExam = new Map();
    for (const p of examYearPairs) {
      if (!byExam.has(p.exam)) byExam.set(p.exam, []);
      byExam.get(p.exam).push(p);
    }
    for (const [exam, pairs] of byExam) {
      console.log(`  exam=${exam} years=${pairs.length}`);
      // First get total for this exam with empty query + exams filter
      let examTotal = null;
      try {
        const probe = await fetchOne(
          `${APIS[0]}?q=&upscOnly=false&offset=0&limit=1&exams=${encodeURIComponent(exam)}`
        );
        examTotal = probe.total;
        const probeResults = Array.isArray(probe.results) ? probe.results : [];
        for (const q of probeResults) if (q && q.id) all.set(q.id, q);
        saveQuestions(all);
      } catch (e) {
        console.log(`    probe failed: ${e.message}`);
      }
      console.log(`    exam total=${examTotal} unique_now=${all.size}`);

      if (examTotal && examTotal > 0) {
        let o = 0;
        let empty = 0;
        while (o < examTotal + LIMIT) {
          const urls = [
            `${APIS[0]}?q=&upscOnly=false&offset=${o}&limit=${LIMIT}&exams=${encodeURIComponent(exam)}`,
            `${APIS[1]}?q=&upscOnly=false&offset=${o}&limit=${LIMIT}&exams=${encodeURIComponent(exam)}`,
          ];
          let data = null;
          for (const url of urls) {
            try {
              data = await fetchOne(url);
              break;
            } catch {}
          }
          if (!data) {
            await sleep(1500);
            o += LIMIT;
            continue;
          }
          const results = Array.isArray(data.results) ? data.results : [];
          if (!results.length) {
            empty++;
            if (empty >= 2) break;
          } else {
            empty = 0;
            for (const q of results) if (q && q.id) all.set(q.id, q);
            saveQuestions(all);
            console.log(
              `    ${exam} offset=${o} unique=${all.size}`
            );
          }
          o += LIMIT;
          if (data.hasMore === false) break;
          await sleep(DELAY_MS);
          if (all.size >= 8000) break;
        }
      }

      if (all.size >= 8000) break;
    }
  }

  // Final: try by year slices
  if (all.size < 8000 && filters.years && filters.years.length) {
    console.log("Strategy: year slices");
    const years = filters.years.map((y) => String(y.name || y));
    for (const year of years) {
      if (all.size >= 8000) break;
      let o = 0;
      let empty = 0;
      let yearTotal = null;
      while (o < 10000) {
        const urls = [
          `${APIS[0]}?q=&upscOnly=false&offset=${o}&limit=${LIMIT}&years=${encodeURIComponent(year)}`,
          `${APIS[1]}?q=&upscOnly=false&offset=${o}&limit=${LIMIT}&years=${encodeURIComponent(year)}`,
        ];
        let data = null;
        for (const url of urls) {
          try {
            data = await fetchOne(url);
            break;
          } catch {}
        }
        if (!data) {
          await sleep(1500);
          break;
        }
        if (data.quotaExceeded) break;
        yearTotal = data.total;
        const results = Array.isArray(data.results) ? data.results : [];
        if (!results.length) {
          empty++;
          if (empty >= 2) break;
        } else {
          empty = 0;
          for (const q of results) if (q && q.id) all.set(q.id, q);
          saveQuestions(all);
          console.log(`    year=${year} offset=${o} unique=${all.size}`);
        }
        o += LIMIT;
        if (data.hasMore === false) break;
        if (yearTotal && o >= yearTotal) break;
        await sleep(DELAY_MS);
        if (all.size >= 8000) break;
      }
    }
  }

  console.log(`Final unique questions: ${all.size}`);
  saveQuestions(all);
  return all;
}

function normalizeFilters(questions) {
  const filters = fs.existsSync(FILTERS_FILE)
    ? JSON.parse(fs.readFileSync(FILTERS_FILE, "utf8"))
    : { tags: {}, subjects: [], exams: [], years: [], subjectTopics: {} };

  // Derive exams, years, subjects, topics from questions if missing/weak
  const examCount = new Map();
  const yearCount = new Map();
  const subjectCount = new Map();
  const subjectTopicMap = new Map();
  const topicCount = new Map();

  for (const q of questions) {
    if (q.exam) examCount.set(q.exam, (examCount.get(q.exam) || 0) + 1);
    if (q.year) yearCount.set(String(q.year), (yearCount.get(String(q.year)) || 0) + 1);
    if (q.subject) {
      subjectCount.set(q.subject, (subjectCount.get(q.subject) || 0) + 1);
      if (!subjectTopicMap.has(q.subject)) subjectTopicMap.set(q.subject, new Set());
      if (q.topic) {
        subjectTopicMap.get(q.subject).add(q.topic);
        topicCount.set(q.topic, (topicCount.get(q.topic) || 0) + 1);
      }
    }
  }

  const exams = Array.from(examCount, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count
  );
  const years = Array.from(yearCount.keys()).sort();
  const subjects = Array.from(subjectCount, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count
  );
  const subjectTopics = {};
  for (const [subj, set] of subjectTopicMap) {
    subjectTopics[subj] = Array.from(set);
  }

  // Prefer richer subjectTopics from JS if available
  if (
    !filters.subjectTopics ||
    Object.keys(filters.subjectTopics).length < subjects.length
  ) {
    filters.subjectTopics = subjectTopics;
  }

  filters.exams = exams;
  filters.years = years;
  filters.subjects = subjects;
  filters.topicCount = Object.fromEntries(topicCount);

  fs.writeFileSync(FILTERS_FILE, JSON.stringify(filters, null, 2));
  console.log("Normalized filters:", {
    exams: exams.length,
    years: years.length,
    subjects: subjects.length,
    subjectTopics: Object.keys(filters.subjectTopics).length,
  });
  return filters;
}

(async () => {
  try {
    if (!fs.existsSync(path.join(OUT_DIR, "chunk-561.js"))) {
      const { status, body } = await fetchUrl(
        "https://pyq-project.in/_next/static/chunks/561-5ef61cbb6c69eafe.js"
      );
      if (status !== 200) throw new Error("chunk fetch failed " + status);
      fs.writeFileSync(path.join(OUT_DIR, "chunk-561.js"), body);
    }
    extractFilters();
    const all = await downloadQuestions(loadQuestions());
    normalizeFilters(Array.from(all.values()));
    console.log("DONE", { questions: all.size });
  } catch (e) {
    console.error("FAILED", e);
    process.exit(1);
  }
})();
