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

        this.topCard.setDraggable(false)
            .setDepth(1);

        this.topCard.type = 'play';
        this.topCard.oScale = cardConfig.SCALE;

        if (this.bottomCard) {
            this.bottomCard.off()
                .removeInteractive()
                .setDepth(0);
        }

        card.tween({
            scaleX: cardConfig.SCALE,
            scaleY: cardConfig.SCALE,
            duration: 200,
            ease: 'Quart.out'
        });

        card.tween({
            x: playConfig.X,
            y: playConfig.Y,
            duration: 200,
            ease: 'Quart.out',
            onComplete: () => {
                
                card.flip(true);

                card.setDraggable(true)
                    .setDepth(0);

                this.setDragEvents();
            }
        });
    }
    
    drawPlay(key) {
        const card = this.scene.deckStack.pop();
        card.key = key;
        this.play(card);
    }

    reshuffle() {

        const deck = this.array.splice(0, this.array.length - 2);

        let len = deck.length;
        for (let i = 0; i < deck.length; i++) {
            if (deck[i].key == 11) {
                len --;
            }
        }

        for (let i = 0; i < len; i++) {
            const card = deck.pop();
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

        card.on('dragstart', () => {

            card.setDepth(2);
            card.oX = card.x;
            card.oY = card.y;

        });

        card.on('drag', (pointer, dragX, dragY) => {

            card.setPosition(dragX, dragY);

        });


        card.on('dragend', () => {

            card.setDepth(0);

            card.back();

        });
    }

    setDefaultCard() {
        this.topCard = new Card(this.scene, playConfig.X, playConfig.Y, cardConfig.SCALE, null, 'play', false);
    }

    setDropZone(bool) {
        this.topCard.setDropZone(bool);
    }
}