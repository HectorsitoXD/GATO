import { Card } from './Card.js'
import { Button } from './Button.js'
import { pos, playConfig, deckConfig, cardConfig } from './Config.js'

export class PlayStack {

    constructor(scene) {
        this.scene = scene;
        this.array = [];
        this.cats = 0;

        this.setDefaultCard();
    }

    play(card) {

        this.array.push(card);

        this.topCard = this.array[this.array.length - 1];
        this.bottomCard = this.array[this.array.length - 2];

        card.setDraggable(false);

        card.type = 'play';
        card.oScale = cardConfig.SCALE;
        card.setDepth(1);

        if (this.bottomCard) {
            this.bottomCard.setDraggable(false);
            this.bottomCard.setDropZone(false);
        }

        card.tween({
            x: playConfig.X,
            y: playConfig.Y,
            scaleX: cardConfig.SCALE,
            scaleY: cardConfig.SCALE,
            alpha: 1,
            duration: 200,
            ease: 'Quart.out',
            onComplete: () => {
                card.flip(true)
                    .setDepth(0);
                this.setDragEvents();
            }
        });
    }
    
    alienPlay(key) {
        const card = this.scene.deckStack.alienHoldCard;
        card.key = key;
        this.play(card);
    }

    reshuffle() {

        const deck = this.array.splice(1, this.array.length - 2);
        const len = deck.length;

        for (let i = 0; i < len; i++) {
            const card = deck.shift();
            if (card.key == 11) {
                card.tween({
                        x: deckConfig.CAT_X[this.cats],
                        y: deckConfig.CAT_Y[this.cats],
                        duration: 200,
                        ease: 'Quart.out'
                    });
                this.cats ++;
            } else {
                this.scene.deckStack.push(card);
            }
        }

    }

    setDragEvents() {
        const card = this.topCard;

        card.removeAllListeners();

        card.setDraggable(true);

        card.on('pointerdown', () => {

            if (!card.draggable) return;
            card.dragging = true;

            card.setDepth(2);
            card.oX = card.x;
            card.oY = card.y;

        });

        card.on('drag', (pointer, dragX, dragY) => {

            if (!card.dragging) return;

            card.setPosition(dragX, dragY);

        });


        card.on('dragend', () => {

            if (!card.dragging) return;
            card.dragging = false;

            card.setDepth(0);

            card.back();

        });
    }

    setDefaultCard() {
        this.topCard = new Card(this.scene, playConfig.X, playConfig.Y, cardConfig.SCALE, null, 'play', false);
        this.array.push(this.topCard);
    }

    setDropZone(bool) {
        this.topCard.setDropZone(bool);
    }
}