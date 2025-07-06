import { uiConfig } from './Config.js';
import InputText from 'phaser3-rex-plugins/plugins/inputtext.js';

export class TextInput extends InputText {

    constructor(scene, x, y, width, height, max, placeholder, tooltip, size = 40, color = '#ffffff', align = 'center') {

        super(scene, x, y, width, height, {
            type: 'text',
            text: '',
            maxLength: max,
            placeholder: placeholder,
            tooltip: tooltip,
            fontFamily: uiConfig.FONT,
            fontSize: size + 'px',
            color: color,
            backgroundColor: uiConfig.COLOR_STRING,
            borderRadius: uiConfig.BABEL + 'px',
            align: align,
        }).setOrigin(0.5);

        scene.add.existing(this);
    }
}