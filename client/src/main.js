import { Menu } from './scenes/Menu.js';
import { Lobby } from './scenes/Lobby.js';
import { Game } from './scenes/Game.js';
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

const config = {
    type: Phaser.AUTO,
    title: 'GATO',
    description: '',
    parent: 'game-container',
	dom: {
        createContainer: true
    },
	plugins: {
		scene: [
			{
				key: 'rexUI',
				plugin: RexUIPlugin,
				mapping: 'rexUI'
			}
		]
    },
    width: 1920,
    height: 1080,
    backgroundColor: '#aaaaaa',
    pixelArt: false,
    scene: [
        Menu,
        Lobby,
        Game,
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    autoPause: false
}

new Phaser.Game(config);
            