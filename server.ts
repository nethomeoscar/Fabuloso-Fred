import express from "express";
import { createServer as createHttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createServer as createViteServer } from "vite";

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = dirname(__filename);
const path = require('path');

interface Player {
  id: string;
  name: string;
  score: number;
  lives: number;
  failed: boolean;
}

interface Room {
  id: string;
  boardId: string; // 'classic' | 'radial' | 'hex'
  mode: 'sudden_death' | 'lives'; // standard sudden death vs 3 lives
  players: Player[];
  status: 'waiting' | 'countdown' | 'playing' | 'gameover';
  sequence: number[];
  currentIndex: number; // index of the button the active player is repeating
  turnPlayerId: string | null;
  winnerId: string | null;
}

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Store active game rooms
  const rooms: Map<string, Room> = new Map();

  // Helper to generate a random 4-letter room code
  function generateRoomCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness
    if (rooms.has(code)) {
      return generateRoomCode();
    }
    return code;
  }

  // Get count of buttons for a board
  function getButtonCount(boardId: string): number {
    if (boardId === "classic") return 4;
    if (boardId === "hex") return 7;
    if (boardId === "radial") return 8;
    return 4;
  }

  // Generate next step for sequence
  function addNextStep(room: Room) {
    const count = getButtonCount(room.boardId);
    const nextVal = Math.floor(Math.random() * count);
    room.sequence.push(nextVal);
  }

  // Socket.io matchmaking & gameplay handlers
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Create a new custom private room
    socket.on("create_room", (data: { playerName: string; boardId: string; mode: 'sudden_death' | 'lives' }) => {
      const { playerName, boardId, mode } = data;
      const roomCode = generateRoomCode();

      const newPlayer: Player = {
        id: socket.id,
        name: playerName || "Jugador A",
        score: 0,
        lives: mode === "lives" ? 3 : 1,
        failed: false
      };

      const newRoom: Room = {
        id: roomCode,
        boardId: boardId || "classic",
        mode: mode || "sudden_death",
        players: [newPlayer],
        status: "waiting",
        sequence: [],
        currentIndex: 0,
        turnPlayerId: null,
        winnerId: null
      };

      rooms.set(roomCode, newRoom);
      socket.join(roomCode);

      socket.emit("room_created", {
        roomCode,
        room: newRoom,
        myPlayerId: socket.id
      });

      console.log(`Room created: ${roomCode} by ${newPlayer.name}`);
    });

    // Join a room with code
    socket.on("join_room", (data: { playerName: string; roomCode: string }) => {
      const { playerName, roomCode } = data;
      const code = (roomCode || "").trim().toUpperCase();
      const room = rooms.get(code);

      if (!room) {
        socket.emit("error_message", "La sala no existe o el código es incorrecto.");
        return;
      }

      if (room.players.length >= 2) {
        socket.emit("error_message", "La sala ya está llena.");
        return;
      }

      const newPlayer: Player = {
        id: socket.id,
        name: playerName || "Jugador B",
        score: 0,
        lives: room.mode === "lives" ? 3 : 1,
        failed: false
      };

      room.players.push(newPlayer);
      socket.join(code);

      // Sincronizar el tablero del host con el jugador que se une
      socket.emit("room_joined", {
        roomCode: code,
        room,
        myPlayerId: socket.id
      });

      // Notificar al host que el rival se ha conectado
      io.to(code).emit("player_joined", {
        room,
        joinedPlayer: newPlayer
      });

      console.log(`Player ${newPlayer.name} joined room: ${code}`);

      // Auto start game countdown
      startGameCountdown(code);
    });

    // Quick Matchmaking (Find or Create a public room)
    socket.on("join_quick_match", (data: { playerName: string; boardId: string }) => {
      const { playerName, boardId } = data;

      // Find an existing public room with 1 player waiting
      let matchedRoom: Room | null = null;
      for (const [code, r] of rooms.entries()) {
        if (r.status === "waiting" && r.players.length === 1 && r.boardId === boardId) {
          matchedRoom = r;
          break;
        }
      }

      if (matchedRoom) {
        // Join existing room
        const code = matchedRoom.id;
        const newPlayer: Player = {
          id: socket.id,
          name: playerName || `Jugador B`,
          score: 0,
          lives: matchedRoom.mode === "lives" ? 3 : 1,
          failed: false
        };

        matchedRoom.players.push(newPlayer);
        socket.join(code);

        socket.emit("room_joined", {
          roomCode: code,
          room: matchedRoom,
          myPlayerId: socket.id
        });

        io.to(code).emit("player_joined", {
          room: matchedRoom,
          joinedPlayer: newPlayer
        });

        console.log(`Quick match found! ${newPlayer.name} joined room ${code}`);
        startGameCountdown(code);
      } else {
        // Create a new public room
        const roomCode = generateRoomCode();
        const newPlayer: Player = {
          id: socket.id,
          name: playerName || `Jugador A`,
          score: 0,
          lives: 1, // Default to sudden death for quick match
          failed: false
        };

        const newRoom: Room = {
          id: roomCode,
          boardId: boardId || "classic",
          mode: "sudden_death",
          players: [newPlayer],
          status: "waiting",
          sequence: [],
          currentIndex: 0,
          turnPlayerId: null,
          winnerId: null
        };

        rooms.set(roomCode, newRoom);
        socket.join(roomCode);

        socket.emit("room_created", {
          roomCode,
          room: newRoom,
          myPlayerId: socket.id
        });

        console.log(`Quick match room created: ${roomCode} by ${newPlayer.name}`);
      }
    });

    // Handle user tap move
    socket.on("tap_button", (data: { roomCode: string; buttonIndex: number }) => {
      const { roomCode, buttonIndex } = data;
      const code = (roomCode || "").toUpperCase();
      const room = rooms.get(code);

      if (!room || room.status !== "playing") return;
      if (room.turnPlayerId !== socket.id) return;

      const activePlayer = room.players.find(p => p.id === socket.id);
      const otherPlayer = room.players.find(p => p.id !== socket.id);
      if (!activePlayer || !otherPlayer) return;

      // Broadcast tap event to other player for real-time visualization
      socket.to(code).emit("rival_tapped", { buttonIndex });

      // Validate move
      const expectedIndex = room.sequence[room.currentIndex];

      if (buttonIndex === expectedIndex) {
        // Correct step!
        room.currentIndex++;

        // Has completed the full sequence?
        if (room.currentIndex >= room.sequence.length) {
          // Success! Update active player score
          activePlayer.score++;
          room.currentIndex = 0;

          // Grow sequence
          addNextStep(room);

          // Change turn
          room.turnPlayerId = otherPlayer.id;

          // Broadcast sequence updated & play it
          io.to(code).emit("sequence_success", {
            room,
            completedPlayerId: activePlayer.id,
            nextPlayerId: otherPlayer.id,
            sequence: room.sequence
          });
        } else {
          // Progress within sequence
          socket.emit("step_success", { currentIndex: room.currentIndex });
        }
      } else {
        // Error made!
        if (room.mode === "sudden_death") {
          // Sudden death: Lose instantly!
          activePlayer.lives = 0;
          activePlayer.failed = true;
          room.status = "gameover";
          room.winnerId = otherPlayer.id;

          io.to(code).emit("game_over", {
            room,
            failedPlayerId: activePlayer.id,
            winnerId: otherPlayer.id,
            reason: "sudden_death"
          });
        } else {
          // Lives mode: lose 1 life
          activePlayer.lives--;
          if (activePlayer.lives <= 0) {
            activePlayer.failed = true;
            room.status = "gameover";
            room.winnerId = otherPlayer.id;

            io.to(code).emit("game_over", {
              room,
              failedPlayerId: activePlayer.id,
              winnerId: otherPlayer.id,
              reason: "out_of_lives"
            });
          } else {
            // Failed, reset current sequence index so player must retry the sequence
            room.currentIndex = 0;
            io.to(code).emit("step_failed_life_lost", {
              room,
              failedPlayerId: activePlayer.id,
              livesLeft: activePlayer.lives
            });
          }
        }
      }
    });

    // Restart game in the same room
    socket.on("restart_game", (data: { roomCode: string }) => {
      const { roomCode } = data;
      const code = (roomCode || "").toUpperCase();
      const room = rooms.get(code);

      if (!room) return;

      // Reset players
      room.players.forEach(p => {
        p.score = 0;
        p.lives = room.mode === "lives" ? 3 : 1;
        p.failed = false;
      });

      room.status = "waiting";
      room.sequence = [];
      room.currentIndex = 0;
      room.turnPlayerId = null;
      room.winnerId = null;

      io.to(code).emit("game_reset", { room });

      // Start countdown
      startGameCountdown(code);
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);

      // Find rooms where this socket was a player
      for (const [code, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          // Remove player
          const disconnectedPlayer = room.players[playerIndex];
          room.players.splice(playerIndex, 1);

          if (room.players.length === 0) {
            // Delete room if empty
            rooms.delete(code);
            console.log(`Room ${code} deleted (empty)`);
          } else {
            // If the game was active, the remaining player wins by default
            if (room.status === "playing" || room.status === "countdown") {
              room.status = "gameover";
              const remainingPlayer = room.players[0];
              room.winnerId = remainingPlayer.id;

              io.to(code).emit("opponent_left", {
                room,
                disconnectedName: disconnectedPlayer.name,
                winnerId: remainingPlayer.id
              });
            } else {
              // Just notify waiting lobby
              io.to(code).emit("player_left", {
                room,
                disconnectedName: disconnectedPlayer.name
              });
            }
          }
        }
      }
    });
  });

  // Start the countdown sequence for a room
  function startGameCountdown(roomCode: string) {
    const room = rooms.get(roomCode);
    if (!room || room.players.length < 2) return;

    room.status = "countdown";
    io.to(roomCode).emit("game_countdown_start", { room });

    // 3 seconds countdown
    setTimeout(() => {
      const activeRoom = rooms.get(roomCode);
      if (!activeRoom || activeRoom.players.length < 2) return;

      activeRoom.status = "playing";

      // Initialize the sequence with 3 steps
      activeRoom.sequence = [];
      const count = getButtonCount(activeRoom.boardId);
      for (let i = 0; i < 3; i++) {
        activeRoom.sequence.push(Math.floor(Math.random() * count));
      }

      activeRoom.currentIndex = 0;
      // Host goes first (players[0])
      activeRoom.turnPlayerId = activeRoom.players[0].id;

      io.to(roomCode).emit("game_start", {
        room: activeRoom,
        firstPlayerId: activeRoom.turnPlayerId,
        sequence: activeRoom.sequence
      });

      console.log(`Game started in room ${roomCode} with sequence: ${activeRoom.sequence}`);
    }, 3000);
  }

  // --- Vite Middleware and Asset Serving ---

  // Express JSON parser
  app.use(express.json());

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", activeRooms: rooms.size });
  });

  // Get active public rooms for optional lobby display
  app.get("/api/rooms", (req, res) => {
    const activeList = Array.from(rooms.values()).map(r => ({
      id: r.id,
      boardId: r.boardId,
      mode: r.mode,
      playersCount: r.players.length,
      status: r.status
    }));
    res.json(activeList);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});
