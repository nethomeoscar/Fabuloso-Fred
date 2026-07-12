import React, { useState } from "react";
import { BoardId } from "../types";
import { User, Shield, Compass, Swords, Loader2, Play, Users, Globe, Grid, RefreshCw } from "lucide-react";

interface LobbyProps {
  onStartLocal: (boardId: BoardId) => void;
  onJoinQuickMatch: (playerName: string, boardId: BoardId) => void;
  onCreatePrivateRoom: (playerName: string, boardId: BoardId, mode: "sudden_death" | "lives") => void;
  onJoinPrivateRoom: (playerName: string, roomCode: string) => void;
  errorMessage: string | null;
  isConnecting: boolean;
}

export default function Lobby({
  onStartLocal,
  onJoinQuickMatch,
  onCreatePrivateRoom,
  onJoinPrivateRoom,
  errorMessage,
  isConnecting,
}: LobbyProps) {
  const [playerName, setPlayerName] = useState("");
  const [selectedBoard, setSelectedBoard] = useState<BoardId>("classic");
  const [activeTab, setActiveTab] = useState<"local" | "online">("local");
  const [roomCode, setRoomCode] = useState("");
  const [onlineMode, setOnlineMode] = useState<"sudden_death" | "lives">("sudden_death");

  const boards = [
    {
      id: "classic" as BoardId,
      name: "El Clásico",
      layout: "Cuadrado 2x2",
      colors: 4,
      multiplier: "1.0x",
      difficulty: "Fácil",
      desc: "Tablero tradicional con 4 cuadrantes de neón y tonos de sintetizador de 8 bits. Estética Retro Arcade.",
      bgStyle: "from-purple-950 to-indigo-950 border-fuchsia-500/30 text-fuchsia-400",
      activeBorder: "border-fuchsia-400 shadow-[0_0_15px_rgba(240,46,170,0.4)]",
    },
    {
      id: "radial" as BoardId,
      name: "Radial Extendido",
      layout: "Anillo Radial 8 Colores",
      colors: 8,
      multiplier: "2.0x",
      difficulty: "Medio-Alto",
      desc: "Anillo circular con 8 secciones de color y circuitos cibernéticos. Tonos senoidales modernos. Estética Cyberpunk.",
      bgStyle: "from-slate-900 to-slate-950 border-cyan-500/30 text-cyan-400",
      activeBorder: "border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]",
    },
    {
      id: "hex" as BoardId,
      name: "Hexagonal Colmena",
      layout: "Nido de Abeja 7 Botones",
      colors: 7,
      multiplier: "1.5x",
      difficulty: "Difícil",
      desc: "7 hexágonos flotantes sobre auroras en movimiento lento. Campanadas de cristal con eco. Estética Mística.",
      bgStyle: "from-zinc-900 to-zinc-950 border-purple-500/30 text-purple-400",
      activeBorder: "border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]",
    },
  ];

  const handleStartLocalClick = () => {
    onStartLocal(selectedBoard);
  };

  const handleQuickMatch = () => {
    if (!playerName.trim()) {
      alert("Por favor, ingresa tu apodo primero.");
      return;
    }
    onJoinQuickMatch(playerName, selectedBoard);
  };

  const handleCreatePrivate = () => {
    if (!playerName.trim()) {
      alert("Por favor, ingresa tu apodo primero.");
      return;
    }
    onCreatePrivateRoom(playerName, selectedBoard, onlineMode);
  };

  const handleJoinPrivate = () => {
    if (!playerName.trim()) {
      alert("Por favor, ingresa tu apodo primero.");
      return;
    }
    if (!roomCode.trim()) {
      alert("Por favor, ingresa un código de sala válido.");
      return;
    }
    onJoinPrivateRoom(playerName, roomCode);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 p-4 md:p-8 animate-fade-in text-white relative z-10">
      {/* App Header */}
      <div className="text-center flex flex-col items-center gap-2">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">
          FABULOUS FRED
        </h1>
        <p className="text-violet-300/80 text-sm md:text-base max-w-md font-medium">
          El legendario juego de secuenciación y memoria espacial. Elige tu tablero, pon a prueba tu cerebro o compite contra el mundo.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Board Selection Panel */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="text-xs font-bold uppercase mb-4 text-violet-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
              <Grid size={16} className="text-violet-400" /> 1. Selecciona tu Tablero
            </h3>
            
            <div className="flex flex-col gap-3">
              {boards.map((b) => (
                <div
                  id={`board_select_${b.id}`}
                  key={b.id}
                  onClick={() => setSelectedBoard(b.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 flex flex-col gap-2 ${
                    selectedBoard === b.id 
                      ? b.activeBorder + " bg-white/10" 
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="font-bold text-base md:text-lg text-white font-display">
                        {b.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.1em] text-violet-400 font-mono">
                        {b.layout}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                        {b.difficulty}
                      </span>
                      <span className="text-xs font-mono font-bold bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 px-2 py-0.5 rounded">
                        {b.multiplier} Multi
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Game Mode / Controls Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm flex flex-col gap-4">
            {/* Nickname Input - only needed for online but nice for both */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-violet-300 uppercase tracking-widest flex items-center gap-1.5">
                <User size={13} className="text-violet-400" /> Tu Apodo / Nickname
              </label>
              <input
                id="input_player_name"
                type="text"
                placeholder="Ej. FredProMaster"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 font-mono text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-sm"
              />
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                id="tab_local"
                onClick={() => setActiveTab("local")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "local"
                    ? "bg-violet-600/30 border border-violet-500/50 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Compass size={14} />
                <span>Modalidad Personal</span>
              </button>
              <button
                id="tab_online"
                onClick={() => setActiveTab("online")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "online"
                    ? "bg-violet-600/30 border border-violet-500/50 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Globe size={14} />
                <span>Modalidad En Línea</span>
              </button>
            </div>

            {/* Error notifications */}
            {errorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-400 text-center font-mono">
                {errorMessage}
              </div>
            )}

            {/* Local Game Panel */}
            {activeTab === "local" && (
              <div className="flex flex-col gap-4 py-2 animate-fade-in">
                <p className="text-xs text-gray-300 leading-relaxed">
                  Enfréntate a la computadora. La secuencia aumentará un paso en cada acierto. Al fallar, obtendrás un diagnóstico personalizado sobre el estado actual de tu memoria a corto plazo.
                </p>

                <button
                  id="btn_start_local"
                  onClick={handleStartLocalClick}
                  className="w-full py-3.5 px-6 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(240,46,170,0.4)] active:scale-95 cursor-pointer"
                >
                  <Play size={16} />
                  <span>Jugar en Solitario</span>
                </button>
              </div>
            )}

            {/* Online Game Panel */}
            {activeTab === "online" && (
              <div className="flex flex-col gap-4 py-2 animate-fade-in">
                <p className="text-xs text-gray-300 leading-relaxed">
                  Reta a otro rival en tiempo real. Se alternan las rondas. Quien cometa el primer error pierde la partida (o administra vidas). El creador de la sala elige el tablero y se sincroniza automáticamente.
                </p>

                {/* Sub-config rules */}
                <div className="flex flex-col gap-1.5 bg-black/40 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] font-mono uppercase text-gray-400 tracking-wider">Reglas de la Sala</span>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setOnlineMode("sudden_death")}
                      className={`flex-1 py-1.5 px-2 text-[11px] font-mono rounded border transition-all ${
                        onlineMode === "sudden_death"
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold"
                          : "bg-transparent text-gray-400 border-white/5 hover:text-white"
                      }`}
                    >
                      Muerte Súbita (1 Fallo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnlineMode("lives")}
                      className={`flex-1 py-1.5 px-2 text-[11px] font-mono rounded border transition-all ${
                        onlineMode === "lives"
                          ? "bg-sky-500/15 text-sky-400 border-sky-500/30 font-bold"
                          : "bg-transparent text-gray-400 border-white/5 hover:text-white"
                      }`}
                    >
                      3 Vidas Estándar
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    id="btn_quick_match"
                    onClick={handleQuickMatch}
                    disabled={isConnecting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)] active:scale-95 disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Swords size={14} />
                    )}
                    <span>Emparejamiento Rápido (Auto)</span>
                  </button>

                  <div className="flex items-center gap-2 text-gray-500 my-1">
                    <hr className="flex-1 border-white/5" />
                    <span className="text-[10px] font-mono uppercase">o crea una sala privada</span>
                    <hr className="flex-1 border-white/5" />
                  </div>

                  <button
                    id="btn_create_room"
                    onClick={handleCreatePrivate}
                    disabled={isConnecting}
                    className="w-full py-3 px-4 rounded-xl bg-white/5 border border-violet-500/30 hover:border-violet-500/60 hover:bg-violet-600/10 text-violet-300 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Users size={14} />
                    <span>Crear Sala Privada</span>
                  </button>
                </div>

                <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      id="input_room_code"
                      type="text"
                      placeholder="CÓDIGO (Ej. ABCD)"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-3 font-mono text-center text-xs tracking-widest text-white uppercase placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    />
                    <button
                      id="btn_join_room"
                      onClick={handleJoinPrivate}
                      disabled={isConnecting}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span>Unirse</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
