import { Card } from './Card.js';
import { pos, deckConfig, handConfig, cardConfig, uiConfig } from './Config.js';

export class HandStack {

    constructor(scene, id, idx, maxIdx) {
        this.scene = scene;
        this.id = id;
        this.type = id == scene.socket.id ? 'self' : 'alien';

        this.array = [];
        this.length = 0;
        this.x = handConfig.X[maxIdx][idx];
        this.y = handConfig.Y[maxIdx][idx];
        this.scale = this.type == 'self' ? cardConfig.SCALE : cardConfig.ALIEN_SCALE;
        this.margin = this.type == 'self' ? handConfig.MARGIN : handConfig.ALIEN_MARGIN;

        for (let i = 0; i < handConfig.ROWS; i ++) {
            this.array.push([]);
        }
    }

    // !! Don't call this method before ordering as card needs to have x and y defined to be able to back() !!
    setDragEvents(card) {
        card.removeAllListeners();

        card.setDraggable(true);

        card.on('pointerdown', () => {

            if (this.scene.peeks[this.type] && !this.scene.peekedCards.includes(card)) {

                this.scene.peeks[this.type] --;

                this.scene.socket.emit('peekRequest', { code: this.scene.code, id: this.id, i: card.getData('i'), j: card.getData('j') }, (key) => {
                    card.peek(key);
                });

                this.scene.peekedCards.push(card);

                if (this.scene.waitingPeek) {
                    this.scene.skip.setVisible(false);
                    this.scene.socket.emit('turnEnd', { code: this.scene.code });
                }

            } else if (this.scene.copy) {

                this.scene.playStack.setDropZone(true);

            }

        });

        card.on('dragstart', () => {

            card.setDepth(1);
            // There is no need to define x and y as those have been defined at this.order()

            if (this.scene.trade) {
                console.log('trading');

                for (const handStack of Object.values(this.scene.handStacks)) {
                    if (handStack != this) {
                        console.log('entruing')
                        handStack.setDropZone(true);
                    }
                }

            } else if (this.scene.peekTrade) {

                if (this.scene.peekedCards.length == 0 || this.scene.peekedCards.includes(card)) {
                    this.scene.playStack.setDropZone(false);

                    for (const peekedCard of this.scene.peekedCards) {
                        if (peekedCard != card) {
                            peekedCard.setDropZone(true);
                        }
                    }
                }
            }

        });

        card.on('drag', (pointer, dragX, dragY) => {

            card.setPosition(dragX, dragY);

        });

        card.on('dragenter', (pointer, gameObject, dropZone) => {

            card.dropped = true;

            gameObject.tint(this.scene.players[this.id].color);
            card.setAlpha(uiConfig.SELECTED_ALPHA);

        });

        card.on('dragleave', (pointer, gameObject, dropZone) => {

            card.dropped = false;

            gameObject.clearTint();
            card.setAlpha(1);

        });

        card.on('drop', (pointer, gameObject, dropZone) => {


            gameObject.clearTint();
            card.setAlpha(1)

            if (gameObject.getData('type') == 'play') {
                
                this.scene.copy = false;

                this.scene.socket.emit('copyRequest', { code: this.scene.code, id: this.id, i: card.getData('i'), j: card.getData('j') }, (key) => {
                    this.scene.playStack.play(this.pop(card.getData('i'), card.getData('j')).setData('key', key));
                });

            } else if (gameObject.getData('type') == 'hand') {

                this.scene.socket.emit('tradeRequest', { 
                    code: this.scene.code, 
                    traderId: card.getData('id'), 
                    tradedId: gameObject.getData('id'),
                    traderI: card.getData('i'),
                    tradedI: gameObject.getData('i'),
                    traderJ: card.getData('j'),
                    tradedJ: gameObject.getData('j')
                });

                const id = gameObject.getData('id');
                const i = gameObject.getData('i');
                const j = gameObject.getData('j');
                this.swap(gameObject, card.getData('i'), card.getData('j'));
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
                console.log('backing')
                card.back(); 
            }
        });
    }

    draw(i) {
        this.add(this.scene.deckStack.pop(), i);
    }

    add(card, i) {
        this.length += 1;

        card.setData('key', null)
            .setData('type', 'hand')
            .setData('scale', this.scale)
            .setData('id', this.id)
            .setDepth(0);

        this.array[i].push(card);
        this.order();

        this.setDragEvents(card);
    }

    swap(card, i, j) {
        const current = this.array[i][j];

        card.setData('key', null)
            .setData('type', 'hand')
            .setData('scale', this.scale)
            .setData('id', this.id)
            .setDepth(0);

        this.array[i][j] = card;
        this.order();

        this.setDragEvents(card);

        return current;
    }

    drawSwap(key, i, j) {
        this.scene.playStack.play(this.swap(this.scene.deckStack.pop(), i, j).setData('key', key));
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

    order() {
        let y = this.y - (handConfig.ROWS * cardConfig.SIZE * this.scale + (handConfig.ROWS - 1) * this.margin ) / 2 + cardConfig.SIZE * this.scale / 2;
        for (let i = 0; i < handConfig.ROWS; i ++) {

            let x = this.x - (this.array[i].length * cardConfig.SIZE * this.scale + (this.array[i].length - 1) * this.margin ) / 2 + cardConfig.SIZE * this.scale / 2;
            for (let j = 0; j < this.array[i].length; j ++) {

                const card = this.array[i][j]

                card.setData('i', i)
                    .setData('j', j)
                    .setDepth(1);

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
                        card.setData('x', x + j * (cardConfig.SIZE * this.scale + this.margin))
                            .setData('y', y + i * (cardConfig.SIZE * this.scale + this.margin));
                    },
                    onComplete: () => {
                        card.flip(false)
                            .setDepth(0);
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