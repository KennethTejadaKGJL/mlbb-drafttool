const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- OFFICIAL MLBB TOURNAMENT DRAFT SEQUENCE ---
const DRAFT_ORDER = [
  // PHASE 1 BANS (3 per team)
  { team: 'blue', type: 'ban' },
  { team: 'red', type: 'ban' },
  { team: 'blue', type: 'ban' },
  { team: 'red', type: 'ban' },
  { team: 'blue', type: 'ban' },
  { team: 'red', type: 'ban' },

  // PHASE 1 PICKS (Snake: B1 -> R1,R2 -> B2,B3 -> R3)
  { team: 'blue', type: 'pick' }, // Blue 1
  { team: 'red', type: 'pick' },  // Red 1
  { team: 'red', type: 'pick' },  // Red 2
  { team: 'blue', type: 'pick' }, // Blue 2
  { team: 'blue', type: 'pick' }, // Blue 3
  { team: 'red', type: 'pick' },  // Red 3

  // PHASE 2 BANS (2 per team)
  { team: 'red', type: 'ban' },   // Red ban 4
  { team: 'blue', type: 'ban' },  // Blue ban 4
  { team: 'red', type: 'ban' },   // Red ban 5
  { team: 'blue', type: 'ban' },  // Blue ban 5

  // PHASE 2 PICKS (Snake: R4 -> B4,B5 -> R5)
  { team: 'red', type: 'pick' },  // Red 4
  { team: 'blue', type: 'pick' }, // Blue 4
  { team: 'blue', type: 'pick' }, // Blue 5 (Last pick)
  { team: 'red', type: 'pick' }   // Red 5 (Last pick)
];

let gameState = {
  blueTeam: [],
  redTeam: [],
  blueBans: [],
  redBans: [],
  stepIndex: 0,
  timer: 35, // 30s + buffer
  finished: false,
  started: false
};

let interval = null;

function resetTimer() {
  if (interval) clearInterval(interval);
  gameState.timer = 35;
  interval = setInterval(() => {
    if (gameState.timer > 0) {
      gameState.timer--;
      io.emit('timer_update', gameState.timer);
    } else {
      // Future feature: Add auto-random pick here
    }
  }, 1000);
}

io.on('connection', (socket) => {
  socket.emit('update_state', gameState);

  socket.on('hero_selected', ({ hero, team }) => {
    if (gameState.finished || !gameState.started) return;

    const currentStep = DRAFT_ORDER[gameState.stepIndex];

    // 1. Strict Turn Validation
    if (team !== currentStep.team) return;

    // 2. Logic to update state
    if (currentStep.type === 'ban') {
      if (team === 'blue') gameState.blueBans.push(hero);
      else gameState.redBans.push(hero);
    } else {
      if (team === 'blue') gameState.blueTeam.push(hero);
      else gameState.redTeam.push(hero);
    }

    // 3. Advance Step
    if (gameState.stepIndex < DRAFT_ORDER.length - 1) {
      gameState.stepIndex++;
      resetTimer();
    } else {
      gameState.finished = true;
      clearInterval(interval);
    }

    // 4. Broadcast
    io.emit('update_state', gameState);
  });

  socket.on('start_draft', () => {
    console.log('Server received start_draft event');
    if (gameState.started) {
      console.log('Draft already started, ignoring');
      return;
    }
    gameState.started = true;
    resetTimer();
    console.log('Draft started, broadcasting state');
    io.emit('update_state', gameState);
  });

  socket.on('reset_draft', () => {
    gameState = {
      blueTeam: [], redTeam: [], blueBans: [], redBans: [],
      stepIndex: 0, timer: 35, finished: false, started: false
    };
    if (interval) clearInterval(interval);
    io.emit('update_state', gameState);
  });
});

server.listen(3002, () => console.log('MLBB Draft Server v2 (Manual Start) running on 3002'));