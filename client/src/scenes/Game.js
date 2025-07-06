import { Button } from '../objects/Button.js'
import { DeckStack } from '../objects/DeckStack.js'
import { PlayStack } from '../objects/PlayStack.js'
import { HandStack } from '../objects/HandStack.js'
import { pos, uiConfig, playConfig, cardConfig } from '../objects/Config.js'

export class Game extends Phaser.Scene {

    constructor() {
        super('Game');
    }

    init(data) {
        this.socket = data.socket;
        this.code = data.code;
        this.players = data.players;
    }

    preload() {
        this.load.spritesheet('cards', 'assets/spritesheet.png', {frameWidth: cardConfig.SIZE, frameHeight: cardConfig.SIZE});
    }

    create() {

        this.turn = new Button(this, pos.X(7), pos.Y(82), pos.X(10), pos.Y(5), uiConfig.COLOR, 'Turn 1', pos.Y(3), 'bold', 'white');
        this.round = new Button(this, pos.X(7), pos.Y(88), pos.X(10), pos.Y(5), uiConfig.COLOR, 'Round 1', pos.Y(3), 'bold', 'white');
        this.deck = new Button(this, pos.X(7), pos.Y(94), pos.X(10), pos.Y(5), uiConfig.COLOR, 'Deck 1', pos.Y(3), 'bold', 'white');
        
        this.skip = new Button(this, playConfig.X, playConfig.Y + pos.Y(12), pos.X(10), pos.Y(5), uiConfig.COLOR, 'SKIP', pos.Y(3), 'bold', 'white', () => {
            this.socket.emit('turnEnd', { code: this.code });
            this.skip.setVisible(false);
        }).setVisible(false);

        this.deckStack = new DeckStack(this);

        this.playStack = new PlayStack(this);
        
        this.handStacks = {};

        const ids = Object.keys(this.players);
        const len = ids.length;
        const idx = ids.indexOf(this.socket.id);
        for(let i = 0; i < len; i ++) {
            const id = ids[(idx + i) % len];
            this.handStacks[id] = new HandStack(this, id, i, len - 2);
        }

        this.handStack = this.handStacks[this.socket.id];

        this.copy = false;
        this.peeks = { self: 2, alien: 0 };
        this.peekedCards = [];
        this.trade = false;
        this.peekTrade = false;
        this.waitingPeek = false;
        this.waitingTrade = false;

        this.socket.emit('clientReady', { code: this.code });

        this.socket.on('turnStart', (data) => {

            const id = data.id
            const turn = data.turn;
            const round = data.round;
            
            this.turn.setText('Turn ' + (turn + 1));
            this.round.setText('Round ' + (round + 1));

            this.deckStack.setDraggable(id == this.socket.id);

            this.copy = true;
            this.peeks = { self: 0, alien: 0 };
            this.peekedCards = [];
            this.trade = false;
            this.peekTrade = false;
            this.waitingPeek = false;
            this.waitingTrade = false;

        });

        this.socket.on('deal', (data) => {

            const id = data.id;
            const line = data.line;

            this.handStacks[id].draw(line);

        });

        this.socket.on('peek', (data) => {

            const peekerId = data.peekerId;
            const peekedId = data.peekedId;
            const peekedI = data.peekedI;
            const peekedJ = data.peekedJ;

            this.handStacks[peekedId].highlight(peekedI, peekedJ, peekerId);

        });

        this.socket.on('trade', (data) => {

            const traderId = data.traderId;
            const tradedId = data.tradedId;
            const traderI = data.traderI;
            const tradedI = data.tradedI;
            const traderJ = data.traderJ;
            const tradedJ = data.tradedJ;

            const temp = this.handStacks[traderId].get(traderI, traderJ);
            this.handStacks[traderId].swap(this.handStacks[tradedId].get(tradedI, tradedJ), traderI, traderJ);
            this.handStacks[tradedId].swap(temp, tradedI, tradedJ);

        });

        this.socket.on('play', (data) => {

            const card = data.card;

            this.playStack.drawPlay(card);
            
        });

        this.socket.on('swap', (data) => {

            const id = data.id;
            const card = data.card;
            const i = data.i;
            const j = data.j;

            this.handStacks[id].drawSwap(card, i, j);

        });

        this.socket.on('copy', (data) => {

            const id = data.id;
            const card = data.card;
            const i = data.i;
            const j = data.j;

            this.playStack.play(this.handStacks[id].pop(i, j).setData('key', card));

        });

        this.socket.on('reshuffle', (data) => {

            const count = data.count;

            this.deck.setText('Deck ' + count);

            this.playStack.reshuffle();

        });
    }

    update() {
    }
}