import http from 'http';
import fileSystem from 'fs';
import pathLib from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const events = [];
const cursors = {};

function serve(res, file) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const filePath = pathLib.join(__dirname, file);
  const stat = fileSystem.statSync(filePath);
  const contentType = file.endsWith('.js') ? 'text/javascript' : 'text/html';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size
  });

  const readStream = fileSystem.createReadStream(filePath);
  readStream.pipe(res);
}

function handleOptionsRequest(res) {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end();
}

function handleSendRequest(res, reqBody) {
  const params = JSON.parse(reqBody);
  events.push(params);
  console.log('/snd', reqBody);
  res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
  res.end('ok');
}

function handleReceiveRequest(res, reqBody) {
  const params = JSON.parse(reqBody);
  const clientId = params.clientId;
  const data = [];
  if (typeof cursors[clientId] === 'undefined') cursors[clientId] = 0;
  for (let idx = cursors[clientId]; idx < events.length; idx++) {
    const event = events[idx];
    data.push(event);
  }
  cursors[clientId] = events.length;
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  let reqBody = '';
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  req.on('data', (data) => reqBody += data);
  req.on('end', () => {
    const path = req.url;
    if (req.method === 'OPTIONS') {
      handleOptionsRequest(res);
    } else if (path === '/') {
      serve(res, 'index.html');
    } else if (path.endsWith('.js')) {
      serve(res, path);
    } else {
      try {
        if (path === '/snd') {
          handleSendRequest(res, reqBody);
        } else if (path === '/rcv') {
          handleReceiveRequest(res, reqBody);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
          res.end('not found');
        }
      } catch (error) {
        console.error('Error parsing JSON data:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Internal Server Error');
      }
    }
  });
});

server.listen(8080);