import { pos, cardConfig } from './Config.js'

export class Card extends Phaser.GameObjects.Sprite {

    constructor(scene, x, y, scale, key, flip) {
        super(scene, x, y, 'cards', flip ? key : 12)
            .setScale(scale)
            .setInteractive()
            .setData({
                key,
                scale
            });

        scene.add.existing(this);
    }

    tween(data) {
        if (!this.scene || !this.scene.tweens) return;

        // Wrap callbacks to check scene existence
        const wrapCallback = (cb) => {
            if (!cb) return undefined;
            return (...args) => {
                if (this.scene) cb.apply(this, args);
            };
        };

        // Clone data to avoid mutating the original object
        if (!data.targets) {
            data.targets = this;
        }
        const tweenData = data;

        if (tweenData.onComplete) tweenData.onComplete = wrapCallback(tweenData.onComplete);
        if (tweenData.onUpdate) tweenData.onUpdate = wrapCallback(tweenData.onUpdate);
        if (tweenData.onYoyo) tweenData.onYoyo = wrapCallback(tweenData.onYoyo);
        if (tweenData.onRepeat) tweenData.onRepeat = wrapCallback(tweenData.onRepeat);

        this.scene.tweens.add(tweenData);
    }

    countween(data) {
        if (!this.scene || !this.scene.tweens) return;

        // Wrap callbacks to check scene existence
        const wrapCallback = (cb) => {
            if (!cb) return undefined;
            return (...args) => {
                if (this.scene) cb.apply(this, args);
            };
        };

        // Clone data to avoid mutating the original object
        const tweenData = { ...data };

        if (tweenData.onComplete) tweenData.onComplete = wrapCallback(tweenData.onComplete);
        if (tweenData.onUpdate) tweenData.onUpdate = wrapCallback(tweenData.onUpdate);
        if (tweenData.onYoyo) tweenData.onYoyo = wrapCallback(tweenData.onYoyo);
        if (tweenData.onRepeat) tweenData.onRepeat = wrapCallback(tweenData.onRepeat);

        this.scene.tweens.addCounter(tweenData);
    }

    flip(bool, onComplete = () => {}) {
        if (bool == (this.frame.name == 12)) {
            this.tween({
                scaleX: 0,
                duration: 100,
                ease: 'Sine.in',
                onComplete: () => {
                    this.setFrame(bool ? this.getData('key') : 12);
                    this.tween({
                        targets: this,
                        scaleX: this.getData('scale'),
                        duration: 100,
                        ease: 'Sine.out',
                        onComplete: onComplete
                    });
                }
            });
        }
        return this;
    }

    peek(key, onComplete = () => {}) {
        this.peeking = true;
        this.setData('key', key)
        this.flip(true, async () => {
            this.tween({
                targets: { dummy: 0 },
                dummy: 1000,
                duration: 1000,
                onComplete: () => {
                    if (this.dontFlipAfterPeek) {
                        this.dontFlipAfterPeek = false;
                        this.peeking = false;
                        onComplete();
                    } else {
                        this.flip(false, () => {
                            this.peeking = false;
                            if (this.dontFlipAfterPeek) {
                                // Whoops, we already flipped back
                                this.dontFlipAfterPeek = false;
                                this.flip(true, () => {
                                    onComplete();
                                });
                            } else {
                                this.setData('key', null);
                                onComplete();
                            }
                        });
                    }
                }
            });
        });
        return this;
    }

    back(onComplete = () => {}) {
        this.disableInteractive(true);
        this.tween({
            x: this.getData('x'),
            y: this.getData('y'),
            duration: 300,
            ease: 'Back.out',
            onComplete: () => {
                this.setInteractive(true);
                onComplete();
            }
        });
        return this;
    }

    highlight(hex, onComplete = () => {}) {
        const ms = 1000
        this.countween({
            from: 0,
            to: ms,
            duration: ms,
            yoyo: true,
            hold: 0,
            ease: 'Sine.inout',
            onUpdate: (tween) => {
                const v = tween.getValue() / ms;
                this.setTint(this.whiten(hex, v/2));
            },
            onComplete: () => {
                this.clearTint();
                onComplete();
            }
        });
        return this;
    }

    tint(hex) {
        this.setTint(this.whiten(hex, 0.5));
        return this;
    }

    whiten(hex, value) {
        const white = Phaser.Display.Color.ValueToColor(0xffffff);
        const color = Phaser.Display.Color.ValueToColor(hex);
        const r = Phaser.Math.Interpolation.Linear([white.red, color.red], value);
        const g = Phaser.Math.Interpolation.Linear([white.green, color.green], value);
        const b = Phaser.Math.Interpolation.Linear([white.blue, color.blue], value);
        const tint = Phaser.Display.Color.GetColor(r, g, b);
        return tint;
    }

    setDraggable(bool) {
        if (this.scene && this.input) {
            this.scene.input.setDraggable(this, bool);
        }
        return this;
    }

    setDropZone(bool) {
        if (this.input) {
            this.input.dropZone = bool;
        }
        console.log('set drop zone for card ' + this.getData('type') + ' ' + this.getData('key') + ' to ' + bool);
        return this;
    }
}