const { getStore } = require("@netlify/blobs");

const store = getStore("connections-puzzles");
const PUZZLE_PREFIX = "puzzles/";
const LABELS = ["Yellow", "Green", "Blue", "Purple"];
const COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"];

exports.handler = async function(event) {
  try {
    if (event.httpMethod === "GET") return await handleGet(event);
    if (event.httpMethod === "POST" || event.httpMethod === "PUT") return await handleUpsert(event);
    if (event.httpMethod === "DELETE") return await handleDelete(event);
    return jsonResponse(405, { error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    return jsonResponse(500, { error: "Server error." });
  }
};

async function handleGet(event) {
  const puzzleId = event.queryStringParameters && event.queryStringParameters.id;

  if (puzzleId) {
    const puzzle = await store.get(getPuzzleKey(puzzleId), {
      type: "json",
      consistency: "strong"
    });

    if (!puzzle) return jsonResponse(404, { error: "Puzzle not found." });
    return jsonResponse(200, { puzzle });
  }

  const listing = await store.list({ prefix: PUZZLE_PREFIX });
  const puzzles = await Promise.all(
    listing.blobs.map(blob =>
      store.get(blob.key, { type: "json", consistency: "strong" })
    )
  );

  const normalizedPuzzles = puzzles
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));

  return jsonResponse(200, { puzzles: normalizedPuzzles });
}

async function handleUpsert(event) {
  const rawPuzzle = parseJson(event.body);
  const normalizedPuzzle = normalizePuzzle(rawPuzzle);

  if (!normalizedPuzzle) {
    return jsonResponse(400, { error: "Invalid puzzle data." });
  }

  await store.setJSON(getPuzzleKey(normalizedPuzzle.id), normalizedPuzzle);
  return jsonResponse(200, { puzzle: normalizedPuzzle });
}

async function handleDelete(event) {
  const puzzleId = event.queryStringParameters && event.queryStringParameters.id;
  if (!puzzleId) return jsonResponse(400, { error: "Missing puzzle id." });

  await store.delete(getPuzzleKey(puzzleId));
  return jsonResponse(200, { ok: true });
}

function normalizePuzzle(rawPuzzle) {
  if (!rawPuzzle || !Array.isArray(rawPuzzle.categories) || rawPuzzle.categories.length < 4) {
    return null;
  }

  const categories = rawPuzzle.categories.slice(0, 4).map((category, index) => ({
    key: `c${index + 1}`,
    label: LABELS[index],
    color: COLORS[index],
    name: typeof category.name === "string" && category.name.trim() ? category.name.trim() : `Category ${index + 1}`,
    words: normalizeWords(category.words).slice(0, 4)
  }));

  if (!categories.every(category => category.words.length === 4)) return null;

  const now = new Date().toISOString();

  return {
    id: typeof rawPuzzle.id === "string" && rawPuzzle.id.trim() ? rawPuzzle.id.trim() : `puz_${Date.now()}`,
    title: typeof rawPuzzle.title === "string" && rawPuzzle.title.trim() ? rawPuzzle.title.trim() : "Unnamed",
    author: typeof rawPuzzle.author === "string" && rawPuzzle.author.trim() ? rawPuzzle.author.trim() : "Unkown",
    categories,
    createdAt: rawPuzzle.createdAt || now,
    updatedAt: now
  };
}

function normalizeWords(words) {
  if (!Array.isArray(words)) return [];

  return words
    .filter(word => typeof word === "string")
    .map(word => word.trim().toUpperCase())
    .filter(Boolean);
}

function getPuzzleKey(id) {
  return `${PUZZLE_PREFIX}${id}`;
}

function parseJson(text) {
  try {
    return JSON.parse(text || "{}");
  } catch (error) {
    return null;
  }
}

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  };
}
