const diceRows = [
  document.querySelector("#youDiceRow"),
  document.querySelector("#codexDiceRow")
];
const rollButton = document.querySelector("#rollButton");
const stopButton = document.querySelector("#stopButton");
const nextButton = document.querySelector("#nextButton");
const newMatchButton = document.querySelector("#newMatchButton");
const winningScoreInput = document.querySelector("#winningScore");
const playerScoreEls = [
  document.querySelector("#playerOneScore"),
  document.querySelector("#playerTwoScore")
];
const playerCards = [...document.querySelectorAll(".player-score")];
const diceSets = [...document.querySelectorAll(".dice-set")];
const rollStateEls = [
  document.querySelector("#youRollState"),
  document.querySelector("#codexRollState")
];
const rollProgress = document.querySelector("#rollProgress");
const turnTitle = document.querySelector("#turnTitle");
const phaseSubtext = document.querySelector("#phaseSubtext");
const roundState = document.querySelector("#roundState");
const currentScore = document.querySelector("#currentScore");
const targetScore = document.querySelector("#targetScore");
const resultText = document.querySelector("#resultText");
const codexLine = document.querySelector("#codexLine");
const gameStatus = document.querySelector("#gameStatus");

let state = freshMatch();
let aiTimer = null;

function freshMatch() {
  return {
    scores: [0, 0],
    starter: 0,
    active: 0,
    phase: "leader",
    rolls: 0,
    rollCounts: [0, 0],
    diceSets: [freshDice(), freshDice()],
    target: null,
    roundOver: false,
    matchOver: false,
    codexMood: "Waiting for your target.",
    message: "Set a target, then challenge it."
  };
}

function freshDice() {
  return Array.from({ length: 5 }, () => ({ value: 1, held: false }));
}

function freshTurn(nextActive, phase, starter, target = null) {
  state.active = nextActive;
  state.phase = phase;
  state.starter = starter;
  state.rolls = 0;
  if (phase === "leader") {
    state.diceSets = [freshDice(), freshDice()];
    state.rollCounts = [0, 0];
  } else {
    state.diceSets[nextActive] = freshDice();
    state.rollCounts[nextActive] = 0;
  }
  state.target = target;
  state.roundOver = false;
  if (phase === "leader" && nextActive === 1) {
    state.codexMood = "I will set the bar.";
  } else if (nextActive === 1 && !state.codexMood) {
    state.codexMood = "I will take that challenge.";
  }
  state.message = phase === "leader" ? "Set a target, then challenge it." : "Beat or exactly match the target.";
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDice() {
  if (!isHumanTurn() || state.roundOver || state.matchOver || state.rolls >= maxRollsForTurn()) return;
  performRoll();
}

function performRoll() {
  if (state.roundOver || state.matchOver || state.rolls >= maxRollsForTurn()) return;

  const rollingIndexes = [];
  setActiveDice(activeDice().map((die, index) => {
    if (die.held && state.rolls > 0) return die;
    rollingIndexes.push(index);
    return { ...die, value: rollDie() };
  }));
  state.rolls += 1;
  state.rollCounts[state.active] = state.rolls;
  state.codexMood = isComputerTurn() ? codexRollLine() : state.codexMood;
  state.message = state.phase === "leader" ? "Choose dice to hold or declare a target." : "Choose dice to hold or answer the target.";
  render(rollingIndexes);

  if (state.rolls === maxRollsForTurn() && !isComputerTurn()) {
    window.setTimeout(() => declareScore(), 450);
  }
}

function toggleHold(index) {
  if (!isHumanTurn() || state.rolls === 0 || state.roundOver || state.matchOver) return;
  activeDice()[index].held = !activeDice()[index].held;
  render();
}

function activeDice() {
  return state.diceSets[state.active];
}

function setActiveDice(dice) {
  state.diceSets[state.active] = dice;
}

function bestScore(dice = activeDice(), rolls = state.rolls) {
  if (rolls === 0) return null;

  const wilds = dice.filter((die) => die.value === 2).length;
  const scoringFaces = [1, 3, 4, 5, 6];
  let best = { count: 0, face: 0, rolls, wilds };

  for (const face of scoringFaces) {
    const count = dice.filter((die) => die.value === face).length + wilds;
    if (count > best.count || (count === best.count && face > best.face)) {
      best = { count, face, rolls, wilds };
    }
  }
  return best;
}

function compareScores(a, b) {
  if (a.count !== b.count) return Math.sign(a.count - b.count);
  if (a.face !== b.face) return Math.sign(a.face - b.face);
  if (a.rolls !== b.rolls) return Math.sign(b.rolls - a.rolls);
  return 0;
}

function declareScore() {
  const score = bestScore();
  if (!score || state.roundOver || state.matchOver) return;

  if (state.phase === "leader") {
    state.target = score;
    if (state.active === 0) {
      state.codexMood = compareTargetTone(score);
    }
    freshTurn(1 - state.starter, "challenger", state.starter, score);
    render();
    return;
  }

  const comparison = compareScores(score, state.target);
  if (comparison > 0) {
    state.codexMood = state.active === 1 ? "I found a better hand." : "That was a strong answer.";
    awardPoint(state.active, `${playerBeats(state.active)} ${formatScore(state.target)} with ${formatScore(score)}.`);
    state.starter = state.active;
  } else if (comparison === 0) {
    state.roundOver = true;
    state.codexMood = "A push. Same starter.";
    state.message = `Exact match. No point. ${playerStarts(state.starter)} again.`;
  } else {
    state.codexMood = state.starter === 1 ? "I will take the point." : "Not enough this time.";
    awardPoint(state.starter, `${playerFallsShort(state.active)}. ${playerWinsPoint(state.starter)}.`);
  }

  render();
}

function awardPoint(player, message) {
  state.scores[player] += 1;
  state.roundOver = true;
  state.message = message;

  if (state.scores[player] >= winningScore()) {
    state.matchOver = true;
    state.message = `${playerWinsMatch(player)}, ${state.scores[0]} to ${state.scores[1]}.`;
  }
}

function nextRound() {
  if (!state.roundOver || state.matchOver) return;
  freshTurn(state.starter, "leader", state.starter);
  render();
}

function winningScore() {
  const parsed = Number.parseInt(winningScoreInput.value, 10);
  return Number.isFinite(parsed) ? Math.min(25, Math.max(1, parsed)) : 5;
}

function playerName(index) {
  return index === 0 ? "You" : "Codex";
}

function playerSets(index) {
  return index === 0 ? "You set the target" : "Codex sets the target";
}

function playerChallenges(index) {
  return index === 0 ? "You challenge" : "Codex challenges";
}

function playerBeats(index) {
  return index === 0 ? "You beat" : "Codex beats";
}

function playerFallsShort(index) {
  return index === 0 ? "You fall short" : "Codex falls short";
}

function playerWinsPoint(index) {
  return index === 0 ? "You win the point" : "Codex wins the point";
}

function playerWinsMatch(index) {
  return index === 0 ? "You win the match" : "Codex wins the match";
}

function playerStarts(index) {
  return index === 0 ? "You start" : "Codex starts";
}

function isComputerTurn() {
  return state.active === 1 && !state.roundOver && !state.matchOver;
}

function isHumanTurn() {
  return state.active === 0 && !state.roundOver && !state.matchOver;
}

function maxRollsForTurn() {
  return state.phase === "challenger" && state.target ? state.target.rolls : 3;
}

function formatScore(score) {
  if (!score) return "No target set";
  const faces = ["", "one", "two", "three", "four", "five", "six"];
  const pluralFaces = ["", "ones", "twos", "threes", "fours", "fives", "sixes"];
  const pluralFace = score.count === 1 ? faces[score.face] : pluralFaces[score.face];
  const rollWord = score.rolls === 1 ? "roll" : "rolls";
  return `${score.count} ${pluralFace} in ${score.rolls} ${rollWord}`;
}

function render(rollingIndexes = []) {
  window.clearTimeout(aiTimer);

  playerScoreEls.forEach((el, index) => {
    el.textContent = state.scores[index];
  });

  playerCards.forEach((card, index) => {
    card.classList.toggle("is-active", index === state.active && !state.matchOver);
  });
  diceSets.forEach((set, index) => {
    set.classList.toggle("is-active", index === state.active && !state.matchOver);
  });
  rollStateEls.forEach((el, index) => {
    el.textContent = index === state.active && !state.roundOver ? `Roll ${state.rolls}` : "Ready";
  });

  turnTitle.textContent = state.matchOver
    ? "Match complete"
    : state.phase === "leader"
      ? playerSets(state.active)
      : playerChallenges(state.active);
  phaseSubtext.textContent = phaseLine();
  roundState.textContent = `Roll ${state.rolls} of ${maxRollsForTurn()}`;
  renderRollProgress();
  currentScore.textContent = formatScore(bestScore());
  targetScore.textContent = formatScore(state.target);
  resultText.textContent = isComputerTurn() ? `${state.message} Codex is thinking.` : state.message;
  codexLine.textContent = isComputerTurn() ? `${state.codexMood} Thinking...` : state.codexMood;
  gameStatus.classList.toggle("has-hand", state.rolls > 0);
  gameStatus.classList.toggle("is-final", state.roundOver || state.matchOver);

  rollButton.disabled = !isHumanTurn() || state.roundOver || state.matchOver || state.rolls >= maxRollsForTurn();
  stopButton.disabled = !isHumanTurn() || state.rolls === 0 || state.roundOver || state.matchOver;
  stopButton.classList.toggle("declare-ready", !stopButton.disabled);
  nextButton.hidden = !state.roundOver || state.matchOver;
  winningScoreInput.disabled = state.scores[0] > 0 || state.scores[1] > 0 || state.rolls > 0 || Boolean(state.target);

  diceRows.forEach((row, playerIndex) => {
    const activeRollingIndexes = playerIndex === state.active ? rollingIndexes : [];
    const score = bestScore(state.diceSets[playerIndex], state.rollCounts[playerIndex]);
    row.replaceChildren(...state.diceSets[playerIndex].map((die, index) => dieButton(die, index, activeRollingIndexes.includes(index), playerIndex, isScoringDie(die, score))));
  });

  if (isComputerTurn()) {
    aiTimer = window.setTimeout(takeComputerAction, state.rolls === 0 ? 650 : 900);
  }
}

function dieButton(die, index, isRolling, playerIndex, isScoring) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `die${die.held ? " is-held" : ""}${isRolling ? " is-rolling" : ""}${die.value === 2 ? " is-wild" : ""}${isScoring ? " is-scoring" : ""}`;
  button.dataset.value = die.value;
  button.disabled = playerIndex !== 0 || !isHumanTurn() || state.rolls === 0 || state.roundOver || state.matchOver;
  button.setAttribute("aria-label", `${playerName(playerIndex)} die ${die.value}${die.value === 2 ? ", wild" : ""}, ${die.held ? "held" : "available"}`);
  button.setAttribute("aria-pressed", die.held ? "true" : "false");
  button.addEventListener("click", () => toggleHold(index));

  const pipGrid = document.createElement("span");
  pipGrid.className = "pip-grid";
  for (let i = 0; i < 9; i += 1) {
    const pip = document.createElement("span");
    pip.className = "pip";
    pipGrid.append(pip);
  }
  button.append(pipGrid);
  return button;
}

function renderRollProgress() {
  const max = maxRollsForTurn();
  rollProgress.replaceChildren(...Array.from({ length: max }, (_, index) => {
    const step = document.createElement("span");
    step.className = `roll-dot${index < state.rolls ? " is-filled" : ""}${index === state.rolls ? " is-next" : ""}`;
    step.textContent = String(index + 1);
    return step;
  }));
}

function phaseLine() {
  if (state.matchOver) return "Match complete.";
  if (state.roundOver) return "Round complete.";
  if (state.phase === "leader") return state.active === 0 ? "Set a target for Codex to chase." : "Codex is setting the target.";
  return state.active === 0 ? `Beat ${formatScore(state.target)}.` : `Codex must beat ${formatScore(state.target)}.`;
}

function isScoringDie(die, score) {
  if (!score || state.rolls === 0) return false;
  return die.value === score.face || die.value === 2;
}

function codexRollLine() {
  const lines = ["Let us see what the dice say.", "Looking for pressure.", "I can work with this.", "The wilds matter now."];
  return lines[Math.floor(Math.random() * lines.length)];
}

function compareTargetTone(score) {
  if (score.count >= 5) return "That is a monster target.";
  if (score.count >= 4) return "Bold target.";
  if (score.face >= 6) return "Sixes on the board. Noted.";
  return "I will take that challenge.";
}

function takeComputerAction() {
  if (!isComputerTurn()) return;

  if (state.rolls === 0) {
    performRoll();
    return;
  }

  const score = bestScore();
  if (state.rolls >= maxRollsForTurn() || shouldComputerStop(score)) {
    declareScore();
    return;
  }

  holdComputerDice(score);
  render();
  aiTimer = window.setTimeout(() => {
    if (isComputerTurn()) performRoll();
  }, 650);
}

function shouldComputerStop(score) {
  if (state.phase === "challenger") {
    return compareScores(score, state.target) >= 0 || !computerCanStillChallenge(score);
  }

  if (score.count >= 4) return true;
  if (score.count === 3 && score.face >= 5) return true;
  if (state.rolls === 2 && score.count >= 3) return true;
  return false;
}

function computerCanStillChallenge(score) {
  if (state.rolls >= maxRollsForTurn()) return false;
  if (compareScores(score, state.target) >= 0) return true;

  const highestPossible = {
    count: 5,
    face: chooseComputerFace(score),
    rolls: state.rolls + 1
  };

  if (compareScores(highestPossible, state.target) >= 0) return true;

  if (state.target.count < 5) {
    return true;
  }

  return state.target.face < 6;
}

function holdComputerDice(score) {
  const faceToHold = chooseComputerFace(score);
  setActiveDice(activeDice().map((die) => ({
    ...die,
    held: die.value === faceToHold || die.value === 2
  })));
  state.codexMood = "Holding the strongest set.";
  state.message = `${playerName(state.active)} holds ${faceToHold}s and wild 2s.`;
}

function chooseComputerFace(score) {
  return score.face;
}

rollButton.addEventListener("click", rollDice);
stopButton.addEventListener("click", declareScore);
nextButton.addEventListener("click", nextRound);
newMatchButton.addEventListener("click", () => {
  state = freshMatch();
  winningScoreInput.disabled = false;
  render();
});
winningScoreInput.addEventListener("change", () => {
  winningScoreInput.value = winningScore();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

render();
