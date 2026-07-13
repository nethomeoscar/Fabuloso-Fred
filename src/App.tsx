import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { 
  Trophy, 
  Gamepad2, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Flame, 
  Heart, 
  LogOut, 
  Users, 
  Play, 
  Loader2, 
  CheckCircle, 
  Timer,
  Swords,
  Tv,
  HelpCircle,
  Copy,
  Check
} from "lucide-react";

import { BoardId, GameMode, LocalGameState, OnlineRoom } from "./types";
import { playBoardTone, playErrorBuzz, playSuccessChime } from "./utils/audio";

import Lobby from "./components/Lobby";
import BoardClassic from "./components/BoardClassic";
import BoardRadial from "./components/BoardRadial";
import BoardHex from "./components/BoardHex";
import DiagnosticCard from "./components/DiagnosticCard";

// Delay utility helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  // Game Setup States
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [boardId, setBoardId] = useState<BoardId>("classic");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Single Player (Local) States
  const [localState, setLocalState] = useState<LocalGameState>({
    boardId: "classic",
    sequence: [],
    currentIndex: 0,
    isPlayingSequence: false,
    score: 0,
    highScore: 0,
    lives: 1,
    maxLives: 1,
    gameStatus: "idle",
    speedMs: 800,
    clicksCount: 0,
    totalClickDurationMs: 0,
    clickStartTime: null,
    diagnostic: null,
  });

  const [activeButtonIndex, setActiveButtonIndex] = useState<number | null>(null);

  // Multiplayer (Online) States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<OnlineRoom | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  
  // Game Status HUD descriptions
  const [hudMessage, setHudMessage] = useState<string>("¡Bienvenido a Cyber Simon!");
  const [hudSubMessage, setHudSubMessage] = useState<string>("Selecciona un modo de juego.");
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isPlayingSeqOnline, setIsPlayingSeqOnline] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Timing references for response speed tracking
  const lastClickTimeRef = useRef<number | null>(null);

  // Timing reference to debounce double triggers (touch + mouse)
  const lastPressTimeRef = useRef<number>(0);

  // Ref to queue online actions while Socket.io is establishing connection
  const pendingActionRef = useRef<{
    type: "create" | "join" | "quick";
    playerName: string;
    boardId: BoardId;
    mode?: "sudden_death" | "lives";
    roomCode?: string;
  } | null>(null);

  // Initialize offline high score
  useEffect(() => {
    const cachedHighScore = localStorage.getItem("fabulous_fred_high_score");
    const cachedBestSpeed = localStorage.getItem("fabulous_fred_best_speed");
    if (cachedHighScore) {
      setLocalState(prev => ({
        ...prev,
        highScore: parseInt(cachedHighScore, 10),
      }));
    }
  }, []);

  // Sync Socket.io connection when entering online mode
  useEffect(() => {
    if (gameMode === "online" && !socket) {
      setIsConnecting(true);
      const newSocket = io();

      newSocket.on("connect", () => {
        console.log("Connected to server:", newSocket.id);
        setIsConnecting(false);
        setLobbyError(null);

        // Process any queued matchmaking action that initiated this connection
        if (pendingActionRef.current) {
          const action = pendingActionRef.current;
          pendingActionRef.current = null; // Clear queue

          if (action.type === "create") {
            newSocket.emit("create_room", {
              playerName: action.playerName,
              boardId: action.boardId,
              mode: action.mode,
            });
          } else if (action.type === "join") {
            newSocket.emit("join_room", {
              playerName: action.playerName,
              roomCode: action.roomCode,
            });
          } else if (action.type === "quick") {
            newSocket.emit("join_quick_match", {
              playerName: action.playerName,
              boardId: action.boardId,
            });
          }
        }
      });

      newSocket.on("connect_error", () => {
        setIsConnecting(false);
        setLobbyError("Error de conexión con el servidor. Inténtalo más tarde.");
      });

      // Matchmaking & Lobby Events
      newSocket.on("room_created", (data: { roomCode: string; room: OnlineRoom; myPlayerId: string }) => {
        setRoomCode(data.roomCode);
        setRoomState(data.room);
        setMyPlayerId(data.myPlayerId);
        setBoardId(data.room.boardId);
        setHudMessage(`Sala creada: ${data.roomCode}`);
        setHudSubMessage("Esperando a que se una el rival...");
      });

      newSocket.on("room_joined", (data: { roomCode: string; room: OnlineRoom; myPlayerId: string }) => {
        setRoomCode(data.roomCode);
        setRoomState(data.room);
        setMyPlayerId(data.myPlayerId);
        setBoardId(data.room.boardId); // Sincronizar tablero automáticamente con el elegido por el host
        setHudMessage(`Sala unida: ${data.roomCode}`);
        setHudSubMessage("Conectando con el oponente...");
      });

      newSocket.on("player_joined", (data: { room: OnlineRoom; joinedPlayer: any }) => {
        setRoomState(data.room);
        setHudMessage("¡Rival conectado!");
        setHudSubMessage(`${data.joinedPlayer.name} se ha unido. Iniciando en breve...`);
      });

      newSocket.on("error_message", (msg: string) => {
        setLobbyError(msg);
        setIsConnecting(false);
      });

      // Gameplay Events
      newSocket.on("game_countdown_start", (data: { room: OnlineRoom }) => {
        setRoomState(data.room);
        setIsFailed(false);
        setIsShaking(false);
        runCountdownHUD();
      });

      newSocket.on("game_start", async (data: { room: OnlineRoom; firstPlayerId: string; sequence: number[] }) => {
        setRoomState(data.room);
        setIsFailed(false);
        setIsShaking(false);
        const seq = data.sequence;
        const firstTurn = data.firstPlayerId === newSocket.id;

        setIsMyTurn(false); // Disable interaction during sequence playback
        if (firstTurn) {
          setHudMessage("¡Tu Turno!");
          setHudSubMessage("Memoriza y repite la secuencia de luces.");
          await playMultiplayerSequence(seq);
          setIsMyTurn(true); // Enable interaction only after sequence plays
        } else {
          setHudMessage("Turno del Rival");
          setHudSubMessage("El rival está memorizando la secuencia.");
          await playMultiplayerSequence(seq);
          setHudMessage("Rival Jugando");
          setHudSubMessage("Espera a que el rival complete la secuencia.");
        }
      });

      // Listen for when rival clicks a button
      newSocket.on("rival_tapped", (data: { buttonIndex: number }) => {
        flashButton(data.buttonIndex, 0.25);
      });

      newSocket.on("step_success", (data: { currentIndex: number }) => {
        // Current player made a correct progress step
        // We can show a small tip or indicator
      });

      newSocket.on("step_failed_life_lost", (data: { room: OnlineRoom; failedPlayerId: string; livesLeft: number }) => {
        setRoomState(data.room);
        const isMe = data.failedPlayerId === newSocket.id;
        
        if (soundEnabled) playErrorBuzz();
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 350);

        if (isMe) {
          setHudMessage("¡Has Fallado!");
          setHudSubMessage(`Has perdido una vida. Vidas restantes: ${data.livesLeft}`);
        } else {
          const rivalName = data.room.players.find(p => p.id === data.failedPlayerId)?.name || "Oponente";
          setHudMessage(`¡${rivalName} Falló!`);
          setHudSubMessage(`Perdió una vida. Retiene su turno para intentarlo de nuevo.`);
        }
      });

      newSocket.on("sequence_success", async (data: { 
        room: OnlineRoom; 
        completedPlayerId: string; 
        nextPlayerId: string; 
        sequence: number[] 
      }) => {
        setRoomState(data.room);
        const isMeNext = data.nextPlayerId === newSocket.id;
        setIsMyTurn(false); // Ensure turn is disabled during sequence playback

        if (soundEnabled) playSuccessChime();
        await delay(500);

        if (isMeNext) {
          setHudMessage("¡Tu Turno!");
          setHudSubMessage("¡Atento! Se ha añadido un nuevo color.");
          await playMultiplayerSequence(data.sequence);
          setIsMyTurn(true); // Enable turn only after sequence plays
        } else {
          setHudMessage("Turno del Rival");
          setHudSubMessage("El rival está memorizando la secuencia.");
          await playMultiplayerSequence(data.sequence);
          setHudMessage("Rival Jugando");
          setHudSubMessage("Espera a que el rival complete la secuencia.");
        }
      });

      newSocket.on("game_over", (data: { room: OnlineRoom; failedPlayerId: string; winnerId: string; reason: string }) => {
        setRoomState(data.room);
        const isMeWinner = data.winnerId === newSocket.id;
        
        if (soundEnabled) playErrorBuzz();
        setIsFailed(true);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 350);

        if (isMeWinner) {
          setHudMessage("¡VICTORIA!");
          setHudSubMessage("¡Tu rival se ha equivocado! Has ganado la partida.");
        } else {
          setHudMessage("¡DERROTA!");
          setHudSubMessage("Te has equivocado. El rival gana la partida.");
        }
      });

      newSocket.on("opponent_left", (data: { room: OnlineRoom; disconnectedName: string; winnerId: string }) => {
        setRoomState(data.room);
        setHudMessage("¡VICTORIA POR ABANDONO!");
        setHudSubMessage(`El oponente ${data.disconnectedName} se ha desconectado de la partida.`);
      });

      newSocket.on("player_left", (data: { room: OnlineRoom; disconnectedName: string }) => {
        setRoomState(data.room);
        setHudMessage("Lobby de Espera");
        setHudSubMessage(`El oponente ${data.disconnectedName} abandonó el lobby.`);
      });

      newSocket.on("game_reset", (data: { room: OnlineRoom }) => {
        setRoomState(data.room);
        setIsFailed(false);
        setIsShaking(false);
        setHudMessage("Reiniciando...");
        setHudSubMessage("Iniciando cuenta regresiva...");
      });

      setSocket(newSocket);
    }

    // Cleanup on unmount or mode exit
    return () => {
      if (gameMode !== "online" && socket) {
        socket.disconnect();
        setSocket(null);
        setRoomCode(null);
        setRoomState(null);
      }
    };
  }, [gameMode]);

  // Helper for countdown timer HUD displays
  async function runCountdownHUD() {
    setHudMessage("Iniciando en... 3");
    setHudSubMessage("¡Prepárate!");
    await delay(1000);
    setHudMessage("Iniciando en... 2");
    await delay(1000);
    setHudMessage("Iniciando en... 1");
    await delay(1000);
    setHudMessage("¡GO!");
    setHudSubMessage("¡Suerte!");
  }

  // --- FLASH BUTTON ANIMATION ---
  function flashButton(index: number, durationSec: number = 0.35) {
    setActiveButtonIndex(index);
    if (soundEnabled) {
      playBoardTone(boardId, index, durationSec);
    }
    setTimeout(() => {
      setActiveButtonIndex(null);
    }, durationSec * 1000);
  }

  // --- MULTIPLAYER SEQUENCE PLAYBACK ---
  async function playMultiplayerSequence(seq: number[]) {
    setIsPlayingSeqOnline(true);
    await delay(800);
    for (let i = 0; i < seq.length; i++) {
      const idx = seq[i];
      flashButton(idx, 0.4);
      await delay(550); // wait flash duration + space
    }
    setIsPlayingSeqOnline(false);
  }

  // --- SINGLE PLAYER (LOCAL) LOGIC ---
  const startLocalGame = (chosenBoard: BoardId) => {
    setBoardId(chosenBoard);
    setIsFailed(false);
    setIsShaking(false);

    // Initial sequence of length 1 (standard Simon starts with 1 and grows)
    const count = chosenBoard === "classic" ? 4 : chosenBoard === "hex" ? 7 : 8;
    const initialSeq = [Math.floor(Math.random() * count)];

    setLocalState((prev) => ({
      ...prev,
      boardId: chosenBoard,
      sequence: initialSeq,
      currentIndex: 0,
      isPlayingSequence: true,
      score: 0,
      lives: 1,
      maxLives: 1,
      gameStatus: "playing",
      clicksCount: 0,
      totalClickDurationMs: 0,
      clickStartTime: null,
      diagnostic: null,
    }));

    setHudMessage("Ronda 1");
    setHudSubMessage("Presta atención al patrón de luces.");

    // Kickoff sequence playback
    setTimeout(() => {
      playLocalSequence(initialSeq, chosenBoard);
    }, 800);
  };

  const playLocalSequence = async (seq: number[], activeBoard: BoardId) => {
    setLocalState((prev) => ({ ...prev, isPlayingSequence: true }));
    await delay(600);

    // Dynamic speed based on sequence length to increase tension!
    // Faster speeds for longer sequences
    let pace = 500;
    if (seq.length > 12) pace = 300;
    else if (seq.length > 8) pace = 380;
    else if (seq.length > 4) pace = 440;

    for (let i = 0; i < seq.length; i++) {
      const idx = seq[i];
      setActiveButtonIndex(idx);
      if (soundEnabled) {
        playBoardTone(activeBoard, idx, pace / 1000);
      }
      await delay(pace);
      setActiveButtonIndex(null);
      await delay(150);
    }

    setLocalState((prev) => ({ 
      ...prev, 
      isPlayingSequence: false, 
      clickStartTime: Date.now() 
    }));
    lastClickTimeRef.current = Date.now();
    setHudMessage("Tu Turno");
    setHudSubMessage(`Repite la secuencia de ${seq.length} paso${seq.length > 1 ? "s" : ""}.`);
  };

  const handleLocalButtonPress = (index: number) => {
    if (localState.isPlayingSequence || localState.gameStatus !== "playing") return;

    // Debounce to prevent double touch+mouse triggers
    const nowPress = Date.now();
    if (nowPress - lastPressTimeRef.current < 250) return;
    lastPressTimeRef.current = nowPress;

    // Track response speed
    const now = Date.now();
    let clickDelta = 0;
    if (lastClickTimeRef.current) {
      clickDelta = now - lastClickTimeRef.current;
    }
    lastClickTimeRef.current = now;

    // Trigger feedback flash & sound
    flashButton(index, 0.3);

    const expected = localState.sequence[localState.currentIndex];
    const isCorrect = index === expected;

    const nextIndex = localState.currentIndex + 1;
    const isSequenceComplete = nextIndex >= localState.sequence.length;

    setLocalState((prev) => {
      const updatedClicks = prev.clicksCount + 1;
      const updatedDuration = prev.totalClickDurationMs + clickDelta;

      if (isCorrect) {
        if (isSequenceComplete) {
          // Success! Prepare next round
          const nextScore = prev.score + 1;
          const count = prev.boardId === "classic" ? 4 : prev.boardId === "hex" ? 7 : 8;
          const nextSeq = [...prev.sequence, Math.floor(Math.random() * count)];

          // Trigger round transition
          setTimeout(() => {
            if (soundEnabled) playSuccessChime();
            setHudMessage(`¡Excelente!`);
            setHudSubMessage(`Completada ronda ${nextScore}.`);
            
            setLocalState((inner) => ({
              ...inner,
              score: nextScore,
              sequence: nextSeq,
              currentIndex: 0,
            }));

            // Play next sequence
            playLocalSequence(nextSeq, prev.boardId);
          }, 600);

          return {
            ...prev,
            clicksCount: updatedClicks,
            totalClickDurationMs: updatedDuration,
            currentIndex: 0,
            isPlayingSequence: true, // Lock input during transition
          };
        } else {
          // Progress in current sequence
          return {
            ...prev,
            clicksCount: updatedClicks,
            totalClickDurationMs: updatedDuration,
            currentIndex: nextIndex,
          };
        }
      } else {
        // Bad button pressed! GAME OVER
        if (soundEnabled) playErrorBuzz();
        setIsFailed(true);
        setIsShaking(true);
        
        // Reset shake
        setTimeout(() => setIsShaking(false), 350);

        const finalScore = prev.score;
        const finalClicks = updatedClicks;
        const finalDuration = updatedDuration;

        // Calculate average response speed
        const avgSpeed = finalClicks > 0 ? (finalDuration / finalClicks) / 1000 : 0;

        // Dynamic multiplier for boards
        // Tablero 4 Colores: 1x
        // Tablero 6/7 Colores: 1.5x
        // Tablero 8 Colores: 2x
        const multiplier = prev.boardId === "classic" ? 1.0 : prev.boardId === "hex" ? 1.5 : 2.0;

        // Manage High Score
        let currentHighScore = prev.highScore;
        let isNewRecord = false;
        
        if (finalScore > currentHighScore) {
          currentHighScore = finalScore;
          isNewRecord = true;
          localStorage.setItem("fabulous_fred_high_score", finalScore.toString());
          localStorage.setItem("fabulous_fred_best_speed", avgSpeed.toString());
        } else if (finalScore === currentHighScore && finalScore > 0) {
          // If they tie, check if this speed is faster to break the tie
          const cachedBestSpeed = localStorage.getItem("fabulous_fred_best_speed");
          const bestSpeedVal = cachedBestSpeed ? parseFloat(cachedBestSpeed) : 999;
          if (avgSpeed < bestSpeedVal) {
            isNewRecord = true;
            localStorage.setItem("fabulous_fred_best_speed", avgSpeed.toString());
          }
        }

        // Show Diagnostic Card after 1.1s delay
        setTimeout(() => {
          setLocalState((inner) => ({
            ...inner,
            gameStatus: "gameover",
            highScore: currentHighScore,
            diagnostic: {
              rank: getMemoryRank(finalScore * multiplier),
              feedback: getMemoryFeedback(finalScore * multiplier),
              percentage: finalClicks > 0 ? Math.min(100, Math.round((finalScore / finalClicks) * 100)) : 100,
              speed: `${avgSpeed.toFixed(2)}s por botón`,
            },
          }));
        }, 1100);

        setHudMessage("¡GAME OVER!");
        setHudSubMessage("Presionaste el botón equivocado.");

        return {
          ...prev,
          clicksCount: updatedClicks,
          totalClickDurationMs: updatedDuration,
          gameStatus: "idle",
        };
      }
    });
  };

  // Diagnostic helper text generators
  const getMemoryRank = (effScore: number): string => {
    if (effScore >= 17) return "Memoria Prodigiosa";
    if (effScore >= 13) return "Memoria Superior";
    if (effScore >= 9) return "Memoria Avanzada";
    if (effScore >= 5) return "Memoria Promedio (Estándar)";
    return "Memoria a Corto Plazo Distraída";
  };

  const getMemoryFeedback = (effScore: number): string => {
    if (effScore >= 17) return "¿Eres un bot? Tu capacidad de secuenciación es impecable. ¡Dominio total!";
    if (effScore >= 13) return "¡Impresionante! Tu enfoque y retención están muy por encima de la media. ¡Casi una mente fotográfica!";
    if (effScore >= 9) return "¡Excelente retención! Tienes una gran capacidad para organizar patrones visuales y auditivos.";
    if (effScore >= 5) return "¡Buen trabajo! Estás en el promedio de retención a corto plazo (el mágico número 7 ± 2).";
    return "¡Calentando motores! Te faltó un poco de concentración. Inténtalo de nuevo sin distracciones.";
  };

  // --- MULTIPLAYER (ONLINE) ACTIONS ---
  const handleStartLocalLobby = (chosenBoard: BoardId) => {
    setGameMode("local");
    startLocalGame(chosenBoard);
  };

  const handleJoinQuickMatch = (playerName: string, chosenBoard: BoardId) => {
    setGameMode("online");
    if (socket && socket.connected) {
      socket.emit("join_quick_match", { playerName, boardId: chosenBoard });
    } else {
      pendingActionRef.current = { type: "quick", playerName, boardId: chosenBoard };
    }
  };

  const handleCreatePrivateRoom = (playerName: string, chosenBoard: BoardId, mode: "sudden_death" | "lives") => {
    setGameMode("online");
    if (socket && socket.connected) {
      socket.emit("create_room", { playerName, boardId: chosenBoard, mode });
    } else {
      pendingActionRef.current = { type: "create", playerName, boardId: chosenBoard, mode };
    }
  };

  const handleJoinPrivateRoom = (playerName: string, code: string) => {
    setGameMode("online");
    if (socket && socket.connected) {
      socket.emit("join_room", { playerName, roomCode: code });
    } else {
      pendingActionRef.current = { type: "join", playerName, boardId: "classic", roomCode: code };
    }
  };

  const handleOnlineButtonPress = (index: number) => {
    if (!isMyTurn || isPlayingSeqOnline || isFailed || roomState?.status !== "playing") return;
    
    // Debounce to prevent double touch+mouse triggers
    const nowPress = Date.now();
    if (nowPress - lastPressTimeRef.current < 250) return;
    lastPressTimeRef.current = nowPress;

    // Play visual feedback instantly for responsive gameplay
    flashButton(index, 0.25);
    
    // Notify server of movement
    socket?.emit("tap_button", { roomCode, buttonIndex: index });
  };

  const restartOnlineGame = () => {
    socket?.emit("restart_game", { roomCode });
  };

  const exitToLobby = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setGameMode(null);
    setRoomCode(null);
    setRoomState(null);
    setIsMyTurn(false);
    setIsFailed(false);
    setIsShaking(false);
    setLobbyError(null);
    setLocalState((prev) => ({ ...prev, diagnostic: null, gameStatus: "idle" }));
    setHudMessage("¡Bienvenido de nuevo!");
    setHudSubMessage("Selecciona otra modalidad de juego.");
  };

  // --- COPY ROOM CODE HELPER ---
  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Get current game status displays
  const getBoardMultiplier = () => {
    if (boardId === "classic") return 1.0;
    if (boardId === "hex") return 1.5;
    return 2.0;
  };

  // Determine current active theme backgrounds and styles
  let themeBgClass = "bg-[#050515]";
  let boardThemeLabel = "Tema Clásico";
  let glowColorText = "text-fuchsia-400";

  if (boardId === "classic") {
    themeBgClass = "bg-[#050515] synthwave-perspective";
    boardThemeLabel = "Retro Arcade / Synthwave";
    glowColorText = "text-fuchsia-400 drop-shadow-[0_0_8px_rgba(240,46,170,0.5)]";
  } else if (boardId === "radial") {
    themeBgClass = "bg-[#050515] cyberpunk-grid";
    boardThemeLabel = "Cyberpunk / Hi-Tech";
    glowColorText = "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]";
  } else if (boardId === "hex") {
    themeBgClass = "bg-[#050515] nebula-gradient";
    boardThemeLabel = "Mística / Cristal";
    glowColorText = "text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]";
  }

  // Calculate average response speed for single player HUD
  const localAvgSpeedSec = localState.clicksCount > 0 
    ? (localState.totalClickDurationMs / localState.clicksCount) / 1000 
    : 0;

  return (
    <div className={`min-h-screen ${themeBgClass} text-white flex flex-col font-sans transition-all duration-700 relative overflow-x-hidden`}>
      {/* Background Neon Grid for Geometric Balance */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-40" 
        style={{
          backgroundImage: `linear-gradient(to right, rgba(139, 92, 246, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(139, 92, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#1a0b2e] to-transparent opacity-50 pointer-events-none" />

      {/* Synthwave scrolling grid layer if classic is chosen */}
      {boardId === "classic" && (
        <div className="absolute inset-0 synthwave-grid -z-10 h-1/2 top-1/2 opacity-40 pointer-events-none" />
      )}

      {/* Top Bar: Header (Geometric Balance Redux Style) */}
      <header className="relative z-10 flex justify-between items-center px-4 md:px-8 py-5 border-b border-violet-500/30 bg-[#050515]/80 backdrop-blur-sm">
        <div className="flex items-center gap-4 cursor-pointer select-none" onClick={exitToLobby}>
          <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.6)]">
            <span className="text-xl font-bold font-sans text-white">CS</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500 leading-none">
              Cyber Simon : Redux
            </h1>
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-violet-400 font-mono mt-0.5">
              Neural Sequencing Interface v2.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          {/* Header diagnostics panel */}
          <div className="flex gap-4 md:gap-8 select-none">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase text-gray-400 font-mono">Current Mode</p>
              <p className="text-xs font-bold text-fuchsia-400 uppercase">
                {gameMode === "local" ? "Personal / Diagnostic" : gameMode === "online" ? "Versus / Match" : "Lobby / Selection"}
              </p>
            </div>
            <div className="text-right border-l border-white/10 pl-4 md:pl-8 hidden sm:block">
              <p className="text-[10px] uppercase text-gray-400 font-mono font-sans">Accuracy</p>
              <p className="text-xs font-bold text-cyan-400 font-mono">
                {gameMode === "local" && localState.clicksCount > 0 
                  ? `${Math.min(100, Math.round((localState.score / localState.clicksCount) * 100))}%` 
                  : "100.0%"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer border border-white/5 z-10"
              title={soundEnabled ? "Silenciar" : "Activar sonido"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {gameMode && (
              <button
                onClick={exitToLobby}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer z-10"
              >
                <LogOut size={13} />
                <span>Salir</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN GAME AREA */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 px-4 max-w-7xl mx-auto w-full">
        {!gameMode ? (
          // Lobby Mode Selector
          <Lobby
            onStartLocal={handleStartLocalLobby}
            onJoinQuickMatch={handleJoinQuickMatch}
            onCreatePrivateRoom={handleCreatePrivateRoom}
            onJoinPrivateRoom={handleJoinPrivateRoom}
            errorMessage={lobbyError}
            isConnecting={isConnecting}
          />
        ) : (
          // Active Gameplay Scene
          <div className="w-full max-w-3xl flex flex-col items-center gap-6 md:gap-8 relative">
            
            {/* Upper Stats / Lobby code bar */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 bg-black/50 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">Modalidad:</span>
                <span className="text-xs font-bold font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                  {gameMode === "local" ? "Personal (Offline)" : "En Línea (Versus)"}
                </span>
                <span className="text-[10px] font-mono text-slate-500 hidden md:inline">|</span>
                <span className="text-xs font-mono text-slate-400 hidden md:inline">{boardThemeLabel}</span>
              </div>

              {/* Online Mode Info Room Code */}
              {gameMode === "online" && roomState && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400 uppercase">Sala:</span>
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg py-1 px-2.5">
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">{roomCode}</span>
                    <button 
                      onClick={copyRoomCode} 
                      className="text-slate-500 hover:text-white transition-colors ml-1 cursor-pointer"
                      title="Copiar código de sala"
                    >
                      {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Local Mode stats bar */}
              {gameMode === "local" && (
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <Trophy size={14} className="text-amber-400" />
                    <span className="text-xs font-mono text-slate-400">Récord: <strong className="text-white font-semibold">{localState.highScore}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Timer size={14} className="text-cyan-400" />
                    <span className="text-xs font-mono text-slate-400">Velocidad: <strong className="text-white font-semibold">{localAvgSpeedSec > 0 ? `${localAvgSpeedSec.toFixed(2)}s` : "---"}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Multiplayer Wait Panel / Countdown screen overlay */}
            {gameMode === "online" && roomState?.status === "waiting" && (
              <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center gap-4 animate-scale-in">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full animate-pulse">
                  <Users size={32} />
                </div>
                <h3 className="text-lg font-bold font-display text-white">Esperando a tu oponente</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Comparte el código de la sala con un amigo para empezar a competir. Se sincronizarán automáticamente el tablero y el ambiente visual.
                </p>

                <div className="w-full flex flex-col gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Código de la Sala</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-2xl font-mono font-bold tracking-widest text-cyan-400">{roomCode}</span>
                    <button
                      onClick={copyRoomCode}
                      className="py-1.5 px-3 rounded bg-white/5 hover:bg-white/10 text-xs font-semibold font-mono flex items-center gap-1 transition-all cursor-pointer border border-white/5"
                    >
                      {copiedCode ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-2 bg-white/5 py-1.5 px-3 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Esperando jugador en red...</span>
                </div>
              </div>
            )}

            {/* MAIN GAMEBOARD WITH HUD STATUS PANEL */}
            {(gameMode === "local" || (roomState && roomState.status !== "waiting")) && (
              <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
                
                {/* HUD STATUS INDICATOR */}
                <div className="text-center flex flex-col items-center max-w-sm">
                  <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight font-display uppercase ${glowColorText}`}>
                    {hudMessage}
                  </h2>
                  <p className="text-slate-300 text-xs md:text-sm mt-1 leading-relaxed min-h-[32px]">
                    {hudSubMessage}
                  </p>
                </div>

                {/* Turn indication visual bars */}
                {gameMode === "online" && roomState && roomState.status === "playing" && (
                  <div className="w-full max-w-xs flex gap-2 justify-center">
                    {roomState.players.map((p) => {
                      const isPlayerTurn = roomState.turnPlayerId === p.id;
                      const isMe = p.id === myPlayerId;
                      return (
                        <div
                          key={p.id}
                          className={`flex-1 flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                            isPlayerTurn 
                              ? "bg-purple-500/10 border-purple-500/50 shadow-md shadow-purple-500/5" 
                              : "bg-slate-950/40 border-slate-800 opacity-60"
                          }`}
                        >
                          <span className="text-[10px] font-mono text-slate-400">
                            {isMe ? "Tú" : "Rival"}
                          </span>
                          <span className="text-xs font-bold font-display truncate max-w-full text-white mt-0.5">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-emerald-400 font-mono">
                              Pts: {p.score}
                            </span>
                            {roomState.mode === "lives" && (
                              <div className="flex items-center gap-0.5 text-rose-500">
                                {Array.from({ length: 3 }).map((_, i) => (
                                  <Heart
                                    key={i}
                                    size={9}
                                    fill={i < p.lives ? "currentColor" : "none"}
                                    className={i >= p.lives ? "text-slate-700" : "animate-pulse"}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Score indicators for Single Player */}
                {gameMode === "local" && localState.gameStatus === "playing" && (
                  <div className="flex items-center gap-3 bg-white/5 py-1 px-4 rounded-full border border-white/5 font-mono text-xs text-slate-300">
                    <span>Ronda: <strong className="text-white text-sm">{localState.score + 1}</strong></span>
                    <span className="text-slate-600">|</span>
                    <span className="flex items-center gap-1">
                      <Flame size={12} className="text-orange-500 animate-bounce" /> Aciertos: <strong className="text-emerald-400 text-sm">{localState.score}</strong>
                    </span>
                  </div>
                )}

                {/* ACTIVE BOARD CONTROLLER */}
                <div 
                  id="active_board_container"
                  className={`relative p-2 rounded-[2rem] transition-all ${isShaking ? "animate-shake" : ""}`}
                >
                  {boardId === "classic" && (
                    <BoardClassic
                      activeButtonIndex={activeButtonIndex}
                      onButtonPress={gameMode === "local" ? handleLocalButtonPress : handleOnlineButtonPress}
                      disabled={gameMode === "local" ? (localState.isPlayingSequence || localState.gameStatus !== "playing") : (!isMyTurn || isPlayingSeqOnline || roomState?.status !== "playing")}
                      isFailed={isFailed}
                      score={gameMode === "local" ? localState.score : (roomState?.players.find(p => p.id === myPlayerId)?.score || 0)}
                    />
                  )}

                  {boardId === "radial" && (
                    <BoardRadial
                      activeButtonIndex={activeButtonIndex}
                      onButtonPress={gameMode === "local" ? handleLocalButtonPress : handleOnlineButtonPress}
                      disabled={gameMode === "local" ? (localState.isPlayingSequence || localState.gameStatus !== "playing") : (!isMyTurn || isPlayingSeqOnline || roomState?.status !== "playing")}
                      isFailed={isFailed}
                      statusLabel={gameMode === "local" ? "PUNTAJE" : (isMyTurn ? "TU TURNO" : "TURNO RIVAL")}
                      statusSubLabel={gameMode === "local" ? `${localState.score}` : (isMyTurn ? "REPETIR" : "MEMORIZA")}
                    />
                  )}

                  {boardId === "hex" && (
                    <BoardHex
                      activeButtonIndex={activeButtonIndex}
                      onButtonPress={gameMode === "local" ? handleLocalButtonPress : handleOnlineButtonPress}
                      disabled={gameMode === "local" ? (localState.isPlayingSequence || localState.gameStatus !== "playing") : (!isMyTurn || isPlayingSeqOnline || roomState?.status !== "playing")}
                      isFailed={isFailed}
                    />
                  )}
                </div>

                {/* Instructions tip helper */}
                {gameMode === "local" && localState.gameStatus === "playing" && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono mt-1">
                    <HelpCircle size={12} className="text-indigo-400" />
                    <span>Memoriza el destello de luces y repítelo con exactitud.</span>
                  </div>
                )}

                {/* Online Mode Results actions */}
                {gameMode === "online" && roomState && roomState.status === "gameover" && (
                  <div className="flex flex-col items-center gap-3 mt-4 w-full max-w-sm bg-slate-900/80 border border-slate-800 p-5 rounded-2xl animate-scale-in text-center">
                    <h3 className="text-md font-bold font-display text-white">Partida Finalizada</h3>
                    
                    <div className="flex flex-col gap-1 w-full my-1 font-mono text-xs">
                      {roomState.players.map(p => (
                        <div key={p.id} className="flex justify-between border-b border-white/5 py-1.5">
                          <span className="text-slate-400 flex items-center gap-1">
                            {p.id === myPlayerId ? "Tú" : "Rival"} ({p.name})
                            {p.id === roomState.winnerId && <Sparkles size={11} className="text-amber-400" />}
                          </span>
                          <span className={p.id === roomState.winnerId ? "text-emerald-400 font-bold" : "text-slate-300"}>
                            {p.score} aciertos {p.id === roomState.winnerId ? "🏆" : ""}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 w-full mt-2">
                      <button
                        onClick={restartOnlineGame}
                        className="flex-1 py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Play size={13} />
                        <span>Revancha</span>
                      </button>
                      <button
                        onClick={exitToLobby}
                        className="flex-1 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/5"
                      >
                        <span>Volver al Menú</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Offline Diagnostic Dialog Overlay */}
            {gameMode === "local" && localState.gameStatus === "gameover" && localState.diagnostic && (
              <DiagnosticCard
                score={localState.score}
                multiplier={getBoardMultiplier()}
                clicksCount={localState.clicksCount}
                averageSpeedSec={localAvgSpeedSec}
                highScore={localState.highScore}
                onRestart={() => startLocalGame(boardId)}
                boardId={boardId}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-white/5 bg-black/50 backdrop-blur-md text-center z-10 text-[10px] font-mono text-slate-500 flex items-center justify-center gap-2">
        <span>Inspirado en el Fabulous Fred original</span>
        <span>•</span>
        <span>Sincronización WebSockets activa</span>
      </footer>
    </div>
  );
}
