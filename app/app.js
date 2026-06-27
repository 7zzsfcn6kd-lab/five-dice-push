const diceRow = document.querySelector("#diceRow");
const rollButton = document.querySelector("#rollButton");
const stopButton = document.querySelector("#stopButton");
const nextButton = document.querySelector("#nextButton");
const newMatchButton = document.querySelector("#newMatchButton");
const winningScoreInput = document.querySelector("#winningScore");
const playerTwoName = document.querySelector("#playerTwoName");
const opponentModeInputs = [...document.querySelectorAll("input[name='opponentMode']")];
const playerScoreEls = [
  document.querySelector("#playerOneScore"),
  document.querySelector("#playerTwoScore")
];
const playerCards = [...document.querySelectorAll(".player-score")];
const turnTitle = document.querySelector("#turnTitle");
const roundState = document.querySelector("#roundState");
const currentScore = document.querySelector("#currentScore");
const targetScore = document.querySelector("#targetScore");
const resultText = document.querySelector("#resultText");

let state = freshMatch();
let aiTimer = null;

function freshMatch() {
  return {
    scores: [0, 0],
    starter: 0,
    active: 0,
    phase: "leader",
    rolls: 0,
    dice: Array.from({ length: 5 }, () => ({ value: 1, held: false })),
    target: null,
    roundOver: false,
    matchOver: false,
    opponentMode: opponentMode(),
    message: "Set a target, then challenge it."
  };
}

function freshTurn(nextActive, phase, starter, target = null) {
  state.active = nextActive;
  state.phase = phase;
  state.starter = starter;
  state.rolls = 0;
  state.dice = Array.from({ length: 5 }, () => ({ value: 1, held: false }));
  state.target = target;
  state.roundOver = false;
  state.message = phase === "leader" ? "Set a target, then challenge it." : "Beat or exactly match the target.";
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDice() {
  if (isComputerTurn() || state.roundOver || state.matchOver || state.rolls >= maxRollsForTurn()) return;
  performRoll();
}

function performRoll() {
  if (state.roundOver || state.matchOver || state.rolls >= maxRollsForTurn()) return;

  const rollingIndexes = [];
  state.dice = state.dice.map((die, index) => {
    if (die.held && state.rolls > 0) return die;
    rollingIndexes.push(index);
    return { ...die, value: rollDie() };
  });
  state.rolls += 1;
  state.message = state.phase === "leader" ? "Choose dice to hold or declare a target." : "Choose dice to hold or answer the target.";
  render(rollingIndexes);

  if (state.rolls === maxRollsForTurn() && !isComputerTurn()) {
    window.setTimeout(() => declareScore(), 450);
  }
}

function toggleHold(index) {
  if (isComputerTurn() || state.rolls === 0 || state.roundOver || state.matchOver) return;
  state.dice[index].held = !state.dice[index].held;
  render();
}

function bestScore() {
  if (state.rolls === 0) return null;

  const counts = new Map();
  for (const die of state.dice) {
    counts.set(die.value, (counts.get(die.value) ?? 0) + 1);
  }

  let best = { count: 0, face: 0, rolls: state.rolls };
  for (const [face, count] of counts.entries()) {
    if (count > best.count || (count === best.count && face > best.face)) {
      best = { count, face, rolls: state.rolls };
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
    freshTurn(1 - state.starter, "challenger", state.starter, score);
    render();
    return;
  }

  const comparison = compareScores(score, state.target);
  if (comparison > 0) {
    awardPoint(state.active, `${playerName(state.active)} beats ${formatScore(state.target)} with ${formatScore(score)}.`);
    state.starter = state.active;
  } else if (comparison === 0) {
    state.roundOver = true;
    state.message = `Exact match. No point. ${playerName(state.starter)} starts again.`;
  } else {
    awardPoint(state.starter, `${playerName(state.active)} falls short. ${playerName(state.starter)} wins the point.`);
  }

  render();
}

function awardPoint(player, message) {
  state.scores[player] += 1;
  state.roundOver = true;
  state.message = message;

  if (state.scores[player] >= winningScore()) {
    state.matchOver = true;
    state.message = `${playerName(player)} wins the match, ${state.scores[0]} to ${state.scores[1]}.`;
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

function opponentMode() {
  return opponentModeInputs.find((input) => input.checked)?.value ?? "human";
}

function playerName(index) {
  return index === 1 && state.opponentMode === "computer" ? "Codex" : `Player ${index + 1}`;
}

function isComputerTurn() {
  return state.opponentMode === "computer" && state.active === 1 && !state.roundOver && !state.matchOver;
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
  playerTwoName.textContent = playerName(1);

  playerScoreEls.forEach((el, index) => {
    el.textContent = state.scores[index];
  });

  playerCards.forEach((card, index) => {
    card.classList.toggle("is-active", index === state.active && !state.matchOver);
  });

  turnTitle.textContent = state.matchOver
    ? "Match complete"
    : state.phase === "leader"
      ? `${playerName(state.active)} sets the target`
      : `${playerName(state.active)} challenges`;
  roundState.textContent = `Roll ${state.rolls} of ${maxRollsForTurn()}`;
  currentScore.textContent = formatScore(bestScore());
  targetScore.textContent = formatScore(state.target);
  resultText.textContent = isComputerTurn() ? `${state.message} Codex is thinking.` : state.message;

  rollButton.disabled = isComputerTurn() || state.roundOver || state.matchOver || state.rolls >= maxRollsForTurn();
  stopButton.disabled = isComputerTurn() || state.rolls === 0 || state.roundOver || state.matchOver;
  nextButton.hidden = !state.roundOver || state.matchOver;
  winningScoreInput.disabled = state.scores[0] > 0 || state.scores[1] > 0 || state.rolls > 0 || Boolean(state.target);
  opponentModeInputs.forEach((input) => {
    input.disabled = winningScoreInput.disabled;
  });

  diceRow.replaceChildren(...state.dice.map((die, index) => dieButton(die, index, rollingIndexes.includes(index))));

  if (isComputerTurn()) {
    aiTimer = window.setTimeout(takeComputerAction, state.rolls === 0 ? 650 : 900);
  }
}

function dieButton(die, index, isRolling) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `die${die.held ? " is-held" : ""}${isRolling ? " is-rolling" : ""}`;
  button.dataset.value = die.value;
  button.disabled = isComputerTurn() || state.rolls === 0 || state.roundOver || state.matchOver;
  button.setAttribute("aria-label", `${die.value}, ${die.held ? "held" : "available"}`);
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
  state.dice = state.dice.map((die) => ({
    ...die,
    held: die.value === faceToHold
  }));
  state.message = `${playerName(state.active)} holds ${faceToHold}s and rolls the rest.`;
}

function chooseComputerFace(score) {
  const counts = new Map();
  for (const die of state.dice) {
    counts.set(die.value, (counts.get(die.value) ?? 0) + 1);
  }

  let choice = score.face;
  for (const [face, count] of counts.entries()) {
    const choiceCount = counts.get(choice) ?? 0;
    if (count > choiceCount || (count === choiceCount && face > choice)) {
      choice = face;
    }
  }
  return choice;
}

rollButton.addEventListener("click", rollDice);
stopButton.addEventListener("click", declareScore);
nextButton.addEventListener("click", nextRound);
newMatchButton.addEventListener("click", () => {
  state = freshMatch();
  winningScoreInput.disabled = false;
  render();
});
opponentModeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    state = freshMatch();
    state.opponentMode = opponentMode();
    render();
  });
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
