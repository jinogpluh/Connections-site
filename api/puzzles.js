const { Redis } = require("@upstash/redis");

const redis = Redis.fromEnv();
const PUZZLES_KEY = "connections:puzzles";
const LABELS = ["Yellow", "Green", "Blue", "Purple"];
const COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"];

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const puzzles = await getAllPuzzles();
      return res.status(200).json({ puzzles });
    }

    if (req.method === "POST" || req.method === "PUT") {
      const normalizedPuzzle = normalizePuzzle(req.body);
      if (!normalizedPuzzle) {
        return res.status(400).json({ error: "Invalid puzzle data." });
      }

      const puzzles = await getAllPuzzles();
      const existingIndex = puzzles.findIndex(puzzle => puzzle.id === normalizedPuzzle.id);

      if (existingIndex >= 0) {
        puzzles[existingIndex] = normalizedPuzzle;
      } else {
        puzzles.unshift(normalizedPuzzle);
      }

      await saveAllPuzzles(puzzles);
      return res.status(200).json({ puzzle: normalizedPuzzle });
    }

    if (req.method === "DELETE") {
      const puzzleId = req.query && req.query.id;
      if (!puzzleId) {
        return res.status(400).json({ error: "Missing puzzle id." });
      }

      const puzzles = await getAllPuzzles();
      const filteredPuzzles = puzzles.filter(puzzle => puzzle.id !== puzzleId);
      await saveAllPuzzles(filteredPuzzles);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error." });
  }
};

async function getAllPuzzles() {
  const storedValue = await redis.get(PUZZLES_KEY);

  if (!storedValue) return [];

  if (typeof storedValue === "string") {
    try {
      return JSON.parse(storedValue);
    } catch (error) {
      return [];
    }
  }

  return Array.isArray(storedValue) ? storedValue : [];
}

async function saveAllPuzzles(puzzles) {
  await redis.set(PUZZLES_KEY, JSON.stringify(puzzles));
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

  if (!categories.every(category => category.words.length === 4)) {
    return null;
  }

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
