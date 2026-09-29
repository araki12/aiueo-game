"use strict";

const THEME_LIST = [
  "食べ物", "飲み物", "地上の動物", "魚", "動物", "空を飛ぶ動物",
  "ジブリ映画のキャラクター", "ディズニーキャラクター", "家具", "家電",
  "47都道府県", "国名", "海外の都市", "日本の偉人", "海外の偉人", "日本人の苗字", "お菓子",
];

// 右端列にわ・を・ん・ーを並べる。
const GOJUON_ROWS = [
  ["あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ"],
  ["い", "き", "し", "ち", "に", "ひ", "み", null, "り", "を"],
  ["う", "く", "す", "つ", "ぬ", "ふ", "む", "ゆ", "る", "ん"],
  ["え", "け", "せ", "て", "ね", "へ", "め", null, "れ", "ー"],
  ["お", "こ", "そ", "と", "の", "ほ", "も", "よ", "ろ", null],
];

// 濁音・半濁音は清音へ、小書き文字は大文字へ強制変換し同じ音として扱う。
const NORMALIZE_MAP = {
  "が": "か", "ぎ": "き", "ぐ": "く", "げ": "け", "ご": "こ",
  "ざ": "さ", "じ": "し", "ず": "す", "ぜ": "せ", "ぞ": "そ",
  "だ": "た", "ぢ": "ち", "づ": "つ", "で": "て", "ど": "と",
  "ば": "は", "び": "ひ", "ぶ": "ふ", "べ": "へ", "ぼ": "ほ",
  "ぱ": "は", "ぴ": "ひ", "ぷ": "ふ", "ぺ": "へ", "ぽ": "ほ",
  "っ": "つ", "ゃ": "や", "ゅ": "ゆ", "ょ": "よ",
};

const ALL_KANA = new Set(GOJUON_ROWS.flat().filter(Boolean));

const MAX_WORD_LENGTH = 7;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

function qs(id) {
  return document.getElementById(id);
}

function normalizeChar(ch) {
  const codePoint = ch.codePointAt(0);
  if (codePoint >= 0x30a1 && codePoint <= 0x30f6) {
    ch = String.fromCodePoint(codePoint - 0x60);
  }
  return NORMALIZE_MAP[ch] || ch;
}

function normalizeWord(raw) {
  return Array.from(raw).map(normalizeChar);
}

function validateWord(raw) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "言葉を入力してください。" };
  }
  if (trimmed.length > MAX_WORD_LENGTH) {
    return { ok: false, message: `7文字以内で入力してください（${trimmed.length}文字は登録できません）。` };
  }
  const normalized = normalizeWord(trimmed);
  const invalid = normalized.find((ch) => !ALL_KANA.has(ch));
  if (invalid) {
    return { ok: false, message: `使用できない文字「${invalid}」が含まれています。ひらがなで入力してください。` };
  }
  return { ok: true, normalized };
}

// ---------- ダイアログ ----------
const dialogEl = qs("app-dialog");
const dialogMessage = qs("dialog-message");
const dialogActions = qs("dialog-actions");

function openDialog() {
  dialogEl.classList.remove("pop");
  void dialogEl.offsetWidth; // アニメーション再生のための強制リフロー
  dialogEl.classList.add("pop");
  dialogEl.showModal();
}

function showAlert(message) {
  return new Promise((resolve) => {
    dialogMessage.textContent = message;
    dialogActions.innerHTML = "";
    const okButton = document.createElement("button");
    okButton.type = "submit";
    okButton.className = "dialog-button primary";
    okButton.textContent = "OK";
    dialogActions.appendChild(okButton);
    dialogEl.addEventListener("close", () => resolve(), { once: true });
    openDialog();
    okButton.focus();
  });
}

function showConfirm(message, confirmLabel, cancelLabel) {
  return new Promise((resolve) => {
    dialogMessage.textContent = message;
    dialogActions.innerHTML = "";
    const cancelButton = document.createElement("button");
    cancelButton.type = "submit";
    cancelButton.value = "cancel";
    cancelButton.className = "dialog-button ghost";
    cancelButton.textContent = cancelLabel || "キャンセル";
    const okButton = document.createElement("button");
    okButton.type = "submit";
    okButton.value = "confirm";
    okButton.className = "dialog-button primary";
    okButton.textContent = confirmLabel || "OK";
    dialogActions.append(cancelButton, okButton);
    dialogEl.addEventListener("close", () => resolve(dialogEl.returnValue === "confirm"), { once: true });
    openDialog();
    okButton.focus();
  });
}

// ---------- 画面切り替え ----------
const SCREENS = ["setup", "handoff", "game", "result"];
function showScreen(name) {
  SCREENS.forEach((screenName) => {
    qs(`screen-${screenName}`).hidden = screenName !== name;
  });
  qs("title-reset").hidden = name === "setup";
}

// ---------- セットアップ ----------
let chosenPlayerCount = MIN_PLAYERS;
let chosenTheme = THEME_LIST[Math.floor(Math.random() * THEME_LIST.length)];

function renderThemeChips() {
  const container = qs("theme-chip-list");
  container.innerHTML = "";
  THEME_LIST.forEach((theme) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = theme;
    chip.setAttribute("aria-pressed", String(theme === chosenTheme));
    chip.addEventListener("click", () => {
      chosenTheme = theme;
      qs("theme-custom-input").value = "";
      renderThemeChips();
    });
    container.appendChild(chip);
  });
}

function rerollTheme() {
  if (THEME_LIST.length <= 1) return;
  let next = chosenTheme;
  while (next === chosenTheme) {
    next = THEME_LIST[Math.floor(Math.random() * THEME_LIST.length)];
  }
  chosenTheme = next;
  qs("theme-custom-input").value = "";
  renderThemeChips();
}

qs("player-count-minus").addEventListener("click", () => {
  chosenPlayerCount = Math.max(MIN_PLAYERS, chosenPlayerCount - 1);
  qs("player-count-value").textContent = String(chosenPlayerCount);
});
qs("player-count-plus").addEventListener("click", () => {
  chosenPlayerCount = Math.min(MAX_PLAYERS, chosenPlayerCount + 1);
  qs("player-count-value").textContent = String(chosenPlayerCount);
});
qs("theme-reroll").addEventListener("click", rerollTheme);
qs("theme-custom-input").addEventListener("input", (event) => {
  const value = event.target.value.trim();
  if (value) {
    chosenTheme = value;
    Array.from(qs("theme-chip-list").children).forEach((chip) => chip.setAttribute("aria-pressed", "false"));
  }
});

qs("setup-start").addEventListener("click", async () => {
  const theme = qs("theme-custom-input").value.trim() || chosenTheme;
  if (!theme) {
    await showAlert("お題を選ぶか、入力してください。");
    return;
  }
  chosenTheme = theme;
  startHandoff();
});

// ---------- 手渡し(伏せ字入力) ----------
let pendingPlayers = [];
let handoffIndex = 0;

function startHandoff() {
  pendingPlayers = Array.from({ length: chosenPlayerCount }, (_, index) => ({
    id: index + 1,
    name: `プレイヤー${index + 1}`,
    word: null,
  }));
  handoffIndex = 0;
  showScreen("handoff");
  renderHandoffBlind();
}

function renderHandoffBlind() {
  qs("handoff-form").hidden = true;
  qs("handoff-blind").hidden = false;
  qs("handoff-blind-text").textContent = `つぎは ${pendingPlayers[handoffIndex].name} の番です`;
}

qs("handoff-reveal-button").addEventListener("click", () => {
  const player = pendingPlayers[handoffIndex];
  qs("handoff-blind").hidden = true;
  qs("handoff-form").hidden = false;
  qs("handoff-player-label").textContent = player.name;
  qs("handoff-theme-value").textContent = chosenTheme;
  qs("handoff-name-input").value = player.name;
  qs("handoff-word-input").value = "";
  qs("handoff-word-counter").textContent = `0 / ${MAX_WORD_LENGTH}`;
  qs("handoff-word-preview").textContent = "";
  qs("handoff-name-input").focus();
});

function updateWordInput(event) {
  const input = event.target;
  if (!event.isComposing) input.value = normalizeWord(input.value).join("");
  const raw = input.value;
  qs("handoff-word-counter").textContent = `${Array.from(raw.trim()).length} / ${MAX_WORD_LENGTH}`;
  const normalized = normalizeWord(raw.trim()).join("");
  qs("handoff-word-preview").textContent = normalized ? `登録される表記：${normalized}` : "";
}

qs("handoff-word-input").addEventListener("input", updateWordInput);
qs("handoff-word-input").addEventListener("compositionend", updateWordInput);

qs("handoff-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const player = pendingPlayers[handoffIndex];
  const rawName = qs("handoff-name-input").value.trim();
  const result = validateWord(qs("handoff-word-input").value);
  if (!result.ok) {
    await showAlert(result.message);
    return;
  }
  player.name = rawName || player.name;
  player.word = result.normalized;
  handoffIndex += 1;
  if (handoffIndex < pendingPlayers.length) {
    renderHandoffBlind();
  } else {
    finalizeSetupAndStartGame();
  }
});

// ---------- ゲーム本体 ----------
let state = null;
let selectedKana = null;
let prevSnapshot = null;

function finalizeSetupAndStartGame() {
  const players = pendingPlayers.map((player) => ({
    id: player.id,
    name: player.name,
    word: player.word,
    revealed: player.word.map(() => false),
    eliminated: false,
    eliminatedRound: null,
  }));

  state = {
    theme: chosenTheme,
    players,
    usedKana: new Set(),
    currentPlayerId: 1 + Math.floor(Math.random() * players.length),
    round: 0,
    log: [],
    result: null,
  };
  selectedKana = null;
  prevSnapshot = null;

  showScreen("game");

  const immediateResult = evaluateEndCondition(state.players);
  if (immediateResult) {
    finishGame(immediateResult);
    return;
  }
  renderGame();
}

function evaluateEndCondition(players) {
  const survivors = players.filter((player) => !player.eliminated);
  if (survivors.length === 1) {
    return { type: "last-standing", winnerIds: [survivors[0].id] };
  }
  const remainingKana = new Set();
  survivors.forEach((player) => {
    player.word.forEach((kana, index) => {
      if (!player.revealed[index]) remainingKana.add(kana);
    });
  });
  if (remainingKana.size === 1) {
    return { type: "same-kana-tie", winnerIds: survivors.map((player) => player.id) };
  }
  return null;
}

function nextAlivePlayerId(currentId) {
  const total = state.players.length;
  for (let step = 1; step <= total; step += 1) {
    const candidateId = ((currentId - 1 + step) % total) + 1;
    const candidate = state.players.find((player) => player.id === candidateId);
    if (candidate && !candidate.eliminated) return candidateId;
  }
  return currentId;
}

function selectKana(kana) {
  if (state.usedKana.has(kana)) return;
  selectedKana = kana;
  renderGame();
}

function resolveTurn() {
  if (!selectedKana) return;
  const kana = selectedKana;
  const actingPlayer = state.players.find((player) => player.id === state.currentPlayerId);
  const previousSurvivors = state.players.filter((player) => !player.eliminated);

  state.usedKana.add(kana);
  state.round += 1;

  state.players.forEach((player) => {
    player.word.forEach((letter, index) => {
      if (letter === kana) player.revealed[index] = true;
    });
  });

  const newlyEliminated = [];
  state.players.forEach((player) => {
    if (!player.eliminated && player.revealed.every(Boolean)) {
      player.eliminated = true;
      player.eliminatedRound = state.round;
      newlyEliminated.push(player);
    }
  });

  let logText = `第${state.round}手：${actingPlayer.name} が「${kana}」をひらいた`;
  if (newlyEliminated.length > 0) {
    logText += ` → ${newlyEliminated.map((player) => player.name).join("・")} が脱落`;
  }
  state.log.unshift(logText);

  selectedKana = null;

  const survivors = state.players.filter((player) => !player.eliminated);
  let result;
  if (survivors.length === 0) {
    // 直前の生存者全員が同じ手番で同時脱落したため、全員を同率優勝とする。
    result = { type: "all-eliminated-tie", winnerIds: previousSurvivors.map((player) => player.id) };
  } else {
    result = evaluateEndCondition(state.players);
    if (!result) {
      state.currentPlayerId = nextAlivePlayerId(state.currentPlayerId);
    }
  }

  if (result) {
    finishGame(result);
  } else {
    renderGame();
  }
}

qs("kana-confirm-button").addEventListener("click", resolveTurn);

// ---------- 描画 ----------
function hueForPlayer(id) {
  return (id * 63) % 360;
}

function buildTilesMarkup(player, forceRevealAll) {
  return player.word
    .map((kana, index) => {
      const isRevealed = forceRevealAll || player.revealed[index];
      const wasRevealedBefore = prevSnapshot && prevSnapshot.has(player.id)
        ? prevSnapshot.get(player.id).revealed[index]
        : false;
      const isNew = !forceRevealAll && !wasRevealedBefore && player.revealed[index];
      const classes = ["tile", isRevealed ? "is-revealed" : "is-hidden", isNew ? "reveal-pop" : ""]
        .filter(Boolean).join(" ");
      return `<span class="${classes}">${isRevealed ? kana : "◆"}</span>`;
    })
    .join("");
}

function renderPlayerBoard(containerId, revealAll) {
  const container = qs(containerId);
  container.innerHTML = state.players
    .map((player) => {
      const hue = hueForPlayer(player.id);
      const isTurn = !revealAll && player.id === state.currentPlayerId && !player.eliminated;
      const wasEliminatedBefore = prevSnapshot && prevSnapshot.has(player.id)
        ? prevSnapshot.get(player.id).eliminated
        : false;
      const justEliminated = !revealAll && !wasEliminatedBefore && player.eliminated;
      const isWinner = Boolean(state.result && state.result.winnerIds.includes(player.id));
      const cardClasses = [
        "player-card",
        player.eliminated ? "is-eliminated" : "",
        isTurn ? "is-turn" : "",
        justEliminated ? "just-eliminated" : "",
        isWinner ? "is-winner" : "",
      ].filter(Boolean).join(" ");
      const tilesHtml = buildTilesMarkup(player, revealAll);
      const statusLabel = isWinner ? "🏆 優勝" : player.eliminated ? "脱落" : "生存中";
      return `
        <div class="${cardClasses}" style="--player-hue:${hue}">
          <div class="player-card-head">
            <span class="player-avatar">${player.name.charAt(0)}</span>
            <span class="player-name">${player.name}</span>
            <span class="player-status">${statusLabel}</span>
          </div>
          <div class="tile-row">${tilesHtml}</div>
        </div>`;
    })
    .join("");
}

function kanaButtonHtml(kana) {
  const used = state.usedKana.has(kana);
  const selected = selectedKana === kana;
  const classes = ["kana-cell", used ? "is-used" : "", selected ? "is-selected" : ""].filter(Boolean).join(" ");
  return `<button type="button" class="${classes}" data-kana="${kana}" ${used ? "disabled" : ""}>${kana}</button>`;
}

function renderKanaBoard() {
  const container = qs("kana-board");
  const rowsHtml = GOJUON_ROWS.map((row) => {
    const cellsHtml = row
      .map((kana) => (kana ? kanaButtonHtml(kana) : `<span class="kana-cell is-empty" aria-hidden="true"></span>`))
      .join("");
    return `<div class="kana-row">${cellsHtml}</div>`;
  }).join("");
  container.innerHTML = rowsHtml;

  container.querySelectorAll("[data-kana]").forEach((button) => {
    button.addEventListener("click", () => selectKana(button.dataset.kana));
  });
}

function renderLog(containerId) {
  const container = qs(containerId);
  container.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join("")
    || "<li class=\"log-empty\">まだ記録はありません。</li>";
}

function renderGame() {
  qs("game-theme-label").textContent = state.theme;
  qs("game-round-label").textContent = `手番 ${state.round}`;

  const currentPlayer = state.players.find((player) => player.id === state.currentPlayerId);
  qs("turn-banner-text").textContent = `🎙 ${currentPlayer.name} の番です。まだ開いていない音を選んでください。`;

  renderPlayerBoard("player-board", false);
  renderKanaBoard();
  renderLog("turn-log");

  qs("kana-selected-label").textContent = selectedKana ? `えらんだ音：${selectedKana}` : "音をえらんでください";
  qs("kana-confirm-button").disabled = !selectedKana;

  prevSnapshot = new Map(state.players.map((player) => [player.id, {
    revealed: [...player.revealed],
    eliminated: player.eliminated,
  }]));
}

// ---------- 結果 ----------
function finishGame(result) {
  state.result = result;
  showScreen("result");

  const winnerNames = result.winnerIds
    .map((id) => state.players.find((player) => player.id === id).name)
    .join("・");

  const titleMap = {
    "last-standing": `🏆 ${winnerNames} の勝利！`,
    "same-kana-tie": `🏆 ${winnerNames} が同時優勝！`,
    "all-eliminated-tie": `🏆 同時脱落につき ${winnerNames} が同時優勝！`,
  };
  qs("result-title").textContent = titleMap[result.type] || `🏆 ${winnerNames} の勝利！`;

  renderPlayerBoard("result-final-board", true);
  renderLog("result-log");
}

qs("result-again-button").addEventListener("click", () => {
  state = null;
  pendingPlayers = [];
  showScreen("setup");
  qs("player-count-value").textContent = String(chosenPlayerCount);
  renderThemeChips();
});

// ---------- タイトルへ戻る ----------
qs("title-reset").addEventListener("click", async () => {
  const confirmed = await showConfirm("さいしょの画面にもどりますか？入力した内容は消えます。", "もどる", "つづける");
  if (!confirmed) return;
  state = null;
  pendingPlayers = [];
  showScreen("setup");
});

// ---------- ヘルプパネル ----------
qs("help-toggle").addEventListener("click", () => {
  const panel = qs("help-panel");
  const expanded = qs("help-toggle").getAttribute("aria-expanded") === "true";
  panel.hidden = expanded;
  qs("help-toggle").setAttribute("aria-expanded", String(!expanded));
});
qs("help-close").addEventListener("click", () => {
  qs("help-panel").hidden = true;
  qs("help-toggle").setAttribute("aria-expanded", "false");
});

// ---------- 初期化 ----------
qs("player-count-value").textContent = String(chosenPlayerCount);
renderThemeChips();
showScreen("setup");
