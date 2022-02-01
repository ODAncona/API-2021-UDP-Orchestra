import { v4 as uuidv4 } from 'uuid';
import { INSTRUMENTS } from './instruments.js';
import dgram from 'dgram';

// UDP Socket creation
const socket = dgram.createSocket('udp4');

// arguments
const instrument = process.argv[2];
const sound = INSTRUMENTS[instrument];
console.log(sound);
console.log(uuidv4());
