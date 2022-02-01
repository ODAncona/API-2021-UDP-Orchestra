import { v4 as uuidv4 } from 'uuid';
import { INSTRUMENTS } from './instruments.js';
import { HOSTNAME, PORT } from './network.js';
import { argv } from 'process';
import dgram from 'dgram';

// Check arguments
if (argv.length < 3) {
  console.log("Not enough arguments");
  process.exit(1);
}

// Check instrument
const instrument = argv[2];
if (!Object.keys(INSTRUMENTS).includes(instrument)) {
  console.log("The instrument don't exist, here are all instruments available:");
  Object.entries(INSTRUMENTS).forEach((i) =>
    console.log("-",i[0])
  );
  process.exit(1);
}

// Initialise musician
const INTERVAL = 1000;
const sound = INSTRUMENTS[instrument];
const payload = {
  uuid: uuidv4(),
  sound: sound,
}

// UDP Socket creation
const socket = dgram.createSocket('udp4');


setInterval(() => socket.send(JSON.stringify(payload), PORT, HOSTNAME), INTERVAL);
