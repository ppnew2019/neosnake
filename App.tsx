import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import VisionControl from './components/VisionControl';
import ScoreChart from './components/ScoreChart';
import { generateLevelTheme, DEFAULT_THEME } from './services/geminiService';
import { Direction, GameStatus, Point, GameTheme, ScoreEntry } from './types';

// Constants
const GRID_SIZE = 20; // px
const INITIAL_SPEED = 250; // ms (Even slower start for better control)
const SPEED_INCREMENT = 5; // ms faster per level

const App: React.FC = () => {
  // Game State
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 5 });
  const [direction, setDirection] = useState<Direction>(Direction.RIGHT);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [theme, setTheme] = useState<GameTheme>(DEFAULT_THEME);
  const [isVisionMode, setIsVisionMode] = useState(false);
  
  // Responsive Board State
  const [boardSize, setBoardSize] = useState({ width: 600, height: 400 });

  // History
  const [history, setHistory] = useState<ScoreEntry[]>([]);
  const [gameCount, setGameCount] = useState(0);

  // Refs for game loop to avoid closure staleness
  const directionRef = useRef(Direction.RIGHT);
  const nextDirectionRef = useRef(Direction.RIGHT); // Buffer for next move
  const gameLoopRef = useRef<number | null>(null);
  const speedRef = useRef(INITIAL_SPEED);

  // Initialize Audio Context for simplistic sound effects (optional polish)
  const audioContextRef = useRef<AudioContext | null>(null);

  // Calculate Grid Counts dynamically
  const gridCountX = Math.floor(boardSize.width / GRID_SIZE);
  const gridCountY = Math.floor(boardSize.height / GRID_SIZE);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      // Calculate available space
      const isLargeScreen = window.innerWidth >= 1024;
      const sidebarWidth = isLargeScreen ? 320 : 0;
      const paddingX = 48; // Total horizontal padding
      const paddingY = 200; // Vertical padding for header/stats
      
      let availableWidth = window.innerWidth - sidebarWidth - paddingX;
      let availableHeight = window.innerHeight - paddingY;

      // Ensure minimum playability
      availableWidth = Math.max(300, availableWidth);
      availableHeight = Math.max(300, availableHeight);

      // Snap to grid size
      const snap = (v: number) => Math.floor(v / GRID_SIZE) * GRID_SIZE;

      setBoardSize({
        width: snap(availableWidth),
        height: snap(availableHeight)
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const playSound = (type: 'eat' | 'die') => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'eat') {
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  };

  // --- Logic ---

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    let isCollision;
    
    // Get dimensions based on current boardSize
    const maxX = Math.floor(boardSize.width / GRID_SIZE);
    const maxY = Math.floor(boardSize.height / GRID_SIZE);
    
    // Safety margin to prevent food from spawning on the very edge
    // Keep food at least 2 squares away from walls
    const margin = 2;
    const availableX = Math.max(1, maxX - (margin * 2));
    const availableY = Math.max(1, maxY - (margin * 2));

    do {
      newFood = {
        x: Math.floor(Math.random() * availableX) + margin,
        y: Math.floor(Math.random() * availableY) + margin,
      };
      // eslint-disable-next-line no-loop-func
      isCollision = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    } while (isCollision);
    return newFood;
  }, [boardSize]);

  const gameOver = useCallback(() => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    setStatus(GameStatus.GAME_OVER);
    playSound('die');
    
    setHistory(prev => [
      ...prev, 
      { gameId: gameCount + 1, score: score, level: level }
    ].slice(-10)); // Keep last 10
    setGameCount(c => c + 1);
  }, [score, level, gameCount]);

  const resetGame = () => {
    const startX = Math.floor(gridCountX / 2);
    const startY = Math.floor(gridCountY / 2);
    
    const initialSnake = [
        { x: startX, y: startY }, 
        { x: startX - 1, y: startY }, 
        { x: startX - 2, y: startY }
    ];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setScore(0);
    setLevel(1);
    speedRef.current = INITIAL_SPEED;
    setDirection(Direction.RIGHT);
    directionRef.current = Direction.RIGHT;
    nextDirectionRef.current = Direction.RIGHT;
    setTheme(DEFAULT_THEME);
    setStatus(GameStatus.PLAYING);
  };

  const handleDirectionChange = (newDir: Direction) => {
    // Prevent 180 degree turns
    const current = directionRef.current;
    if (newDir === Direction.UP && current === Direction.DOWN) return;
    if (newDir === Direction.DOWN && current === Direction.UP) return;
    if (newDir === Direction.LEFT && current === Direction.RIGHT) return;
    if (newDir === Direction.RIGHT && current === Direction.LEFT) return;
    
    // Store in buffer to be applied next tick
    nextDirectionRef.current = newDir;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== GameStatus.PLAYING) return;
      switch (e.key) {
        case 'ArrowUp': handleDirectionChange(Direction.UP); break;
        case 'ArrowDown': handleDirectionChange(Direction.DOWN); break;
        case 'ArrowLeft': handleDirectionChange(Direction.LEFT); break;
        case 'ArrowRight': handleDirectionChange(Direction.RIGHT); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  // Level Progression & Theme
  useEffect(() => {
    if (status === GameStatus.PLAYING && level > 1) {
      // Fetch new theme when level changes
      generateLevelTheme(level, theme.name).then(newTheme => {
        setTheme(newTheme);
      });
      // Increase speed
      speedRef.current = Math.max(50, INITIAL_SPEED - (level * SPEED_INCREMENT));
      // Restart loop with new speed
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      gameLoopRef.current = setInterval(gameTick, speedRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const gameTick = useCallback(() => {
    setSnake(prevSnake => {
      // Apply buffered direction
      const currentDir = nextDirectionRef.current;
      directionRef.current = currentDir;
      setDirection(currentDir);

      const head = prevSnake[0];
      const newHead = { ...head };

      switch (currentDir) {
        case Direction.UP: newHead.y -= 1; break;
        case Direction.DOWN: newHead.y += 1; break;
        case Direction.LEFT: newHead.x -= 1; break;
        case Direction.RIGHT: newHead.x += 1; break;
      }

      // 1. Collision with Walls
      // Use closure-captured gridCountX/Y which are derived from the same render cycle
      if (newHead.x < 0 || newHead.x >= gridCountX || newHead.y < 0 || newHead.y >= gridCountY) {
        gameOver();
        return prevSnake;
      }

      // 2. Collision with Self
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        gameOver();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // 3. Eat Food
      if (newHead.x === food.x && newHead.y === food.y) {
        playSound('eat');
        setScore(s => {
          const newScore = s + 10;
          if (newScore % 50 === 0) {
            setLevel(l => l + 1);
          }
          return newScore;
        });
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop(); // Remove tail
      }

      return newSnake;
    });
  }, [food, gameOver, gridCountX, gridCountY, generateFood]);

  // Game Loop Management
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      gameLoopRef.current = setInterval(gameTick, speedRef.current);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [status, gameTick]);

  // --- UI Rendering ---

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-1000 overflow-hidden"
         style={{ backgroundColor: theme.backgroundColor }}>
      
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-4">
        <div>
           <h1 className="text-4xl font-black arcade-font tracking-widest" style={{ color: theme.snakeHeadColor }}>
             NEON SNAKE
           </h1>
           <p className="text-xs font-mono text-gray-500 mt-1">
             POWERED BY GEMINI 2.5 & MEDIAPIPE
           </p>
        </div>
        <div className="flex gap-4 items-center">
            <div className="text-right">
              <div className="text-xs text-gray-400 font-bold uppercase">Score</div>
              <div className="text-2xl font-mono text-white">{score}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 font-bold uppercase">Level</div>
              <div className="text-2xl font-mono" style={{ color: theme.foodColor }}>{level}</div>
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full max-w-7xl justify-center">
        
        {/* Left: Game Board */}
        <div className="relative group shrink-0">
           <GameCanvas 
             snake={snake} 
             food={food} 
             gridSize={GRID_SIZE} 
             width={boardSize.width}
             height={boardSize.height}
             theme={theme}
           />
           
           {/* Overlays */}
           {status === GameStatus.MENU && (
             <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm z-20">
                <h2 className="text-3xl text-white font-bold mb-4 arcade-font">READY?</h2>
                <div className="flex gap-4">
                  <button 
                    onClick={() => { setIsVisionMode(false); resetGame(); }}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-lg transition-all"
                  >
                    KEYBOARD MODE
                  </button>
                  <button 
                    onClick={() => { setIsVisionMode(true); resetGame(); }}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded shadow-lg transition-all border border-purple-400"
                  >
                    VISION MODE
                  </button>
                </div>
             </div>
           )}

           {status === GameStatus.GAME_OVER && (
             <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center rounded-xl backdrop-blur-md z-20 text-center p-6">
                <h2 className="text-4xl text-red-500 font-bold mb-2 arcade-font">GAME OVER</h2>
                <p className="text-gray-300 mb-6 font-mono">FINAL SCORE: {score}</p>
                <button 
                    onClick={resetGame}
                    className="px-8 py-3 bg-white text-black font-bold rounded hover:scale-105 transition-transform"
                  >
                    RETRY
                  </button>
             </div>
           )}
        </div>

        {/* Right: Controls & Info */}
        <div className="w-full lg:w-72 flex flex-col gap-4">
          
          {/* Theme Story Card */}
          <div className="p-4 rounded-xl border bg-gray-900/50 backdrop-blur" 
               style={{ borderColor: theme.snakeBodyColor }}>
            <h3 className="text-xs font-bold uppercase mb-2 tracking-wider" style={{ color: theme.foodColor }}>
              Current Sector: {theme.name}
            </h3>
            <p className="text-sm text-gray-300 italic font-serif leading-relaxed">
              "{theme.storyText}"
            </p>
          </div>

          {/* Vision Control Box */}
          <div className="flex flex-col items-center">
             <div className="w-full flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500">CONTROL UPLINK</span>
                <span className={`w-2 h-2 rounded-full ${isVisionMode && status === GameStatus.PLAYING ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}></span>
             </div>
             
             {/* Always render VisionControl to maintain camera permission/state if wanted, 
                 or only when active. Hiding it via CSS keeps initialization smoother. */}
             <div className={isVisionMode && status === GameStatus.PLAYING ? 'block' : 'hidden'}>
                <VisionControl 
                  isActive={isVisionMode && status === GameStatus.PLAYING} 
                  onDirectionChange={handleDirectionChange} 
                />
             </div>
             
             {!isVisionMode && (
               <div className="w-48 h-36 bg-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-500 text-xs border border-gray-700">
                 <p className="mb-2">KEYBOARD ACTIVE</p>
                 <div className="grid grid-cols-3 gap-1">
                    <div></div><div className="w-6 h-6 border border-gray-600 rounded flex items-center justify-center">↑</div><div></div>
                    <div className="w-6 h-6 border border-gray-600 rounded flex items-center justify-center">←</div>
                    <div className="w-6 h-6 border border-gray-600 rounded flex items-center justify-center">↓</div>
                    <div className="w-6 h-6 border border-gray-600 rounded flex items-center justify-center">→</div>
                 </div>
               </div>
             )}
          </div>
          
           {/* Score Chart - Moved to sidebar for better layout */}
           <div className="w-full h-40">
             <ScoreChart data={history} />
           </div>

        </div>
      </div>
    </div>
  );
};

export default App;