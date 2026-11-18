import './style.css';
import { drawBoard, portrait, storefront } from './art';
import { ShopAudio } from './audio';
import { Round, type Result } from './engine';
import { defaults, loadRecords, loadSettings, save, type Settings } from './prefs';
import { HEIGHT, WIDTH, stages, type Point } from './stages';

type Screen = 'title' | 'select' | 'intro' | 'play' | 'result' | 'ending' | 'total';
type Modal = '' | 'tutorial' | 'pause' | 'settings' | 'confirm';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = '<main id="screen"></main><div id="overlay"></div>';
const page = document.querySelector<HTMLElement>('#screen')!;
const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const audio = new ShopAudio();
const records = loadRecords();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let prefs = loadSettings();
let screen: Screen = 'title';
let modal: Modal = '';
let parentModal: Modal = '';
let stageIndex = 0;
let journey = false;
let results: Result[] = [];
let briefing = false;
let bestUpdates: string[] = [];
let result: Result | null = null;
let round: Round | null = null;
let lastFocus: HTMLElement | null = null;
let pauseFocus = 'resume';
let board: HTMLCanvasElement | null = null;
let boardNodes: Record<string, HTMLElement> = {};
let faceCanvas: HTMLCanvasElement | null = null;
let pointer: { id: number; offset: Point } | null = null;
let touch = false;
let lastFrame = performance.now();
let hintAge = -10;
let hintIndex = -1;
let clue = '';
let lastMood = '';
let goUntil = 0;

const btn = (label: string, action: string, cls = '', attrs = '') =>
  '<button type="button" class="button ' + cls + '" data-action="' + action + '" ' + attrs + '>' + label + '</button>';
const face = (i: number, happy = false) =>
  '<canvas class="portrait" aria-hidden="true" width="180" height="180" data-face="' + i + '" data-happy="' + happy + '"></canvas>';
const stars = (n: number) => '<span class="stars" aria-label="星 ' + n + ' / 3"><span aria-hidden="true">' +
  '★'.repeat(n) + '☆'.repeat(3 - n) + '</span></span>';
const stat = (label: string, value: string) => '<div><dt>' + label + '</dt><dd>' + value + '</dd></div>';
const head = (label: string, title: string) =>
  '<header class="section-head"><div class="section-label">' + label + '</div><h1 tabindex="-1">' + title + '</h1></header>';

function change(next: Screen) {
  endPointer();
  screen = next;
  modal = '';
  parentModal = '';
  lastFocus = null;
  briefing = false;
  drawScreen();
  drawModal(false);
  if (next !== 'play') page.querySelector('h1')?.focus({ preventScroll: true });
}

function drawScreen() {
  const stage = stages[stageIndex];
  page.className = screen;
  board = null;
  faceCanvas = null;
  switch (screen) {
    case 'title':
      page.innerHTML = `<div class="title-layout">
        <section class="title-copy">
          <div class="shop-mark"><span aria-hidden="true">✦</span> 夜の商店街の たすけ屋さん</div>
          <h1 tabindex="-1" class="wordmark"><span>そこそこ！</span><strong>孫の手<span>急便</span></strong></h1>
          <p class="tagline">あとちょっとに、手がとどく。</p>
          <div class="title-actions">
            ${btn('ゲームを はじめる <span aria-hidden="true">→</span>', 'campaign', 'primary')}
            ${btn('ステージを えらぶ', 'select', 'wide')}
            ${btn('あそびかた', 'help')}${btn('せってい', 'settings')}
          </div>
          <p class="credit">ゲーム制作 <b>果糖</b></p>
        </section>
        <figure class="hero"><canvas width="1140" height="945" class="storefront" role="img" aria-label="夜の商店街。朱色ののれんを掛けた孫の手急便でタヌキ店長が出迎える"></canvas>
          <figcaption><span class="lamp"></span> 閉店まで、あとひと仕事！</figcaption>
        </figure>
      </div>`;
      storefront(page.querySelector('canvas')!);
      break;
    case 'select':
      page.innerHTML = '<section class="sheet select-sheet">' + head('コース', 'ステージを えらぶ') +
        '<div class="select-list">' + stages.map((s, i) => {
          const best = records[i];
          const locked = i > 0 && !records[i - 1].stars;
          return `<article class="stage-choice" style="--stage:${s.accent}">
            ${face(i, !!best.stars)}
            <div><div class="section-label">第 ${i + 1} 面</div><h2>${s.name}</h2>
              ${locked ? '<p>前の面を クリアすると あそべます</p>' :
                '<p>' + stars(best.stars) + ' <span>最速 ' + (best.time === null ? '—' : best.time + '秒') +
                ' ・ ' + best.score.toLocaleString('ja-JP') + '点</span></p>'}
            </div>${btn(locked ? '未開放' : 'あそぶ →', 'single-' + i, locked ? '' : 'primary', locked ? 'disabled' : '')}
          </article>`;
        }).join('') + '</div>' + btn('← タイトルへ', 'title') + '</section>';
      break;
    case 'intro':
      page.innerHTML = `<section class="sheet dispatch" style="--stage:${stage.accent}">
        ${head('第 ' + (stageIndex + 1) + ' 面 / 全 3 面', stage.name)}
        <div class="customer-card">${face(stageIndex)}
          <div><div class="section-label">${stage.customer}</div><blockquote>「${stage.line}」</blockquote></div>
        </div>
        ${prefs.hints ? '<div class="stage-tip"><span aria-hidden="true">✦</span> ' + stage.tip + '</div>' : ''}
        <dl class="metrics">${stat('かゆいところ', stage.targets.length + 'か所')}${stat('時間制限', prefs.timed ? stage.limit + '秒' : 'なし')}${stat('★2 タイム', stage.silver + '秒')}</dl>
        <div class="actions">${btn('はじめる →', 'start', 'primary')}${btn(journey ? 'タイトルへ' : 'ステージを えらぶ', journey ? 'title' : 'select')}</div>
      </section>`;
      break;
    case 'play':
      page.innerHTML = `<section class="arcade">
        <div class="hud">
          <div class="hud-count"><span>第 ${stageIndex + 1} 面</span><b id="remaining"></b></div>
          <div class="hud-time"><span id="time-label"></span><b id="clock"></b></div>
          ${btn('Ⅱ ポーズ', 'pause', 'pause-btn')}
        </div>
        <aside class="customer-line">${face(stageIndex)}
          <div><div class="section-label">${stage.customer}</div><div id="hint" aria-live="polite"></div></div>
          <div class="progress" id="progress" aria-label="往復の進み具合"></div>
        </aside>
        <div class="board-wrap">
          <canvas id="board" width="960" height="820" aria-label="孫の手の操作エリア。丸い入口に触れたまま移動します"></canvas>
          <div class="countdown" id="countdown" aria-live="polite"></div>
        </div>
        <div class="play-footer"><span id="board-status"></span>${btn('↶ 手を ひく', 'retract', 'retract', 'id="retract"')}</div>
      </section>`;
      board = page.querySelector('#board');
      faceCanvas = page.querySelector('.customer-line canvas');
      boardNodes = Object.fromEntries([...page.querySelectorAll<HTMLElement>('[id]')].map(node => [node.id, node]));
      bindBoard(board!);
      break;
    case 'result': {
      const r = result!;
      const goal = !r.cleared ? 'あと ' + (r.total - r.solved) + 'か所。入口や通り道を かえてみよう！'
        : r.stars < 2 ? 'あと ' + (r.seconds - stage.silver) + '秒で ★2！'
        : r.stars < 3 ? '次は「そこそこ！」の場所で そのまま 2往復！'
        : 'おみごと！ 近道で じこベストを ねらおう。';
      page.innerHTML = `<section class="sheet results">
        ${head('第 ' + (stageIndex + 1) + ' 面の結果', r.cleared ? 'かゆみ、すっきり！' : '時間ぎれ！')}
        <div class="result-banner">${face(stageIndex, r.cleared)}${stars(r.stars)}</div>
        <dl class="metrics">${stat('すっきり', r.solved + ' / ' + r.total + 'か所')}${stat('タイム', r.seconds + '秒')}${stat('スコア', r.points.toLocaleString('ja-JP') + '点')}</dl>
        ${bestUpdates.length ? '<p class="record-update">✦ 自己ベスト更新　' + bestUpdates.join('・') + '</p>' : ''}
        <p class="next-goal">${goal}</p>
        <div class="actions">
          ${r.cleared && journey ? btn(stageIndex === 2 ? '閉店へ →' : 'つぎへ →', 'next', 'primary') : ''}
          ${btn('もう一回', 'retry', r.cleared && journey ? '' : 'primary')}
          ${!journey ? btn('ステージを えらぶ', 'select') : ''}
          ${btn('タイトルへ', 'title')}
        </div>
      </section>`;
      break;
    }
    case 'ending':
      page.innerHTML = `<section class="sheet closing">
          ${head('閉店のじかん', '本日の営業、おしまい')}
          <div class="closed-sign">本日<br><strong>かゆみゼロ</strong></div>
          <div class="customer-card">${face(2, true)}<p>店長「これで みんな、すっきりじゃ！」</p></div>
          <p>背中に手を伸ばす新人。指先が、あと少し届きません。</p>
          <blockquote>「……店長、もう1件いいですか？」</blockquote>
          ${btn('総合結果へ →', 'total', 'primary')}
        </section>`;
      break;
    case 'total':
      page.innerHTML = `<section class="sheet results">
        ${head('本日の営業記録', 'みんな、すっきり！')}
        <div class="total-faces">${results.map((r, i) => '<div>' + face(i, true) +
          '<b>第 ' + (i + 1) + ' 面</b>' + stars(r.stars) + '</div>').join('')}</div>
        <dl class="metrics total-score">${stat('合計スコア', results.reduce((n, r) => n + r.points, 0).toLocaleString('ja-JP') + '点')}</dl>
        <div class="actions">${btn('もう一度 あそぶ', 'again', 'primary')}${btn('ステージを えらぶ', 'select')}${btn('タイトルへ', 'title')}</div>
      </section>`;
      break;
  }
  for (const canvas of page.querySelectorAll<HTMLCanvasElement>('canvas[data-face]')) {
    portrait(canvas, Number(canvas.dataset.face), canvas.dataset.happy === 'true' ? 'happy' : 'worried');
  }
}

function openModal(next: Modal) {
  if (!modal) lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (modal === 'pause' && document.activeElement instanceof HTMLElement) pauseFocus = document.activeElement.dataset.action ?? 'resume';
  endPointer();
  modal = next;
  drawModal();
}

function returnFromModal() {
  if (briefing && modal === 'tutorial') {
    change('title');
    return;
  }
  modal = parentModal;
  parentModal = '';
  drawModal(false);
  (modal === 'pause' ? overlay.querySelector<HTMLElement>('[data-action="' + pauseFocus + '"]')
    : lastFocus)?.focus({ preventScroll: true });
}

function drawModal(focus = true) {
  page.inert = !!modal;
  overlay.hidden = !modal;
  if (!modal) {
    overlay.innerHTML = '';
    return;
  }

  let title = '';
  let content = '';
  if (modal === 'tutorial') {
    title = 'あそびかた';
    content = `<ol class="instructions">
      <li><div class="instruction-icon entry-icon" aria-hidden="true">➜</div><div><b>手を いれる</b><p>丸い入口を おしたまま、孫の手を うごかす。</p></div></li>
      <li><div class="instruction-icon search-icon" aria-hidden="true"><span>?</span></div><div><b>かゆいところを さがす</b><p>「もうすこし 右」など、お客さんの声を たよりに。</p></div></li>
      <li><div class="instruction-icon scratch-icon" aria-hidden="true"><span>↔</span><i></i><em>● ●</em></div><div><b>その場で 2往復</b><p>「そこそこ！」が出たら、小さく 行って もどる。これを 2回！</p></div></li>
    </ol><p class="dialog-note">手を はなしても 止まるだけ。先を つかみなおせます。</p>
    <div class="actions">${briefing ? btn('わかった！ はじめる', 'understood', 'primary') : ''}
    ${btn(briefing ? 'タイトルへ' : '← もどる', 'back-modal')}</div>`;
  } else if (modal === 'pause') {
    title = 'ひと休み';
    content = '<div class="pause-menu">' + btn('つづける →', 'resume', 'primary') +
      btn('そうさ・ルール', 'help') + btn('せってい', 'settings') + btn('さいしょから', 'restart') +
      btn('タイトルへ', 'confirm-title') + '</div>';
  } else if (modal === 'confirm') {
    title = 'タイトルに もどる？';
    content = '<p>いまのプレイは ここで終わります。</p><div class="actions">' +
      btn('タイトルへ', 'title', 'primary') + btn('← もどる', 'back-modal') + '</div>';
  } else {
    title = 'せってい';
    const volume = (key: 'music' | 'effects', label: string) => `<label class="setting range">
      <span>${label}</span><output for="${key}">${prefs[key]}%</output>
      <input type="range" id="${key}" data-key="${key}" min="0" max="100" value="${prefs[key]}"></label>`;
    const toggle = (key: 'hints' | 'timed' | 'shake' | 'large', label: string, on = 'あり', off = 'なし') =>
      '<label class="setting toggle"><span>' + label + '</span><span>' +
      '<input type="checkbox" data-key="' + key + '"' + (prefs[key] ? ' checked' : '') + '> ' +
      '<span data-on="' + on + '" data-off="' + off + '">' + (prefs[key] ? on : off) + '</span></span></label>';
    content = '<div class="setting-list">' + volume('music', 'おんがく') + volume('effects', 'こうかおん・声') +
      toggle('hints', 'ヒント') + toggle('timed', '時間制限') +
      '<p class="dialog-note">時間制限は 次の面か、やり直したときから 変わります。</p>' +
      toggle('shake', '画面の ゆれ') + toggle('large', '文字の 大きさ', '大きい', 'ふつう') +
      '</div><div class="actions">' + btn('← もどる', 'back-modal', 'primary') +
      btn('もとに もどす', 'reset-settings') + '</div>';
  }

  overlay.innerHTML = '<section class="dialog sheet" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    '<h2 id="dialog-title" tabindex="-1">' + title + '</h2>' + content + '</section>';
  if (focus) overlay.querySelector('h2')?.focus({ preventScroll: true });
}

function applyPrefs() {
  document.documentElement.classList.toggle('large', prefs.large);
  document.documentElement.classList.toggle('still', !prefs.shake);
  audio.levels(prefs.music, prefs.effects);
}

function startRound() {
  round = new Round(stages[stageIndex], prefs.timed, event => audio.play(event));
  result = null;
  touch = false;
  hintAge = -10;
  hintIndex = -1;
  clue = '';
  lastMood = '';
  goUntil = 0;
  lastFrame = performance.now();
  change('play');
  syncPlay(round, lastFrame);
  audio.play('tick');
}

function beginJourney(tutorial: boolean) {
  journey = true;
  results = [];
  stageIndex = 0;
  if (tutorial) {
    briefing = true;
    openModal('tutorial');
  } else {
    change('intro');
  }
}

function finishRound(r: Result) {
  result = r;
  const best = records[stageIndex];
  bestUpdates = [];
  if (r.stars > best.stars) {
    best.stars = r.stars;
    bestUpdates.push('★');
  }
  if (r.cleared && (best.time === null || r.seconds < best.time)) {
    best.time = r.seconds;
    bestUpdates.push('タイム');
  }
  if (r.points > best.score) {
    best.score = r.points;
    bestUpdates.push('スコア');
  }
  save('records', records);
  if (journey && r.cleared) results[stageIndex] = r;
  change('result');
}

function endPointer() {
  const id = pointer?.id;
  pointer = null;
  if (id !== undefined && board?.hasPointerCapture(id)) board.releasePointerCapture(id);
}

function bindBoard(canvas: HTMLCanvasElement) {
  const coords = (e: PointerEvent): Point => {
    const box = canvas.getBoundingClientRect();
    return { x: (e.clientX - box.left) / box.width * WIDTH, y: (e.clientY - box.top) / box.height * HEIGHT };
  };

  canvas.addEventListener('pointerdown', e => {
    if (screen !== 'play' || modal || !round || round.countdown > 0 || pointer || e.button !== 0) return;
    const p = coords(e);
    const tapping = e.pointerType !== 'mouse';
    if (!round.tip) {
      const entry = round.stage.entries.find(a => Math.hypot(a.x - p.x, a.y - p.y) < (tapping ? 36 : 27) ||
        (Math.abs(a.x - p.x) < 38 && Math.abs(a.y - 32 - p.y) < 13));
      if (!entry) return;
      round.place(entry);
      audio.play('tap');
    } else {
      const offset = touch ? 29 : 0;
      const { x, y } = round.tip;
      if (Math.min(Math.hypot(x - p.x, y - p.y), Math.hypot(x - p.x, y + offset - p.y)) > (tapping ? 40 : 26)) return;
    }
    e.preventDefault();
    touch = tapping;
    const tip = round.tip!;
    const offsetY = p.y - tip.y;
    pointer = { id: e.pointerId, offset: { x: p.x - tip.x, y: tapping && Math.abs(offsetY) < 18 ? 29 : offsetY } };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (!pointer || pointer.id !== e.pointerId || modal || !round) return;
    const p = coords(e);
    round.move({ x: p.x - pointer.offset.x, y: p.y - pointer.offset.y });
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    canvas.addEventListener(event, e => { if (pointer?.id === e.pointerId) endPointer(); });
  }
}

function nextHint(r: Round) {
  const t = r.target;
  const p = r.tip;
  if (!t || !p) return t?.clue ?? '';
  const dx = t.x - p.x;
  const dy = t.y - p.y;
  const near = Math.hypot(dx, dy) < 44 ? 'おしい！ ' : 'もうすこし ';
  if (Math.abs(dx) > Math.abs(dy) * 1.05) return near + (dx > 0 ? '右 →' : '左 ←');
  return near + (dy > 0 ? '下 ↓' : '上 ↑');
}

function textOf(id: string, text: string) {
  if (boardNodes[id].textContent !== text) boardNodes[id].textContent = text;
}

function syncPlay(r: Round, now: number) {
  if (!board) return;
  const playing = r.countdown <= 0;
  const remaining = Math.max(0, Math.ceil(r.stage.limit - r.time));
  const value = r.timed ? remaining : Math.floor(r.time);
  textOf('remaining', 'あと ' + (r.stage.targets.length - r.solved) + 'か所');
  textOf('time-label', r.timed ? 'のこり' : 'けいか');
  textOf('clock', String(value).padStart(2, '0') + ' 秒');
  boardNodes.clock.classList.toggle('urgent', r.timed && remaining <= 10);
  const happy = r.waiting;
  const mood = happy ? 'happy' : (r.scratch.active || clue.startsWith('おしい')) && prefs.hints ? 'near' : 'worried';
  if (mood !== lastMood && faceCanvas) {
    portrait(faceCanvas, stageIndex, mood);
    lastMood = mood;
  }

  if (r.solved !== hintIndex || r.time - hintAge > 0.61) {
    clue = nextHint(r);
    hintIndex = r.solved;
    hintAge = r.time;
  }

  textOf('hint', !playing ? r.stage.line : happy ? 'ふう〜、すっきり！' :
    r.scratch.active ? 'そこそこ！ 小さく 2往復！' : prefs.hints ? clue : 'どこかな？');
  const count = happy ? 2 : r.scratch.count;
  textOf('progress', '●'.repeat(count) + '○'.repeat(2 - count));
  textOf('board-status', !playing ? 'もうすぐ スタート' : !r.tip ? '丸い入口を おしたまま うごかす' :
    happy ? 'すっきり！' : r.scratch.active ? '← 行って もどる →' : '先を つかみなおせます');
  (boardNodes.retract as HTMLButtonElement).disabled = !playing || !r.tip || happy;

  if (!playing) textOf('countdown', String(Math.ceil(r.countdown)));
  else textOf('countdown', now < goUntil ? 'スタート！' : '');

  drawBoard(board, r, stageIndex, touch, prefs.shake && !reducedMotion.matches);
}

function frame(now: number) {
  const delta = Math.min(0.25, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (screen === 'play' && round && !modal && !document.hidden) {
    const counting = round.countdown > 0;
    round.tick(delta);
    if (counting && !round.countdown) goUntil = now + 410;
    if (round.result) finishRound(round.result);
    else syncPlay(round, now);
  }
  audio.pulse(!document.hidden && !modal && (screen === 'title' || screen === 'intro' || screen === 'play'));
  requestAnimationFrame(frame);
}

app.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest<HTMLButtonElement>('button[data-action]');
  if (!control || control.disabled) return;
  const action = control.dataset.action!;
  audio.unlock();
  audio.play('tap');

  if (action.startsWith('single-')) {
    const index = Number(action.slice(7));
    if (index > 0 && !records[index - 1].stars) return;
    stageIndex = index;
    journey = false;
    change('intro');
    return;
  }

  switch (action) {
    case 'title': change('title'); break;
    case 'campaign': beginJourney(true); break;
    case 'again': beginJourney(false); break;
    case 'understood': change('intro'); break;
    case 'select': change('select'); break;
    case 'start':
    case 'restart':
    case 'retry': startRound(); break;
    case 'pause': openModal('pause'); break;
    case 'resume': returnFromModal(); break;
    case 'help': parentModal = modal; openModal('tutorial'); break;
    case 'settings': parentModal = modal; openModal('settings'); break;
    case 'confirm-title': parentModal = 'pause'; openModal('confirm'); break;
    case 'back-modal': returnFromModal(); break;
    case 'retract': endPointer(); round?.retract(); break;
    case 'next':
      if (stageIndex === 2) change('ending');
      else { stageIndex++; change('intro'); }
      break;
    case 'total': change('total'); break;
    case 'reset-settings':
      prefs = { ...defaults };
      save('settings', prefs);
      applyPrefs();
      drawModal(false);
      overlay.querySelector<HTMLElement>('[data-action=reset-settings]')?.focus();
      break;
  }
});

overlay.addEventListener('input', event => {
  if (!(event.target instanceof HTMLInputElement)) return;
  const input = event.target;
  if (input.type === 'range') {
    const key = input.dataset.key as 'music' | 'effects';
    prefs[key] = input.valueAsNumber;
    const output = input.parentElement?.querySelector('output');
    if (output) output.value = prefs[key] + '%';
  } else {
    const key = input.dataset.key as Exclude<keyof Settings, 'music' | 'effects'>;
    prefs[key] = input.checked;
    const label = input.nextElementSibling as HTMLElement | null;
    if (label) label.textContent = (input.checked ? label.dataset.on : label.dataset.off) ?? '';
  }
  save('settings', prefs);
  applyPrefs();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!modal && screen === 'play') openModal('pause');
    else if (modal) returnFromModal();
  }
  if (event.key === 'Tab' && modal) {
    const items = [...overlay.querySelectorAll<HTMLElement>('button:not(:disabled), input')];
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement?.id === 'dialog-title')) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
});

function autoPause() {
  if (screen === 'play' && !modal && !round?.result) openModal('pause');
}
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
window.addEventListener('blur', autoPause);
applyPrefs();
drawScreen();
drawModal(false);
requestAnimationFrame(frame);
