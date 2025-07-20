import { Card } from './Card.js'
import { Button } from './Button.js'
import { pos, deckConfig, playConfig, cardConfig, uiConfig } from './Config.js'

export class DeckStack {

    constructor(scene) {
        this.scene = scene;
        this.array = [];

        this.counter = new Button(scene, deckConfig.X - pos.Y(9), deckConfig.Y - pos.Y(9), pos.Y(6), pos.Y(6), uiConfig.COLOR, deckConfig.LENGTH, pos.Y(3), 'bold', 'white');

        for (let i = 0; i < deckConfig.LENGTH; i ++) {
            this.push(new Card(scene, deckConfig.X, deckConfig.Y, cardConfig.SCALE, null, 'deck', false));
        }

        this.setDragEvents();
        this.setDraggable(false);

    }

    /*  TODO:
        Fix drag events, it is important to take the top card out of the array once you click it to avoid
        cases where the card gets drawn to another player or to the player itself after having been peeked.
        Currently quite buggy, fix it >:(
    */

    setDragEvents() {
        const card = this.topCard;

        card.removeAllListeners();

        card.on('dragstart', () => {

            if (card.type !== 'deck') return;

            this.scene.playStack.setDropZone(true);
            this.scene.handStack.setDropZone(true);

            this.setDraggable(false);

            if (!this.drawedCard) {
                this.drawedCard = this.pop();
                this.count();

                this.scene.socket.emit('drawRequest', {code: this.scene.code}, (key) => {

                    if (key === 11) {
                        this.scene.playStack.setDropZone(false);
                    }

                    card.key = key

                    card.flip(true)
                        .setDepth(1);
                });
            }

        });

        card.on('drag', (pointer, dragX, dragY) => {

            if (card.type !== 'deck') return;

            card.setPosition(dragX, dragY);

        });

        card.on('dragenter', (pointer, gameObject, dropZone) => {

            if (card.type !== 'deck') return;

            this.dropped = true;

            gameObject.tint(this.scene.players[this.scene.socket.id].color);
            card.setAlpha(uiConfig.SELECTED_ALPHA);

        });

        card.on('dragleave', (pointer, gameObject, dropZone) => {

            if (card.type !== 'deck') return;

            this.dropped = false;

            gameObject.clearTint();
            card.setAlpha(1);

        });

        card.on('drop', (pointer, gameObject, dropZone) => {

            if (card.type !== 'deck') return;

            gameObject.clearTint();
            card.setAlpha(1);
            card.setDepth(0);

            if (gameObject.type === 'play') {

                const key = card.key;

                this.scene.socket.emit('playRequest', { code: this.scene.code, card: key });
                this.scene.playStack.play(card);

                if (key <= 4) {
                    this.scene.socket.emit('turnEnd', { code: this.scene.code });
                } else {
                    this.scene.skip.setVisible(true);

                    if (key === 5 || key === 6) {
                        this.scene.peeks.self = 1;
                        this.scene.waitingPeek = true;
                    } else if (key === 7 || key === 8) {
                        this.scene.peeks.alien = 1;
                        this.scene.waitingPeek = true;
                    } else if (key === 9) {
                        this.scene.trade = true;
                        this.scene.waitingTrade = true;
                    } else if (key === 10) {
                        this.scene.peeks.self = 1;
                        this.scene.peeks.alien = 1;
                        this.scene.peekTrade = true;
                        this.scene.waitingTrade = true;
                    }
                }

            } else if (gameObject.type === 'hand') {

                this.scene.socket.emit('swapRequest', { code: this.scene.code, i: gameObject.i, j: gameObject.j }, (key) => {
                    const swapped = this.scene.handStack.swap(this.pop(), gameObject.i, gameObject.j);
                    swapped.key = key;
                    this.scene.playStack.play(swapped);
                });

                this.scene.socket.emit('turnEnd', { code: this.scene.code });

            }
        });

        card.on('dragend', () => {

            this.scene.playStack.setDropZone(false);
            this.scene.handStack.setDropZone(false);

            if (this.dropped) {
                this.dropped = false;

            } else {
                card.flip(false).back();
            }

        });
    }

    push(card) {

        card.type = 'deck';
        card.key = null;

        if (this.topCard) {
            this.topCard
                .off()
                .removeAllListeners();
        }

        this.array.push(card);

        this.topCard = card;

        this.setDragEvents();
        this.setDraggable(this.draggable);

        this.count();
        
        this.order();

    }

    pop() {

        const card = this.array.pop()

        this.topCard = this.array[this.array.length - 1];

        if (this.topCard) {
            this.setDragEvents();
            this.setDraggable(this.draggable);
        }

        this.count();

        this.order();

        return card;

    }

    order() {
        
        for (let i = 0; i < this.array.length; i ++) {

            const card = this.array[i];

            card.setDepth(0);

            card.tween({
                x: deckConfig.X + (i - (this.array.length - 1) / 2) * pos.Y(0.05),
                y: deckConfig.Y + ((this.array.length - 1) / 2 - i) * pos.Y(0.05),
                duration: 200,
                ease: 'Quart.out',
                onUpdate: () => {
                    card.oX = deckConfig.X + (i - (this.array.length - 1) / 2) * pos.Y(0.05);
                    card.oY = deckConfig.Y + ((this.array.length - 1) / 2 - i) * pos.Y(0.05);
                },
                onComplete: () => {
                    card.flip(false)
                        .setDepth(0);
                }
            });

            if (this.array[i + 1]) {
                this.array[i + 1].setDepth(1);
            }
        }

    }

    count(delta = 0) {
        this.counter.setText(this.array.length + delta);
    }

    setDraggable(bool) {
        this.draggable = bool;
        this.topCard.setDraggable(bool);
    }
}