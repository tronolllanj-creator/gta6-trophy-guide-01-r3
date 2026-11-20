import { showDetail, showRoadmap, applySpoilerMask } from './detail.js';

const STORAGE_KEY = 'gta6-trophy-guide-01-progress-v1';

let trophies = [];
let roadmap = null;
const earned = new Set();
let spoilersOn = false;
let view = 'checklist';
let detailIndex = 0;

const el = (id) => document.getElementById(id);

async function loadData() {
  const [trophyRes, roadmapRes] = await Promise.all([
    fetch('data/trophies.json'),
    fetch('data/roadmap.json'),
  ]);
  trophies = (await trophyRes.json()).trophies;
  roadmap = (await roadmapRes.json()).roadmap;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    (saved.earned || []).forEach((name) => earned.add(name));
    spoilersOn = saved.spoiler === true;
  } catch {
    // Corrupt save: start fresh rather than crash the guide.
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    earned: Array.from(earned),
    spoiler: spoilersOn,
  }));
}

function setEarned(name, on) {
  if (on) earned.add(name);
  else earned.delete(name);
  saveProgress();
  render();
}

function matchesFilters(t) {
  const q = el('search').value.trim().toLowerCase();
  if (q && ![t.name, t.description, t.guide].some((s) => (s || '').toLowerCase().includes(q))) return false;
  const kind = el('kind').value;
  if (kind === 'missable' && !t.missable) return false;
  if (kind === 'online') return false; // No trophy in this list needs online play.
  if (kind !== 'all' && kind !== 'missable' && t.kind !== kind) return false;
  const grade = el('grade').value;
  if (grade !== 'all' && t.grade !== grade) return false;
  if (el('hideEarned').checked && earned.has(t.name)) return false;
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  el('progress').textContent = done + ' of ' + total + ' earned';
  el('gradeCounts').textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => {
      const all = trophies.filter((t) => t.grade === g).length;
      const got = trophies.filter((t) => t.grade === g && earned.has(t.name)).length;
      return got + '/' + all + ' ' + g;
    })
    .join('  ·  ');
  const fill = document.querySelector('#progressBar .fill');
  if (fill) fill.style.width = (total ? (done / total) * 100 : 0) + '%';
}

function trophyCard(t, idx) {
  const isEarned = earned.has(t.name);
  const shown = applySpoilerMask(t.name, t.description, t.hidden, isEarned, spoilersOn);
  const card = document.createElement('article');
  card.className = 'trophy grade-' + t.grade + (isEarned ? ' is-earned' : '');
  const badge = document.createElement('span');
  badge.className = 'badge grade-' + t.grade;
  badge.textContent = t.grade;
  const title = document.createElement('h3');
  title.textContent = shown.name;
  const desc = document.createElement('p');
  desc.textContent = shown.description;
  const chips = document.createElement('div');
  chips.className = 'chips';
  const kindChip = document.createElement('span');
  kindChip.className = 'chip';
  kindChip.textContent = t.kind;
  chips.appendChild(kindChip);
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'chip missable';
    m.textContent = 'Missable';
    chips.appendChild(m);
  }
  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = t.guide;
  const steps = document.createElement('ol');
  (t.steps || []).forEach((s) => {
    const li = document.createElement('li');
    li.textContent = s;
    steps.appendChild(li);
  });
  const source = document.createElement('p');
  source.className = 'source';
  source.textContent = 'Source: ' + t.source;
  const label = document.createElement('label');
  label.className = 'earned-wrap';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.addEventListener('change', () => setEarned(t.name, box.checked));
  label.appendChild(box);
  label.appendChild(document.createTextNode(' Earned'));
  card.append(badge, title, desc, chips, guide);
  if ((t.steps || []).length) card.append(steps);
  card.append(source, label);
  card.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT') return;
    detailIndex = idx;
    view = 'guide';
    render();
  });
  return card;
}

function renderList() {
  const list = el('list');
  list.innerHTML = '';
  trophies.forEach((t, idx) => {
    if (matchesFilters(t)) list.appendChild(trophyCard(t, idx));
  });
  if (!list.children.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No trophies match these filters.';
    list.appendChild(empty);
  }
}

function render() {
  el('list').style.display = view === 'checklist' ? '' : 'none';
  el('roadmapPanel').style.display = view === 'roadmap' ? '' : 'none';
  el('detail').style.display = view === 'guide' ? '' : 'none';
  if (view === 'checklist') {
    renderList();
    renderProgress();
  } else if (view === 'roadmap') {
    showRoadmap(roadmap, trophies, earned);
    renderProgress();
  } else if (view === 'guide') {
    showDetail(
      trophies[detailIndex], trophies, earned, spoilersOn,
      (i) => { detailIndex = Math.max(0, Math.min(trophies.length - 1, i)); render(); },
      (name, on) => setEarned(name, on),
    );
  }
}

function wireToolbar() {
  el('search').addEventListener('input', render);
  el('kind').addEventListener('change', render);
  el('grade').addEventListener('change', render);
  el('hideEarned').addEventListener('change', render);
  el('spoilerBtn').addEventListener('click', () => {
    spoilersOn = !spoilersOn;
    el('spoilerBtn').textContent = spoilersOn ? 'Hide spoilers' : 'Show spoilers';
    el('spoilerBtn').setAttribute('aria-pressed', String(spoilersOn));
    saveProgress();
    render();
  });
  el('roadmapBtn').addEventListener('click', () => { view = 'roadmap'; render(); });
  el('checklistBtn').addEventListener('click', () => { view = 'checklist'; render(); });
  el('export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ earned: Array.from(earned), spoiler: spoilersOn }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  el('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        earned.clear();
        (data.earned || []).forEach((n) => earned.add(n));
        spoilersOn = data.spoiler === true;
        el('spoilerBtn').textContent = spoilersOn ? 'Hide spoilers' : 'Show spoilers';
        el('spoilerBtn').setAttribute('aria-pressed', String(spoilersOn));
        saveProgress();
        render();
      } catch {
        // Bad import file: keep the current progress.
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
}

function applyParams() {
  const params = new URLSearchParams(location.search);
  if (params.get('search')) el('search').value = params.get('search');
  if (params.get('kind')) el('kind').value = params.get('kind');
  if (params.get('grade')) el('grade').value = params.get('grade');
  if (params.get('spoilers') === '1') {
    spoilersOn = true;
    el('spoilerBtn').textContent = 'Hide spoilers';
    el('spoilerBtn').setAttribute('aria-pressed', 'true');
  }
  if (params.get('view') === 'roadmap' || params.get('view') === 'guide') view = params.get('view');
  const trophyParam = params.get('trophy');
  if (trophyParam !== null) {
    const asInt = parseInt(trophyParam, 10);
    if (!Number.isNaN(asInt) && asInt >= 0 && asInt < trophies.length) {
      detailIndex = asInt;
    } else {
      const found = trophies.findIndex((t) => t.name.toLowerCase().includes(trophyParam.toLowerCase()));
      detailIndex = found >= 0 ? found : 0;
    }
  }
  if (params.get('demo') === '1') {
    trophies.filter((t) => t.kind === 'story').slice(0, 6).forEach((t) => earned.add(t.name));
    saveProgress();
  }
}

window.onerror = (msg) => { window.__shotError = String(msg); };

async function boot() {
  await loadData();
  loadProgress();
  wireToolbar();
  applyParams();
  render();
  window.__shotReady = true;
}

boot();
