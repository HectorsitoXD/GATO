import { Card } from './Card.js';
import { pos, deckConfig, handConfig, cardConfig, uiConfig } from './Config.js';

export class HandStack {

    constructor(scene, id, idx, maxIdx) {
        this.scene = scene;
        this.id = id;
        this.type = id === scene.socket.id ? 'self' : 'alien';

        this.array = [];
        this.x = handConfig.X[maxIdx][idx];
        this.y = handConfig.Y[maxIdx][idx];
        this.scale = this.type === 'self' ? cardConfig.SCALE : cardConfig.ALIEN_SCALE;
        this.margin = this.type === 'self' ? handConfig.MARGIN : handConfig.ALIEN_MARGIN;

        for (let i = 0; i < handConfig.ROWS; i ++) {
            this.array.push([]);
        }
    }

    // !! Don't call this method before ordering as card needs to have x and y defined to be able to back() !!
    setDragEvents(card) {
        card.removeAllListeners();

        card.setDraggable(true);

        card.on('pointerdown', () => {

            if (card.type !== 'hand') return;

            if (this.scene.peeks[this.type] && !this.scene.peekedCards.includes(card)) {

                this.scene.peeks[this.type] --;

                this.scene.socket.emit('peekRequest', { code: this.scene.code, id: this.id, i: card.i, j: card.j }, (key) => {
                    card.peek(key);
                });

                this.scene.peekedCards.push(card);

                if (this.scene.waitingPeek) {
                    this.scene.skip.setVisible(false);
                    this.scene.socket.emit('turnEnd', { code: this.scene.code });
                }

            }

        });

        card.on('dragstart', () => {

            if (card.type !== 'hand') return;

            card.setDepth(1);
            // There is no need to define x and y as those have been defined at this.order()

            if (this.scene.copy && !(this.scene.peekTrade && (this.scene.peekedCards.includes(card) || this.scene.peekedCards.length === 0))) {
                this.scene.playStack.setDropZone(true);

            }

            if (this.scene.trade) {

                for (const handStack of Object.values(this.scene.handStacks)) {
                    if (handStack !== this) {
                        handStack.setDropZone(true);
                    }
                }

            } else if (this.scene.peekTrade) {

                for (const peekedCard of this.scene.peekedCards) {
                    if (peekedCard !== card) {
                        peekedCard.setDropZone(true);
                    }
                }
            }

        });

        card.on('drag', (pointer, dragX, dragY) => {

            if (card.type !== 'hand') return;

            card.setPosition(dragX, dragY);

        });

        card.on('dragenter', (pointer, gameObject, dropZone) => {

            if (card.type !== 'hand') return;

            card.dropped = true;

            gameObject.tint(this.scene.players[this.id].color);
            card.setAlpha(uiConfig.SELECTED_ALPHA);

        });

        card.on('dragleave', (pointer, gameObject, dropZone) => {

            if (card.type !== 'hand') return;

            card.dropped = false;

            gameObject.clearTint();
            card.setAlpha(1);

        });

        card.on('drop', (pointer, gameObject, dropZone) => {

            if (card.type !== 'hand') return;

            gameObject.clearTint();
            card.setAlpha(1)

            if (gameObject.type === 'play') {
                
                this.scene.copy = false;

                this.scene.socket.emit('copyRequest', { code: this.scene.code, id: this.id, i: card.i, j: card.j }, (key) => {
                    card.key = key;
                    this.scene.playStack.play(this.pop(card.i, card.j));
                });

            } else if (gameObject.type === 'hand') {

                this.scene.socket.emit('tradeRequest', { 
                    code: this.scene.code, 
                    traderId: card.id, 
                    tradedId: gameObject.id,
                    traderI: card.i,
                    tradedI: gameObject.i,
                    traderJ: card.j,
                    tradedJ: gameObject.j
                });

                const id = gameObject.id;
                const i = gameObject.i;
                const j = gameObject.j;
                this.swap(gameObject, card.i, card.j);
                this.scene.handStacks[id].swap(card, i, j);

                if (this.scene.waitingTrade) {
                    this.scene.skip.setVisible(false);
                    this.scene.socket.emit('turnEnd', { code: this.scene.code });
                }
            }
        });


        card.on('dragend', () => {

            this.scene.playStack.setDropZone(false);
            for (const handStack of Object.values(this.scene.handStacks)) {
                handStack.setDropZone(false);
            }
            
            card.setDepth(0);

            if (card.dropped) {
                card.dropped = false;
            } else {
                card.back(); 
            }
        });
    }

    draw(i) {
        this.add(this.scene.deckStack.pop(), i);
    }

    add(card, i, onCompleteOrdering = () => {}) {
        card.type = 'hand';
        card.oScale = this.scale;
        card.id = this.id;
        
        card.setDepth(0);

        this.array[i].push(card);
        this.order(() => {
            card.flip(false, false, onCompleteOrdering.bind(this));
        });

        this.setDragEvents(card);
    }

    swap(card, i, j) {
        const current = this.array[i][j];

        card.type = 'hand';
        card.oScale = this.scale;
        card.id = this.id;
        
        card.setDepth(0);

        this.array[i][j] = card;
        this.order(() => {
            card.flip(false)
        });

        this.setDragEvents(card);

        return current;
    }

    drawSwap(key, i, j) {
        const card = this.swap(this.scene.deckStack.pop(), i, j);
        card.key = key;
        this.scene.playStack.play(card);
    }

    pop(i, j) {
        const card = this.array[i].splice(j, 1)[0];
        this.order();
        return card;
    }

    highlight(i, j, id) {
        const card = this.get(i, j);

        card.highlight(this.scene.players[id].color);
    }

    order(onComplete = () => {}) {
        let y = this.y - (handConfig.ROWS * cardConfig.SIZE * this.scale + (handConfig.ROWS - 1) * this.margin ) / 2 + cardConfig.SIZE * this.scale / 2;
        for (let i = 0; i < handConfig.ROWS; i ++) {

            let x = this.x - (this.array[i].length * cardConfig.SIZE * this.scale + (this.array[i].length - 1) * this.margin ) / 2 + cardConfig.SIZE * this.scale / 2;
            for (let j = 0; j < this.array[i].length; j ++) {

                const card = this.array[i][j]

                card.i = i;
                card.j = j;
                
                card.setDepth(1);

                card.tween({
                    scaleX: this.scale,
                    scaleY: this.scale,
                    duration: 200,
                    ease: 'Quart.out'
                });

                card.tween({
                    x: x + j * (cardConfig.SIZE * this.scale + this.margin),
                    y: y + i * (cardConfig.SIZE * this.scale + this.margin),
                    duration: 200,
                    ease: 'Quart.out',
                    onUpdate: () => {
                        card.oX = x + j * (cardConfig.SIZE * this.scale + this.margin);
                        card.oY = y + i * (cardConfig.SIZE * this.scale + this.margin);
                    },
                    onComplete: () => {
                        card.setDepth(0);
                        onComplete.call(this);
                    }
                });
            }
        }
    }

    iterate(callback) {
        for (let i = 0; i < handConfig.ROWS; i ++) {
            for (let j = 0; j < this.array[i].length; j ++) {
                callback(this.array[i][j]);
            }
        }
    }

    get(i, j) {
        return this.array[i][j];
    }

    setDropZone(bool) {
        this.iterate((card) => {
            card.setDropZone(bool)
        });
    }
}