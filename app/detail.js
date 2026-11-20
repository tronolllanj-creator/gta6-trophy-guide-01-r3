// Detail panel, roadmap view and spoiler masking for the trophy guide.

export function applySpoilerMask(name, description, hidden, isEarned, spoilerOn) {
  if (spoilerOn && hidden && !isEarned) {
    return {
      name: 'Hidden trophy — earn it to reveal',
      description: 'Hidden trophy — earn it to reveal',
    };
  }
  return { name, description };
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function showDetail(trophy, all, earnedSet, spoilerOn, onNavigate, onToggleEarned) {
  const panel = document.getElementById('detail');
  panel.hidden = false;
  panel.innerHTML = '';
  if (!trophy) {
    panel.appendChild(el('p', 'Trophy not found.'));
    return;
  }
  const isEarned = earnedSet.has(trophy.name);
  const shown = applySpoilerMask(trophy.name, trophy.description, trophy.hidden, isEarned, spoilerOn);
  const idx = all.indexOf(trophy);

  const head = el('h2', shown.name);
  const badge = el('span', trophy.grade, 'badge grade-' + trophy.grade);
  head.appendChild(document.createTextNode(' '));
  head.appendChild(badge);
  panel.appendChild(head);
  panel.appendChild(el('p', shown.description));
  const kindRow = el('div', undefined, 'chips');
  kindRow.appendChild(el('span', trophy.kind, 'chip'));
  if (trophy.missable) kindRow.appendChild(el('span', 'Missable', 'chip missable'));
  panel.appendChild(kindRow);
  if (trophy.guide) panel.appendChild(el('p', trophy.guide, 'guide'));

  if (trophy.steps && trophy.steps.length) {
    const ol = el('ol');
    trophy.steps.forEach((s) => ol.appendChild(el('li', s)));
    panel.appendChild(ol);
  }
  panel.appendChild(el('p', 'Source: ' + trophy.source, 'source'));
  if (trophy.missable && trophy.missable_reason) {
    panel.appendChild(el('p', 'Missable: ' + trophy.missable_reason, 'missable-note'));
  }

  const nav = el('div', undefined, 'detail-nav');
  const prev = el('button', '← Prev');
  prev.disabled = idx <= 0;
  prev.addEventListener('click', () => onNavigate(idx - 1));
  const next = el('button', 'Next →');
  next.disabled = idx >= all.length - 1;
  next.addEventListener('click', () => onNavigate(idx + 1));
  nav.append(prev, next);
  panel.appendChild(nav);

  const label = el('label', undefined, 'earned-wrap');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.addEventListener('change', () => onToggleEarned(trophy.name, box.checked));
  label.append(box, document.createTextNode(' Earned'));
  panel.appendChild(label);
}

export function showRoadmap(roadmap, trophies, earnedSet) {
  const panel = document.getElementById('roadmapPanel');
  panel.hidden = false;
  panel.innerHTML = '';
  if (!roadmap) {
    panel.appendChild(el('p', 'Roadmap not loaded.'));
    return;
  }
  const title = el('h2', roadmap.title || 'Roadmap to the Platinum');
  panel.appendChild(title);

  roadmap.stages.forEach((stage) => {
    const sec = el('section');
    sec.appendChild(el('h3', 'Stage ' + stage.stage + ': ' + stage.title));
    sec.appendChild(el('p', stage.summary));
    if (stage.notes) sec.appendChild(el('p', stage.notes));
    const chips = el('div', undefined, 'stage-chips');
    stage.trophies.forEach((name) => {
      const t = trophies.find((x) => x.name === name);
      if (!t) return;
      chips.appendChild(el('span', t.name, 'chip' + (earnedSet.has(t.name) ? ' earned' : '')));
    });
    sec.appendChild(chips);
    panel.appendChild(sec);
  });

  if (roadmap.missable_first && roadmap.missable_first.length) {
    const sec = el('section');
    sec.appendChild(el('h3', 'Do these missables first'));
    const list = el('ul');
    roadmap.missable_first.forEach((name) => list.appendChild(el('li', name)));
    sec.appendChild(list);
    panel.appendChild(sec);
  }
}
