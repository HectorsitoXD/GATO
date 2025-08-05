const path = require('path');
const express = require('express');
const { error } = require('console');
const app = express();
const server = require('http').createServer(app); // Changed to createServer
const io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const CLIENT_DIR = path.join(__dirname, './client');

app.use(express.static(CLIENT_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

const COLORS = [
  0xf034fa,
  0x00cc44,
  0xed0047,
  0xffc929,
  0x7024ff
]

const DECK = [
  0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 1, 1, 1, 1, 1, 1,
  2, 2, 2, 2, 2, 2, 2, 2,
  3, 3, 3, 3, 3, 3, 3, 3,
  4, 4, 4, 4, 4, 4, 4, 4,
  5, 5, 5, 5, 5, 5, 5, 5,
  6, 6, 6, 6, 6, 6, 6, 6,
  7, 7, 7, 7, 7, 7, 7, 7,
  8, 8, 8, 8, 8, 8, 8, 8,
  9, 9, 9, 9, 9, 9, 9, 9,
  10, 10, 10, 10, 10, 10, 10, 10,
  11, 11, 11, 11
];


const CARDS = 4;

const rooms = {};

io.on('connection', (socket) => {

  socket.on('joinRequest', (data, callback) => {

    const code = data.code;
    const nick = data.nick;

    if (!rooms[code]) {
      rooms[code] = {
        count: { turn: 0, round: 0, deck: 0 },
        state: 0, // 0: Lobby, 1: Peek phase, 2: Gameplay Loop, 3: Last Round
        players: {},
        leader: socket.id,
        peeks: 0
      }
    }

    const room = rooms[code];
    const players = room.players;
    const ids = Object.keys(players);

    if (room.state == 0) {
      if (ids.length < 5) {
        players[socket.id] = {
          nick: nick || 'Player ' + (ids.length + 1),
          color: COLORS[ids.length],
          leader: ids.length == 0,
          hand: [[],[]],
          hold: null
        }

        callback(true, {code, players});

        everyone('playerUpdate', { players }, code);

      } else { callback(false, 'Room is full. A maximum of five players can play together.'); }
    } else { callback(false, 'A game is being played in this room. Try again later.'); }

  });

  socket.on('leaveRequest', (data) => {

    const code = data.code;
    const id = data.id;
    const room = rooms[code];
    const players = room.players;
    const ids = Object.keys(players);

    io.to(id).emit('leave');

    if (ids.length == 1) {

      delete rooms[code];

    } else {

      if (id == room.leader) {
        const ids = Object.keys(players);
        promote(code, ids[0] !== id ? ids[0] : ids[1]);
      }

      delete players[id];

      const ids = Object.keys(players);
      for (let i = 0; i < ids.length; i ++) {
        players[ids[i]].color = COLORS[i]; 
      }

      everyone('playerUpdate', { players }, code);

    }
  });

  socket.on('promoteRequest', (data) => {

    const code = data.code;
    const id = data.id;

    promote(code, id);

  });

  socket.on('startRequest', (data) => {

    const code = data.code;
    const room = rooms[code];
    
    room.deck = shuffle([...DECK]);
    room.cats = 0;
    room.play = [];
    room.state = 1;

    everyone('start', {}, code);

  });

  socket.on('clientReady', async (data) => {

    const code = data.code;
    const room = rooms[code];
    const players = room.players;
    const ids = Object.keys(players);

    players[socket.id].ready = true;

    let everyoneReady = true;
    for (const id of ids) {
      if (!players[id].ready) {
        everyoneReady = false;
      }
    }

    if (everyoneReady) {
      for (let i = 0; i < CARDS; i ++) {
        for (const id of ids) {
          await sleep(200);
          deal(code, id);
        }
      }
    }

  });

  socket.on('turnEnd', (data) => {

    const code = data.code;
    const room = rooms[code];
    const ids = Object.keys(room.players);

    room.count.turn = (room.count.turn + 1) % ids.length;
    if (room.count.turn == 0) {
      room.count.round ++;
    }

    everyone('turnStart', { id: ids[room.count.turn], turn: room.count.turn, round: room.count.round }, code);
  
  });

  socket.on('dealRequest', (data) => {

    const code = data.code
    const id = data.id;
    const amount = data.amount;

    for (let i = 0; i < amount; i ++) {
      deal(code, id);
    }

  });

  socket.on('drawRequest', (data, callback) => {

    const code = data.code;
    const player = rooms[code].players[socket.id];

    player.hold = pop(code);

    callback(player.hold);

    everyone('draw', { id: socket.id }, code, socket.id);

  });

  socket.on('moveRequest', (data) => {

    everyone('move', { x: data.x, y: data.y }, data.code, socket.id);

  });

  socket.on('playRequest', (data) => {

    const code = data.code;
    const room = rooms[code];
    const players = room.players;
    const player = players[socket.id];
    const ids = Object.keys(players);
    const card = player.hold;

    room.play.push({
      key: card,
      id: socket.id
    });

    player.hold = null;

    everyone('play', { card }, code, socket.id);

    if (card <= 4) {
      for (const id of ids) {
        if (id !== socket.id && handLength(code, id) == card) {
          deal(code, id);
        }
      }
    }
  });

  socket.on('swapRequest', async (data, callback) => {

    const code = data.code;
    const i = data.i;
    const j = data.j;
    const room = rooms[code];
    const players = room.players;
    const player = players[socket.id];
    const hand = player.hand;
    const card = hand[i][j];

    room.play.push({
      key: card,
      id: socket.id
    });

    hand[i][j] = player.hold;
    player.hold = null;

    callback(card);

    everyone('swap', { id: socket.id, card, i, j }, code, socket.id);

    if (card == 11) {
      for (let i = 0; i < 3; i++) {
        await sleep(200);
        deal(code, socket.id);
      }
    }

  });

  socket.on('copyRequest', async (data, callback) => {

    const code = data.code;
    const id = data.id;
    const i = data.i;
    const j = data.j;
    const room = rooms[code];
    const play = room.play;

    const card = room.players[id].hand[i].splice(j, 1)[0];
    play.push({
      key: card,
      id: socket.id
    });

    callback(card);

    everyone('copy', { id, card, i, j }, code, socket.id);

    const len = play.length;
    const top = play[len - 2];
    const bottom = play[len - 3];

    // Si no és un gat:
    if (card !== 11) {
      // Si t'has equivocat, penca 2:
      if (!top || card !== top.key) {
        for (let i = 0; i < 2; i ++) {
          await sleep(200);
          deal(code, socket.id);
        }
      // Si no t'has equivocat i la carta és d'un altre, l'altre penca 2:
      } else if (id !== socket.id) {
        for (let i = 0; i < 2; i ++) {
          await sleep(200);
          deal(code, id);
        }
      }
    // Si ho és:
    } else {
      // Si t'has equivocat, penca 3:
      if (!top || !bottom || top.key !== bottom.key || top.id == socket.id || bottom.id == socket.id) {
        for (let i = 0; i < 3; i ++) {
          await sleep(200);
          deal(code, socket.id);
        }
      // Si no t'has equivocat i la carta és d'un altre, l'altre penca 3:
      } else if (id !== socket.id) {
        for (let i = 0; i < 3; i ++) {
          await sleep(200);
          deal(code, id);
        }
      }
    }
  });

  socket.on('peekRequest', (data, callback) => {

    const code = data.code;
    const i = data.i;
    const j = data.j;
    const id = data.id;
    const room = rooms[code];
    const players = room.players;
    const ids = Object.keys(players);

    callback(players[id].hand[i][j]);

    everyone('peek', { peekerId: socket.id, peekedId: id, peekedI: i, peekedJ: j }, code, socket.id);

    // Peek phase
    if (room.state == 1) {

      room.peeks += 1

      if (room.peeks == 2 * ids.length) {
        delete room.peeks
        room.state = 2;
        everyone('turnStart', { id: ids[room.count.turn], turn: room.count.turn, round: room.count.round }, code);
      }

    }

  });

  socket.on('tradeRequest', (data) => {

    const code = data.code;
    const traderId = data.traderId;
    const tradedId = data.tradedId;
    const traderI = data.traderI;
    const tradedI = data.tradedI;
    const traderJ = data.traderJ;
    const tradedJ = data.tradedJ;
    const players = rooms[code].players;
    const traderHand = players[traderId].hand;
    const tradedHand = players[tradedId].hand;

    const temp = traderHand[traderI][traderJ];
    traderHand[traderI][traderJ] = tradedHand[tradedI][tradedJ];
    tradedHand[tradedI][tradedJ] = temp;

    everyone('trade', { traderId, tradedId, traderI, traderJ, tradedI, tradedJ }, code, socket.id)

  });

});

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});

function sleep(ms) {

  return new Promise(resolve => setTimeout(resolve, ms));
  
}

function everyone(event, data, code, except = null) {

  const ids = Object.keys(rooms[code].players);

  for (const id of ids) {
    if (id !== except) {
      io.to(id).emit(event, data);

    }
  }
}

function promote(code, id) {

  const room = rooms[code];
  const players = room.players;
  const player = players[id];

  players[room.leader].leader = false;
  room.leader = id;
  player.leader = true;

  everyone('playerUpdate', { players }, code);

}

function shuffle(deck) {

    let currentIndex = deck.length;

    while (currentIndex !== 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [deck[currentIndex], deck[randomIndex]] = [deck[randomIndex], deck[currentIndex]];

    }

    return deck;

}

function reshuffle(code) {

  const room = rooms[code];
  const play = room.play;

  room.deck = shuffle(
      play.map(card => card.key)
          .splice(0, play.length - 2)
  );

  const deck = room.deck;
  let len = deck.length;
  for (let i = 0; i < len; i++) {
    if (deck[i] == 11) {
      room.cats += 1;
      deck.splice(i, 1);
      i--;
      len--;
    }
  }

  room.count.deck ++;

}

function deal(code, id) {

  if (handLength(code, id) == 14) return;

  const room = rooms[code];
  const players = room.players;
  const player = players[id];
  const hand = player.hand;

  // Pop the card from deck and add it to player's hand
  const card = pop(code);

  let line = 0;
  let min = -1;
  for (let i = 0; i < 2; i++) {
      if (min == -1 || min > hand[i].length) {
          min = hand[i].length;
          line = i;
      }
  }

  hand[line].push(card);

  // Emit an event to inform everyone that a card has been dealt to player id
  everyone('deal', { id, line }, code);

}

function pop(code) {

  const room = rooms[code];
  const deck = room.deck;
  const card = deck.pop();

  console.log(deck.length)
  if (deck.length == 0) {
    reshuffle(code);
    everyone('reshuffle', { deck: room.count.deck }, code);
  }

  return card;
}

function handLength(code, id) {

  const room = rooms[code];
  const players = room.players;
  const player = players[id];
  const hand = player.hand;

  let length = 0;
  for (let i = 0; i < hand.length; i ++) {
    length += hand[i].length;
  }

  return length;
}