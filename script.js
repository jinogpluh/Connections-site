const CATEGORIES = [
  { key:'c1', label:'Yellow', color:'var(--c1)', dark:'var(--c1-dark)' },
  { key:'c2', label:'Green',  color:'var(--c2)', dark:'var(--c2-dark)' },
  { key:'c3', label:'Blue',   color:'var(--c3)', dark:'var(--c3-dark)' },
  { key:'c4', label:'Purple', color:'var(--c4)', dark:'var(--c4-dark)' },
];

let puzzles = JSON.parse(localStorage.getItem('connections_puzzles') || '[]');
let builderData = CATEGORIES.map(c => ({ ...c, name: '', words: [] }));
let gameState = null;

function showModal(title, message) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent = message;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function switchTab(tab) {
  document.getElementById('tab-browse').classList.toggle('active', tab === 'browse');
  document.getElementById('tab-create').classList.toggle('active', tab === 'create');
  document.getElementById('browse-view').classList.toggle('active', tab === 'browse');
  document.getElementById('create-view').classList.toggle('active', tab === 'create');
  document.getElementById('game-view').classList.remove('active');
  if (tab === 'browse') renderGallery();
  if (tab === 'create') renderBuilder();
}

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function renderGallery() {
  const el = document.getElementById('gallery-container');
  if (!puzzles.length) {
    el.innerHTML = `<div class="gallery-empty">No puzzles found. Create one!</div>`;
    return;
  }
  el.innerHTML = `<div class="puzzle-cards">${puzzles.map((p,i) => `
    <div class="puzzle-card">
      <h3>${esc(p.title)}</h3>
      <p>by ${esc(p.author || 'Anonymous')}</p>
      <div class="puzzle-card-footer">
        <button onclick="deletePuzzle(${i})" style="border:none; background:none; color:red; cursor:pointer;">Delete</button>
        <button onclick="playPuzzle(${i})" style="background:var(--ink); color:#fff; border:none; padding:5px 10px; cursor:pointer;">Play</button>
      </div>
    </div>
  `).join('')}</div>`;
}

function deletePuzzle(i) {
  if(confirm('Delete?')) { 
    puzzles.splice(i,1); 
    localStorage.setItem('connections_puzzles', JSON.stringify(puzzles)); 
    renderGallery(); 
  }
}

function renderBuilder() {
  const grid = document.getElementById('categories-grid');
  grid.innerHTML = builderData.map((cat, ci) => `
    <div class="cat-card">
      <div class="cat-header" style="background:${cat.color}">
        <input type="text" placeholder="Category Name" value="${esc(cat.name)}" oninput="builderData[${ci}].name=this.value">
      </div>
      <div class="cat-words">
        <ul class="word-list">${cat.words.map((w,wi) => `<li class="word-item">${esc(w)} <button onclick="builderData[${ci}].words.splice(${wi},1);renderBuilder()">×</button></li>`).join('')}</ul>
        <div class="add-word-row">
          <input type="text" id="in-${ci}" placeholder="Word..." onkeydown="if(event.key==='Enter')addWord(${ci})">
          <button onclick="addWord(${ci})">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

function addWord(ci) {
  const inp = document.getElementById(`in-${ci}`);
  const val = inp.value.trim().toUpperCase();
  if(!val || builderData[ci].words.length >= 4) return;
  builderData[ci].words.push(val);
  inp.value = ''; renderBuilder();
}

function savePuzzle() {
  const title = document.getElementById('puzzle-title').value;
  const author = document.getElementById('puzzle-author').value;
  if(!title || builderData.some(c => c.words.length < 4)) { showToast('Complete all fields first!'); return; }
  puzzles.push({title, author, categories: JSON.parse(JSON.stringify(builderData))});
  localStorage.setItem('connections_puzzles', JSON.stringify(puzzles));
  builderData.forEach(c => {c.name=''; c.words=[]});
  switchTab('browse');
}

function playPuzzle(i) {
  const p = puzzles[i];
  const allWords = p.categories.flatMap((c, ci) => c.words.map(w => ({word:w, catIndex:ci})));
  for (let j = allWords.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [allWords[j], allWords[k]] = [allWords[k], allWords[j]];
  }
  gameState = { puzzle: p, words: allWords, selected: [], solved: [], mistakes: 0 };
  document.getElementById('browse-view').classList.remove('active');
  document.getElementById('game-view').classList.add('active');
  renderGame();
}

function renderGame() {
  const s = gameState;
  const container = document.getElementById('game-container');
  const remaining = s.words.filter(w => !s.solved.includes(w.catIndex));
  
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

  container.innerHTML = `
    <div class="mistakes-row">Mistakes: ${'●'.repeat(4 - s.mistakes)}${'○'.repeat(s.mistakes)}</div>
    ${solvedHTML}
    <div class="word-grid">${tilesHTML}</div>
    <div class="game-actions" style="text-align:center; margin-top:20px;">
        <button class="btn-game submit" onclick="submitGuess()">Submit Guess</button>
    </div>
    <div id="msg" style="text-align:center; margin-top:10px; min-height:20px;"></div>
  `;
}

function toggleWord(word) {
  const s = gameState;
  if (s.selected.includes(word)) {
    s.selected = s.selected.filter(w => w !== word);
  } else {
    if (s.selected.length < 4) s.selected.push(word);
    else showToast("You can only select 4 words!");
  }
  renderGame();
}

function submitGuess() {
  const s = gameState;
  if (s.selected.length !== 4) {
    showToast("Select 4 words first!");
    return;
  }

  const selectedIndices = s.selected.map(word => 
    s.words.find(w => w.word === word).catIndex
  );
  
  const uniqueCats = [...new Set(selectedIndices)];

  if (uniqueCats.length === 1) {
    s.solved.push(uniqueCats[0]);
    s.selected = [];
    document.getElementById('msg').innerHTML = "Correct!";
    if (s.solved.length === 4) {
      setTimeout(() => alert("Congratulations! Puzzle Solved!"), 100);
    }
  } else {
    s.mistakes++;
    if (uniqueCats.length === 2) {
        const counts = {};
        selectedIndices.forEach(idx => counts[idx] = (counts[idx] || 0) + 1);
        if (Object.values(counts).includes(3)) {
            document.getElementById('msg').innerHTML = '<span class="one-away">One away...</span>';
        } else {
            document.getElementById('msg').innerHTML = "Not quite!";
        }
    } else {
        document.getElementById('msg').innerHTML = "Not quite!";
    }

    if (s.mistakes >= 4) {
      alert("Game Over! Better luck next time.");
      exitGame();
    }
  }
  renderGame();
}

function exitGame() { switchTab('browse'); }

// Initial render
renderGallery();