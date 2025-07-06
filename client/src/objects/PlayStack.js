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
            .setData('type', 'play')
            .setData('scale', cardConfig.SCALE)
            .setDepth(1);

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
                
                if (card.peeking) {
                    card.dontFlipAfterPeek = true;
                } else {
                    card.flip(true);
                }

                card.setDraggable(true)
                    .setDepth(0);

                this.setDragEvents();
            }
        });
    }
    
    drawPlay(key) {
        this.play(this.scene.deckStack.pop().setData('key', key));
    }

    reshuffle() {

        const deck = this.array.splice(0, this.array.length - 2);

        let len = deck.length;
        for (let i = 0; i < deck.length; i++) {
            if (deck[i].getData('key') == 11) {
                len --;
            }
        }

        for (let i = 0; i < len; i++) {
            const card = deck.pop();
            if (card.getData('key') == 11) {
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

            card.setDepth(1)
                .setData('x', card.x)
                .setData('y', card.y);

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
        this.topCard = new Card(this.scene, playConfig.X, playConfig.Y, cardConfig.SCALE, null, false)
            .setData('type', 'play');
    }

    setDropZone(bool) {
        this.topCard.setDropZone(bool);
    }
}