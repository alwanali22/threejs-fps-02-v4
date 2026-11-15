export const BUY_SECONDS = 15;
export const ROUND_SECONDS = 100;
export const FUSE_SECONDS = 35;
export const PLANT_SECONDS = 3.2;
export const DEFUSE_SECONDS = 5;
export const WIN_ROUNDS = 7;
export const MAX_ROUNDS = 12;
export const START_MONEY = 800;
export const KILL_REWARD = 300;
export const WIN_REWARD = 3250;
export const LOSS_REWARD = 1900;
export const LOSS_STREAK_BONUS = 500;
export const PLANT_REWARD = 300;
export const DEFUSE_REWARD = 300;
export function createRounds(events = {}) {
  const state = {
    phase: 'buy',
    round: 1,
    score: { ember: 0, kestrel: 0 },
    money: START_MONEY,
    timer: BUY_SECONDS,
    bomb: { planted: false, site: null, fuse: 0 },
    lossStreak: 0,
    lastReason: '',
    roundWinner: null,
    history: []
  };
  let matchWinner = null;
  let endedRound = false;
  function setPhase(phase) {
    state.phase = phase;
    events.onPhase?.(phase, state.round);
  }
  function changeMoney(amount) {
    state.money = Math.max(0, state.money + amount);
    events.onMoney?.(state.money);
  }
  function finishRound(winner, reason) {
    if (endedRound || state.phase === 'over') return;
    endedRound = true;
    state.roundWinner = winner;
    state.lastReason = reason;
    if (winner === 'ember') {
      state.score.ember += 1;
      state.lossStreak = 0;
      changeMoney(WIN_REWARD);
      state.history.push({
        round: state.round, winner, reason,
        ember: state.score.ember, kestrel: state.score.kestrel,
        delta: `+$${WIN_REWARD.toLocaleString('en-US')} WIN`
      });
    } else {
      state.score.kestrel += 1;
      state.lossStreak = Math.min(3, state.lossStreak + 1);
      const lossPay = LOSS_REWARD + Math.min(3, state.lossStreak - 1) * LOSS_STREAK_BONUS;
      changeMoney(lossPay);
      state.history.push({
        round: state.round, winner, reason,
        ember: state.score.ember, kestrel: state.score.kestrel,
        delta: `+$${lossPay.toLocaleString('en-US')} LOSS`
      });
    }
    events.onScore?.({ ...state.score });
    state.timer = 4.5;
    setPhase('over');
    events.onRoundEnd?.(winner, reason, state.round);
  }
  function startMatch() {
    state.phase = 'buy';
    state.round = 1;
    state.score.ember = 0;
    state.score.kestrel = 0;
    state.money = START_MONEY;
    state.timer = BUY_SECONDS;
    state.bomb.planted = false;
    state.bomb.site = null;
    state.bomb.fuse = 0;
    state.lossStreak = 0;
    state.lastReason = '';
    state.roundWinner = null;
    state.history.length = 0;
    endedRound = false;
    matchWinner = null;
    events.onMoney?.(state.money);
    events.onScore?.({ ...state.score });
    events.onPhase?.(state.phase, state.round);
  }
  function startRound() {
    if (isMatchOver()) return false;
    state.round += 1;
    state.bomb.planted = false;
    state.bomb.site = null;
    state.bomb.fuse = 0;
    state.lastReason = '';
    state.roundWinner = null;
    state.timer = BUY_SECONDS;
    endedRound = false;
    setPhase('buy');
    return true;
  }
  function step(dt, truth = {}) {
    if (state.phase === 'over') {
      state.timer = Math.max(0, state.timer - Math.max(0, dt));
      if (state.timer === 0) {
        if (state.score.ember >= WIN_ROUNDS) matchWinner = 'ember';
        else if (state.score.kestrel >= WIN_ROUNDS) matchWinner = 'kestrel';
        else if (state.round >= MAX_ROUNDS) {
          matchWinner = state.score.ember === state.score.kestrel
            ? null
            : state.score.ember > state.score.kestrel ? 'ember' : 'kestrel';
        }
      }
      return;
    }
    const elapsed = Math.max(0, dt);
    if (truth.bombDefused && state.phase === 'planted') {
      events.onBombDefused?.();
      finishRound('kestrel', 'defuse');
      return;
    }
    if (truth.bombExploded && state.phase === 'planted') {
      events.onBombExploded?.();
      finishRound('ember', 'detonation');
      return;
    }
    if (state.phase === 'buy') {
      state.timer = Math.max(0, state.timer - elapsed);
      if (state.timer === 0) {
        state.timer = ROUND_SECONDS;
        setPhase('live');
      }
      return;
    }
    if (state.phase === 'live') {
      if (truth.kestrelAlive === 0) {
        finishRound('ember', 'elimination');
        return;
      }
      if (truth.emberAlive === 0) {
        finishRound('kestrel', 'elimination');
        return;
      }
      if (truth.bombPlanted) {
        state.bomb.planted = true;
        state.bomb.site = truth.bombSite || null;
        state.bomb.fuse = FUSE_SECONDS;
        state.timer = FUSE_SECONDS;
        events.onBombPlanted?.(state.bomb.site);
        setPhase('planted');
        return;
      }
      state.timer = Math.max(0, state.timer - elapsed);
      if (truth.timeUp || state.timer === 0) finishRound('kestrel', 'time');
      return;
    }
    if (state.phase === 'planted') {
      if (truth.bombDefused) {
        events.onBombDefused?.();
        finishRound('kestrel', 'defuse');
        return;
      }
      if (truth.bombExploded) {
        events.onBombExploded?.();
        finishRound('ember', 'detonation');
        return;
      }
      state.bomb.fuse = Math.max(0, state.bomb.fuse - elapsed);
      state.timer = state.bomb.fuse;
      if (state.bomb.fuse === 0) {
        events.onBombExploded?.();
        finishRound('ember', 'detonation');
      }
    }
  }
  function addKillReward() {
    changeMoney(KILL_REWARD);
  }
  function addPlantReward() {
    changeMoney(PLANT_REWARD);
  }
  function addDefuseReward() {
    changeMoney(DEFUSE_REWARD);
  }
  function canAfford(price) {
    return Number.isFinite(price) && price >= 0 && state.money >= price;
  }
  function spend(price) {
    if (!canAfford(price)) return false;
    changeMoney(-price);
    return true;
  }
  function buyPhaseActive() {
    return state.phase === 'buy';
  }
  function isMatchOver() {
    return matchWinner !== null ||
      state.score.ember >= WIN_ROUNDS ||
      state.score.kestrel >= WIN_ROUNDS ||
      state.round >= MAX_ROUNDS && state.phase === 'over' && state.timer === 0;
  }
  function getMatchWinner() {
    if (matchWinner !== null) return matchWinner;
    if (state.score.ember >= WIN_ROUNDS) return 'ember';
    if (state.score.kestrel >= WIN_ROUNDS) return 'kestrel';
    if (state.round >= MAX_ROUNDS && state.phase === 'over' && state.timer === 0) {
      if (state.score.ember === state.score.kestrel) return null;
      return state.score.ember > state.score.kestrel ? 'ember' : 'kestrel';
    }
    return null;
  }
  return {
    state,
    startMatch,
    startRound,
    step,
    addKillReward,
    addPlantReward,
    addDefuseReward,
    canAfford,
    spend,
    buyPhaseActive,
    isMatchOver,
    matchWinner: getMatchWinner
  };
}