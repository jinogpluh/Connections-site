// --- CONFIGURATION ---
const CATEGORIES = [
  { key:'c1', label:'Yellow', color:'var(--c1)', dark:'var(--c1-dark)' },
  { key:'c2', label:'Green',  color:'var(--c2)', dark:'var(--c2-dark)' },
  { key:'c3', label:'Blue',   color:'var(--c3)', dark:'var(--c3-dark)' },
  { key:'c4', label:'Purple', color:'var(--c4)', dark:'var(--c4-dark)' },
];

// --- APP STATE ---
// Load puzzles from storage, or start with an empty list []
let savedPuzzlesJSON = localStorage.getItem('connections_puzzles');
let puzzles = JSON.parse(savedPuzzlesJSON || '[]');

// Prepare the blank "Builder" data
let builderData = [];
for (let i = 0; i < CATEGORIES.length; i++) {
  let categoryTemplate = CATEGORIES[i];
  builderData.push({
    key: categoryTemplate.key,
    label: categoryTemplate.label,
    color: categoryTemplate.color,
    name: '',     // To be filled by user
    words: []     // To be filled by user
  });
}

let gameState = null;
let puzzleIndexToDelete = null;
let puzzleIndexToEdit = null;

// --- UTILITY FUNCTIONS ---

// Prevents users from accidentally "breaking" the HTML with special characters
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Shows a temporary message at the bottom
function showToast(msg) {
  const toastElement = document.getElementById('toast');
  toastElement.textContent = msg; 
  toastElement.classList.add('show');
  
  // Wait 3 seconds, then hide it
  setTimeout(function() {
    toastElement.classList.remove('show');
  }, 3000);
}

// --- NAVIGATION ---
function switchTab(tabName) {
  // Hide or show the correct views based on the tab clicked
  document.getElementById('tab-browse').classList.toggle('active', tabName === 'browse');
  document.getElementById('tab-create').classList.toggle('active', tabName === 'create');
  
  document.getElementById('browse-view').classList.toggle('active', tabName === 'browse');
  document.getElementById('create-view').classList.toggle('active', tabName === 'create');
  
  // Always hide the game when switching tabs
  document.getElementById('game-view').classList.remove('active');

  if (tabName === 'browse') renderGallery();
  if (tabName === 'create') {
    updateBuilderUI();
    renderBuilder();
  }
}

// --- GALLERY LOGIC ---
function renderGallery() {
  const container = document.getElementById('gallery-container');
  const solvedListJSON = localStorage.getItem('solved_puzzle_ids');
  const solvedList = JSON.parse(solvedListJSON || '[]');

  if (puzzles.length === 0) {
    container.innerHTML = `<div class="gallery-empty">No puzzles found. Create one!</div>`;
    return;
  }

  let htmlResult = '<div class="puzzle-cards">';

  for (let i = 0; i < puzzles.length; i++) {
    const p = puzzles[i];
    const isSolved = solvedList.includes(p.id);
    
    htmlResult += `
      <div class="puzzle-card ${isSolved ? 'solved-state' : ''}">
        <h3>${isSolved ? '✅ ' : ''}${esc(p.title)}</h3>
        <p>by ${esc(p.author || 'Anonymous')}</p>
        <div class="puzzle-card-footer">
          <button class="puzzle-action danger" onclick="deletePuzzle(${i})">Delete</button>
          <button class="puzzle-action secondary" onclick="editPuzzle(${i})">Edit</button>
          <button class="puzzle-action primary" onclick="playPuzzle(${i})">
              ${isSolved ? 'Replay' : 'Play'}
          </button>
        </div>
      </div>
    `;
  }

  htmlResult += '</div>';
  container.innerHTML = htmlResult;
}

// --- DELETE LOGIC ---
function deletePuzzle(index) {
    puzzleIndexToDelete = index;
    const modal = document.getElementById('confirm-Window');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function executeDelete() {
    if (puzzleIndexToDelete !== null) {
        puzzles.splice(puzzleIndexToDelete, 1);
        localStorage.setItem('connections_puzzles', JSON.stringify(puzzles));
        renderGallery();
        closeConfirmWindow();
    }
}

function closeConfirmWindow() {
    const modal = document.getElementById('confirm-Window');
    if (modal) modal.style.display = 'none';
    puzzleIndexToDelete = null; 
}

// --- BUILDER LOGIC ---
function createEmptyBuilderData() {
  return CATEGORIES.map(categoryTemplate => ({
    key: categoryTemplate.key,
    label: categoryTemplate.label,
    color: categoryTemplate.color,
    name: '',
    words: []
  }));
}

function resetBuilderForm() {
  builderData = createEmptyBuilderData();
  puzzleIndexToEdit = null;

  const titleField = document.getElementById('puzzle-title');
  const authorField = document.getElementById('puzzle-author');
  const importField = document.getElementById('swellgarfo-url');

  if (titleField) titleField.value = '';
  if (authorField) authorField.value = '';
  if (importField) importField.value = '';

  updateBuilderUI();
}

function updateBuilderUI() {
  const heading = document.getElementById('builder-heading');
  const saveButton = document.getElementById('save-puzzle-btn');
  const cancelButton = document.getElementById('cancel-edit-btn');
  const isEditing = puzzleIndexToEdit !== null;

  if (heading) heading.textContent = isEditing ? 'Edit Puzzle' : 'New Puzzle';
  if (saveButton) saveButton.textContent = isEditing ? 'Update Puzzle' : 'Save Puzzle';
  if (cancelButton) cancelButton.style.display = isEditing ? 'inline-block' : 'none';
}

function editPuzzle(index) {
  const puzzle = puzzles[index];
  if (!puzzle) return;

  puzzleIndexToEdit = index;
  builderData = CATEGORIES.map((categoryTemplate, categoryIndex) => {
    const puzzleCategory = puzzle.categories[categoryIndex] || {};
    return {
      key: categoryTemplate.key,
      label: categoryTemplate.label,
      color: categoryTemplate.color,
      name: puzzleCategory.name || '',
      words: Array.isArray(puzzleCategory.words) ? [...puzzleCategory.words] : []
    };
  });

  document.getElementById('puzzle-title').value = puzzle.title || '';
  document.getElementById('puzzle-author').value = puzzle.author || '';
  document.getElementById('swellgarfo-url').value = '';

  switchTab('create');
  showToast("Editing puzzle.");
}

function cancelEditPuzzle() {
  resetBuilderForm();
  renderBuilder();
}

function renderBuilder() {
  const grid = document.getElementById('categories-grid');
  let html = '';

  for (let i = 0; i < builderData.length; i++) {
    const cat = builderData[i];
    
    // Create the list of words already added
    let wordListHTML = '';
    for (let j = 0; j < cat.words.length; j++) {
      wordListHTML += `
        <li class="word-item">
          ${esc(cat.words[j])} 
          <button onclick="removeWordFromBuilder(${i}, ${j})">×</button>
        </li>`;
    }

    html += `
      <div class="cat-card">
        <div class="cat-header" style="background:${cat.color}">
          <input type="text" placeholder="Category Name" value="${esc(cat.name)}" 
                 oninput="builderData[${i}].name=this.value">
        </div>
        <div class="cat-words">
          <ul class="word-list">${wordListHTML}</ul>
          <div class="add-word-row">
            <input type="text" id="in-${i}" placeholder="Word..." 
                   onkeydown="if(event.key==='Enter')addWordToBuilder(${i})">
            <button onclick="addWordToBuilder(${i})">+</button>
          </div>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;
}

function addWordToBuilder(catIndex) {
  const input = document.getElementById(`in-${catIndex}`);
  const wordValue = input.value.trim().toUpperCase();

  if (!wordValue) return;
  if (builderData[catIndex].words.length >= 4) {
    showToast("Each category only needs 4 words!");
    return;
  }

  builderData[catIndex].words.push(wordValue);
  input.value = ''; 
  renderBuilder();
}

function removeWordFromBuilder(catIndex, wordIndex) {
  builderData[catIndex].words.splice(wordIndex, 1);
  renderBuilder();
}

function savePuzzle() {
  const titleField = document.getElementById('puzzle-title');
  const authorField = document.getElementById('puzzle-author');

  // Check if every category has 4 words
  let isComplete = true;
  for (let i = 0; i < builderData.length; i++) {
    if (builderData[i].words.length < 4) isComplete = false;
  }
  
  if (!titleField.value || !isComplete) { 
    showToast('Please finish all categories and the title!'); 
    return; 
  }

  const puzzleData = {
    title: titleField.value.trim(), 
    author: authorField.value.trim(), 
    categories: JSON.parse(JSON.stringify(builderData)) // Copy the data
  };

  if (puzzleIndexToEdit !== null) {
    const existingPuzzle = puzzles[puzzleIndexToEdit];
    puzzles[puzzleIndexToEdit] = {
      ...existingPuzzle,
      ...puzzleData
    };
  } else {
    puzzles.push({
      id: 'puz_' + Date.now(),
      ...puzzleData
    });
  }

  localStorage.setItem('connections_puzzles', JSON.stringify(puzzles));
  const successMessage = puzzleIndexToEdit !== null ? 'Puzzle updated!' : 'Puzzle saved!';
  resetBuilderForm();
  renderBuilder();
  showToast(successMessage);
  switchTab('browse');
}

// --- GAMEPLAY LOGIC ---
function playPuzzle(index) {
  const p = puzzles[index];
  let allWords = [];

  // Flatten categories into one big list of words
  for (let i = 0; i < p.categories.length; i++) {
    for (let j = 0; j < p.categories[i].words.length; j++) {
      allWords.push({
        word: p.categories[i].words[j],
        catIndex: i
      });
    }
  }
  
  // Shuffle words (Fisher-Yates Shuffle)
  for (let i = allWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = allWords[i];
    allWords[i] = allWords[j];
    allWords[j] = temp;
  }

  gameState = { 
    puzzle: p, 
    words: allWords, 
    selected: [], 
    solved: [], 
    mistakes: 0 
  };

  document.getElementById('browse-view').classList.remove('active');
  document.getElementById('game-view').classList.add('active');
  renderGame();
}

function renderGame() {
  const s = gameState;
  const container = document.getElementById('game-container');
  const remaining = s.words.filter(w => !s.solved.includes(w.catIndex));
  
  // Create the solved rows
  const solvedHTML = s.solved.map(ci => `
    <div class="solved-cat" style="background:${CATEGORIES[ci].color}">
      <b>${esc(s.puzzle.categories[ci].name)}</b><br>
      ${s.puzzle.categories[ci].words.join(', ')}
    </div>
  `).join('');

  const tilesHTML = remaining.map(w => {
    const isSelected = s.selected.includes(w.word);
    return `
      <div class="word-tile ${isSelected ? 'selected' : ''}" 
           onclick="toggleWord('${w.word.replace(/'/g, "\\'")}')">
        ${esc(w.word)}
      </div>
    `;
  }).join('');

  // FIX: Use a stable structure. We wrap the tiles and solved categories separately.
  container.innerHTML = `
    <div class="mistakes-row">Mistakes: ${'●'.repeat(4 - s.mistakes)}${'○'.repeat(s.mistakes)}</div>
    <div id="solved-rows-container">${solvedHTML}</div> 
    <div class="word-grid">${tilesHTML}</div>
    <div class="game-actions" style="text-align:center; margin-top:20px;">
        <button class="btn-game submit" onclick="submitGuess()">Submit Guess</button>
    </div>
    <div id="msg" style="text-align:center; margin-top:10px; min-height:20px;"></div>
  `;
}

async function importFromSwellgarfo() {
  const input = document.getElementById('swellgarfo-url');
  const rawUrl = input.value.trim();
  const normalizedUrl = normalizeSwellgarfoUrl(rawUrl);

  if (!normalizedUrl) {
    showToast("Please enter a valid Swellgarfo link.");
    return;
  }

  try {
    setImportButtonState(true);
    const html = await fetchSwellgarfoHtml(normalizedUrl);
    const importedPuzzle = parseSwellgarfoHtml(html);

    if (!importedPuzzle) {
      showToast("Import failed. I couldn't find puzzle data in that page.");
      return;
    }

    puzzles.push({
      id: 'puz_' + Date.now(),
      title: importedPuzzle.title || "Unnamed",
      author: importedPuzzle.author || "Unkown",
      categories: importedPuzzle.categories
    });
    localStorage.setItem('connections_puzzles', JSON.stringify(puzzles));
    input.value = '';
    showToast("Puzzle Imported!");
    renderGallery();
    switchTab('browse');
  } catch (error) {
    const message = error && error.message
      ? error.message
      : "Import failed. The site or proxy may be blocking the request.";
    showToast(message);
    console.error(error);
  } finally {
    setImportButtonState(false);
  }
}

function setImportButtonState(isImporting) {
  const importButton = document.getElementById('import-btn');
  if (!importButton) return;

  importButton.disabled = isImporting;
  importButton.textContent = isImporting ? 'Importing...' : 'Auto-Import';
  importButton.style.opacity = isImporting ? '0.7' : '1';
  importButton.style.cursor = isImporting ? 'wait' : 'pointer';
}

function normalizeSwellgarfoUrl(rawUrl) {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();
    if (!hostname.endsWith('swellgarfo.com')) return null;
    return url.toString();
  } catch (error) {
    return null;
  }
}

async function fetchSwellgarfoHtml(url) {
  const proxyAttempts = [
    {
      label: 'AllOrigins raw',
      buildUrl: targetUrl => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      parse: async response => response.text()
    },
    {
      label: 'CodeTabs',
      buildUrl: targetUrl => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(targetUrl)}`,
      parse: async response => response.text()
    },
    {
      label: 'AllOrigins get',
      buildUrl: targetUrl => `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
      parse: async response => {
        const data = await response.json();
        return data.contents || '';
      }
    }
  ];

  for (let i = 0; i < proxyAttempts.length; i++) {
    const proxy = proxyAttempts[i];

    try {
      const response = await fetchWithTimeout(proxy.buildUrl(url), 4500);
      if (!response.ok) {
        throw new Error(`${proxy.label} returned ${response.status}`);
      }

      const html = await proxy.parse(response);
      if (typeof html === 'string' && html.trim()) {
        return html;
      }

      throw new Error(`${proxy.label} returned an empty page`);
    } catch (error) {}
  }

  throw new Error("Import failed. Swellgarfo or the proxy blocked the request.");
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseSwellgarfoHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const title = extractImportedTitle(doc);
  const nextDataScript = doc.getElementById('__NEXT_DATA__');

  if (nextDataScript && nextDataScript.textContent) {
    const nextData = tryParseJson(nextDataScript.textContent);
    const nextDataPuzzle = extractPuzzleFromNextData(nextData);
    if (nextDataPuzzle) {
      return createImportedPuzzle(
        nextDataPuzzle.title,
        nextDataPuzzle.categories,
        nextDataPuzzle.author
      );
    }
  }

  const scriptTexts = Array.from(doc.querySelectorAll('script'))
    .map(script => script.textContent || '')
    .filter(Boolean);

  for (let i = 0; i < scriptTexts.length; i++) {
    const parsedJson = tryParseJson(scriptTexts[i].trim());
    if (!parsedJson) continue;

    const categories = findCategoriesInData(parsedJson);
    if (categories) {
      return createImportedPuzzle(title, categories);
    }
  }

  const sources = scriptTexts.concat(html);
  for (let i = 0; i < sources.length; i++) {
    const categories = extractCategoriesFromText(sources[i]);
    if (categories) {
      return createImportedPuzzle(title, categories);
    }
  }

  return null;
}

function extractImportedTitle(doc) {
  const metaTitle = doc.querySelector('meta[property="og:title"]');
  const rawTitle = (metaTitle && metaTitle.content) || doc.title || "Imported Game";
  const cleanedTitle = rawTitle
    .replace(/\s*-\s*Swellgarfo.*$/i, '')
    .replace(/\s*\|\s*Swellgarfo.*$/i, '')
    .trim();

  if (!cleanedTitle || /^Connections\s+[–-]\s+Puzzle\s+-/i.test(cleanedTitle)) {
    return 'Unnamed';
  }

  return cleanedTitle;
}

function createImportedPuzzle(title, categories, author) {
  return {
    title: title || 'Unnamed',
    author: author || 'Unkown',
    categories: CATEGORIES.map((cat, index) => ({
      ...cat,
      name: categories[index].name || `Category ${index + 1}`,
      words: categories[index].words
    }))
  };
}

function extractPuzzleFromNextData(nextData) {
  if (!nextData || !nextData.props || !nextData.props.pageProps) return null;

  const pageProps = nextData.props.pageProps;
  const answers = normalizeImportedCategories(pageProps.answers);
  if (!answers) return null;

  const metadata = pageProps.puzzleMetadata || {};
  return {
    title: firstString(metadata.title, pageProps.title) || 'Unnamed',
    author: firstString(metadata.author, pageProps.author) || 'Unkown',
    categories: answers
  };
}

function findCategoriesInData(value, seen) {
  if (!seen) seen = new WeakSet();

  const normalized = normalizeImportedCategories(value);
  if (normalized) return normalized;

  if (!value || typeof value !== 'object') return null;
  if (seen.has(value)) return null;
  seen.add(value);

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = findCategoriesInData(value[i], seen);
      if (found) return found;
    }
    return null;
  }

  const objectKeys = Object.keys(value);
  for (let i = 0; i < objectKeys.length; i++) {
    const found = findCategoriesInData(value[objectKeys[i]], seen);
    if (found) return found;
  }

  return null;
}

function normalizeImportedCategories(rawValue) {
  if (!Array.isArray(rawValue)) return null;

  if (rawValue.length >= 16 && rawValue.every(item => typeof item === 'string')) {
    const words = normalizeImportedWords(rawValue).slice(0, 16);
    if (words.length !== 16) return null;

    return CATEGORIES.map((cat, index) => ({
      name: `Category ${index + 1}`,
      words: words.slice(index * 4, (index + 1) * 4)
    }));
  }

  if (rawValue.length >= 4 && rawValue.every(item => Array.isArray(item))) {
    const categories = rawValue.slice(0, 4).map((group, index) => ({
      name: `Category ${index + 1}`,
      words: normalizeImportedWords(group).slice(0, 4)
    }));

    if (categories.every(category => category.words.length === 4)) {
      return categories;
    }
  }

  if (rawValue.length >= 4 && rawValue.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
    const categories = rawValue.slice(0, 4).map((item, index) => {
      const name = firstString(item.name, item.title, item.label, item.category, item.description);
      const words = firstArray(item.words, item.items, item.cards, item.entries, item.terms, item.members);

      return {
        name: name || `Category ${index + 1}`,
        words: normalizeImportedWords(words).slice(0, 4)
      };
    });

    if (categories.every(category => category.words.length === 4)) {
      return categories;
    }
  }

  return null;
}

function extractCategoriesFromText(text) {
  const categorySegment = extractArraySegmentByKeys(text, ['categories', 'groups']);
  if (categorySegment) {
    const parsedCategories = tryParseJson(categorySegment);
    const normalizedCategories = findCategoriesInData(parsedCategories || []);
    if (normalizedCategories) return normalizedCategories;
  }

  const wordsSegment = extractArraySegmentByKeys(text, ['words', 'items', 'cards']);
  if (wordsSegment) {
    const parsedWords = tryParseJson(wordsSegment);
    const normalizedWords = normalizeImportedCategories(parsedWords || extractQuotedStrings(wordsSegment));
    if (normalizedWords) return normalizedWords;
  }

  const fallbackWords = extractQuotedStrings(text);
  if (fallbackWords.length >= 16) {
    return normalizeImportedCategories(fallbackWords.slice(0, 16));
  }

  return null;
}

function extractArraySegmentByKeys(text, keys) {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const patterns = [
      new RegExp(`(?:const|let|var)\\s+${key}\\s*=`, 'i'),
      new RegExp(`["']${key}["']\\s*:`, 'i'),
      new RegExp(`\\b${key}\\b\\s*:`, 'i'),
      new RegExp(`\\b${key}\\b\\s*=`, 'i')
    ];

    for (let j = 0; j < patterns.length; j++) {
      const match = patterns[j].exec(text);
      if (!match) continue;

      const arrayStart = text.indexOf('[', match.index);
      if (arrayStart === -1) continue;

      const segment = extractBalancedSegment(text, arrayStart, '[', ']');
      if (segment) return segment;
    }
  }

  return null;
}

function extractBalancedSegment(text, startIndex, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let stringQuote = '';
  let escaped = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === stringQuote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === openChar) depth++;
    if (char === closeChar) depth--;

    if (depth === 0) {
      return text.slice(startIndex, i + 1);
    }
  }

  return null;
}

function tryParseJson(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function extractQuotedStrings(text) {
  const results = [];
  const regex = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const value = match[1] || match[2] || '';
    const cleaned = value
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .trim();

    if (cleaned) results.push(cleaned);
  }

  return results;
}

function normalizeImportedWords(words) {
  if (!Array.isArray(words)) return [];

  return words
    .filter(word => typeof word === 'string')
    .map(word => word.trim())
    .filter(Boolean)
    .map(word => word.toUpperCase());
}

function firstString() {
  for (let i = 0; i < arguments.length; i++) {
    if (typeof arguments[i] === 'string' && arguments[i].trim()) {
      return arguments[i].trim();
    }
  }
  return '';
}

function firstArray() {
  for (let i = 0; i < arguments.length; i++) {
    if (Array.isArray(arguments[i])) {
      return arguments[i];
    }
  }
  return [];
}

function toggleWord(word) {
  const s = gameState;
  
  // Clear the feedback message as soon as the user starts changing their selection
  document.getElementById('msg').innerHTML = "";

  if (s.selected.includes(word)) {
    s.selected = s.selected.filter(w => w !== word);
  } else {
    if (s.selected.length < 4) {
        s.selected.push(word);
    } else {
        showToast("You can only select 4 words!");
    }
  }
  renderGame();
}

function submitGuess() {
  const s = gameState;
  const msgEl = document.getElementById('msg');
  
  if (s.selected.length !== 4) {
    showToast("Select 4 words first!");
    return;
  }

  // Get the category indices for the 4 selected words
  const selectedIndices = s.selected.map(word => 
    s.words.find(w => w.word === word).catIndex
  );
  
  // Count how many of each category are present
  const counts = {};
  selectedIndices.forEach(idx => {
    counts[idx] = (counts[idx] || 0) + 1;
  });

  const uniqueCats = Object.keys(counts);
  const maxInOneCat = Math.max(...Object.values(counts));

  if (maxInOneCat === 4) {
    // CORRECT GUESS
    const correctCatIndex = selectedIndices[0];
    s.solved.push(correctCatIndex);
    s.selected = [];
    msgEl.innerHTML = "Correct!";
    
    if (s.solved.length === 4) {
      setTimeout(() => {
          // Trigger your win celebration here
          if(typeof fireConfetti === 'function') fireConfetti(); 
          const winModal = document.getElementById('win-modal');
          if (winModal) winModal.style.display = 'flex';
      }, 500);
    }
  } else {
    // WRONG GUESS
    s.mistakes++;
    
    if (maxInOneCat === 3) {
        msgEl.innerHTML = '<span class="one-away">One away...</span>';
    } else {
        msgEl.innerHTML = "Not quite!";
    }

    if (s.mistakes >= 4) {
      // Instead of alert, show loss modal if you have it
      const lossModal = document.getElementById('loss-modal');
      if(lossModal) {
          lossModal.style.display = 'flex';
      } else {
          alert("Game Over! Better luck next time.");
          exitGame();
      }
    }
  }
  renderGame();
}

function fireConfetti() {
  const colors = ['#f9d71c', '#69b34c', '#4682b4', '#9370db', '#ff6347'];
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.classList.add('confetti');
    
    // Randomize appearance
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.width = Math.random() * 8 + 5 + 'px';
    confetti.style.height = confetti.style.width;
    
    // Randomize timing
    const duration = Math.random() * 2 + 2; // 2-4 seconds
    confetti.style.animationDuration = duration + 's';
    confetti.style.opacity = Math.random();
    
    document.body.appendChild(confetti);
    
    // Clean up the element after it falls
    setTimeout(() => {
      confetti.remove();
    }, duration * 1000);
  }
}

function handleWin(puzzleId) {
  // 1. Mark as solved in LocalStorage
  let solvedList = JSON.parse(localStorage.getItem('solved_puzzle_ids') || '[]');
  if (!solvedList.includes(puzzleId)) {
    solvedList.push(puzzleId);
    localStorage.setItem('solved_puzzle_ids', JSON.stringify(solvedList));
  }

  // 2. Trigger the animations!
  fireConfetti();

  // 3. Show the modal after a short delay so the confetti starts first
  setTimeout(function() {
    const winModal = document.getElementById('win-modal');
    if (winModal) winModal.style.display = 'flex';
  }, 700);
}

function handleMistake(foundCategories) {
    const s = gameState;
    s.mistakes++;
    
    // Check if they were "One Away" (3 out of 4 correct)
    let counts = {};
    for (let cat of foundCategories) {
        counts[cat] = (counts[cat] || 0) + 1;
    }
    
    let oneAway = false;
    for (let key in counts) {
        if (counts[key] === 3) oneAway = true;
    }

    if (oneAway) {
        document.getElementById('msg').innerHTML = '<span class="one-away">One away...</span>';
    } else {
        document.getElementById('msg').innerHTML = "Not quite!";
    }

   if (s.mistakes >= 4) {
    // Instead of an alert, show the loss modal
        setTimeout(function() {
            const lossModal = document.getElementById('loss-modal');
            if (lossModal) lossModal.style.display = 'flex';
        }, 100);
    }
}

function closeWinModal() {
    document.getElementById('win-modal').style.display = 'none';
    exitGame();
}

// Closes the loss modal and returns to the gallery
function closeLossModal() {
    const lossModal = document.getElementById('loss-modal');
    if (lossModal) lossModal.style.display = 'none';
    exitGame(); // Takes user back to the browse tab
}

// Allows the user to try the same puzzle again immediately
function restartCurrentPuzzle() {
    const lossModal = document.getElementById('loss-modal');
    if (lossModal) lossModal.style.display = 'none';
    
    // Reset the game state but keep the same puzzle
    const currentPuzzle = gameState.puzzle;
    const allWords = currentPuzzle.categories.flatMap((c, ci) => 
        c.words.map(w => ({ word: w, catIndex: ci }))
    );
    
    // Shuffle again for the new attempt
    for (let i = allWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
    }

    gameState = { 
        puzzle: currentPuzzle, 
        words: allWords, 
        selected: [], 
        solved: [], 
        mistakes: 0 
    };
    
    renderGame();
}

function exitGame() { switchTab('browse'); }

// Run the gallery render on start
renderGallery();
