const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { Deepgram } = require('@deepgram/sdk');
require('dotenv').config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*", // For production, you should restrict this to your frontend's URL
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    let dgSocket;

    socket.on('start-transcription', () => {
      console.log(`[${socket.id}] Starting transcription...`);
      
      dgSocket = deepgram.transcription.live({
        punctuate: true,
        interim_results: true,
        model: 'nova-2',
        language: 'en-US',
        vad_events: true,
      });

      dgSocket.addListener('open', () => {
        console.log(`[${socket.id}] Deepgram connection opened.`);
      });

      dgSocket.addListener('transcript', (transcription) => {
        socket.emit('transcript-result', transcription);
      });

      dgSocket.addListener('error', (error) => {
        console.error(`[${socket.id}] Deepgram error:`, error);
      });

      dgSocket.addListener('close', () => {
        console.log(`[${socket.id}] Deepgram connection closed.`);
      });
    });
    
    socket.on('microphone-stream', (stream) => {
      if (dgSocket && dgSocket.getReadyState() === 1) {
        dgSocket.send(stream);
      }
    });

    socket.on('disconnect', () => {
      console.log('👋 Client disconnected:', socket.id);
      if (dgSocket) {
        dgSocket.finish();
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`🚀 Ready on http://localhost:${PORT}`);
  });
}); 