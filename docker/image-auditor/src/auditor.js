import { INSTRUMENTS } from './instruments.js';
import { MULTICAST_ADDRESS, UDP_PORT, TCP_PORT } from './network.js';
import dgram from 'dgram';
import net from 'net';

//____________________________________________________________________________
// Initialisation
// Variables
const ACTIVE_TIME = 5000;
const orchestra = Object.entries(INSTRUMENTS);
const musicians = new Map();

// Network
const serverUDP = dgram.createSocket('udp4');
const serverTCP = net.createServer();

//____________________________________________________________________________
// UDP Server
// Socket will listen for datagram on HOSTNAME:PORT
serverUDP.bind(UDP_PORT, () => {
  serverUDP.addMembership(MULTICAST_ADDRESS);
});

// Socket listening event callback
serverUDP.on('listening', () => {
  const address = serverUDP.address();
  console.log(`UDP socket listening on ${address.address}:${address.port}`);
});

// Socket message callback
serverUDP.on('message', (message, rinfo) => {
  const msg = JSON.parse(message);

  // Variables
  const uuid = msg.uuid;
  const musician = musicians.get(uuid);
  let now = Date.now();

  if (musician) {
    // Musician already exists
    musician.lastNote = now;
    musicians.set(uuid, musician);
  } else {
    // Add a new musician
    let instrument = orchestra.filter(pair => pair[1] == msg.sound)[0][0];
    let musician = {
      instrument: instrument,
      activeSince: now,
      lastNote: now,
    }
    musicians.set(uuid, musician);
    console.log("new Musician added");
  }
});

//____________________________________________________________________________
// TCP Server
serverTCP.listen(TCP_PORT);

serverTCP.on('connection', (conn) => {
  const now = Date.now();
  const output = [];

  // Clear inactive musicians and prepare the list of active musicians
  for (let entry of musicians.entries()) {
    let key = entry[0]; // Musician's UUID
    let mus = entry[1]; // Musician object

    if (now - mus.lastNote >= ACTIVE_TIME) {
      musicians.delete(key);
    } else {
      output.push({
        uuid: key,
        instrument: mus.instrument,
        activeSince: new Date(mus.activeSince)
      });
    }
  }

  conn.write(JSON.stringify(output));
  conn.write("\n");
  conn.end();
})
