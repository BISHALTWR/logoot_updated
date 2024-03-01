import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

const app = express();
const events = [];
const cursors = {};

app.use(express.json());

function serve(res, file) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const filePath = join(__dirname, file);
  const stat = fs.statSync(filePath);
  const contentType = file.endsWith(".js") ? "text/javascript" : "text/html";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": stat.size,
  });

  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
}

function handleOptionsRequest(req, res) {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end();
}

function handleSendRequest(req, res) {
  const params = req.body;
  events.push(params);
  console.log("/snd", req.body);
  res.set("Access-Control-Allow-Origin", "*");
  res.send("ok");
}

function handleReceiveRequest(req, res) {
  const params = req.body;
  const clientId = params.clientId;
  const data = [];
  if (typeof cursors[clientId] === "undefined") cursors[clientId] = 0;
  for (let idx = cursors[clientId]; idx < events.length; idx++) {
    const event = events[idx];
    data.push(event);
  }
  cursors[clientId] = events.length;
  res.set("Access-Control-Allow-Origin", "*");
  res.json(data);
}

app.options("*", handleOptionsRequest);
app.get("/", (req, res) => serve(res, "index.html"));
app.get("/*.js", (req, res) => serve(res, req.path));
app.post("/snd", handleSendRequest);
app.post("/rcv", handleReceiveRequest);

app.use((req, res) => {
  res.status(404).send("not found");
});

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).send("Internal Server Error");
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
