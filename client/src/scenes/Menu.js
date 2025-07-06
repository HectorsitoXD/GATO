import { Button } from '../objects/Button.js'
import { TextInput } from '../objects/TextInput.js'
import { pos, uiConfig } from '../objects/Config.js'

export class Menu extends Phaser.Scene {

    constructor() {
        super('Menu');
    }

    preload() {
    }

    create() {
        this.socket = io('http://localhost:8081');

        const title = new Button(this, pos.X(50), pos.Y(25), pos.X(37), pos.Y(25), uiConfig.COLOR, 'GATO', pos.Y(20), 'bold', 'white');

        const code = new TextInput(this, pos.X(50), pos.Y(50), pos.X(20), pos.Y(10), 8, 'Room code',
            'Enter a room code. Anyone can join your room with this code.', pos.Y(5), '#ffffff'
        );

        const nick = new TextInput(this, pos.X(50), pos.Y(65), pos.X(20), pos.Y(10), 8, 'Nickname',
            'Enter your nickname. This will be displayed in the game.', pos.Y(5), '#ffffff'
        );

        const play = new Button(this, pos.X(50), pos.Y(80), pos.X(20), pos.Y(10), uiConfig.COLOR, '😺 Play 🐭', pos.Y(5), 'bold', 'white', () => {
            this.socket.emit('joinRequest', {
                code: code.text,
                nick: nick.text
            }, (bool, data) => {
                if (bool) {
                    data.socket = this.socket;
                    this.scene.start('Lobby', data);
                } else {
                    // Display data (which is an error message)
                }
            });
        });
    }

    update() {
    }
}
