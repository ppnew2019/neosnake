import React, { useRef, useEffect } from 'react';
import { Point, GameTheme } from '../types';

interface GameCanvasProps {
  snake: Point[];
  food: Point;
  gridSize: number;
  width: number;
  height: number;
  theme: GameTheme;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ snake, food, gridSize, width, height, theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = theme.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw Grid (Optional, for retro feel)
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Vertical lines
    for (let i = 0; i <= width; i += gridSize) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
    }
    // Horizontal lines
    for (let i = 0; i <= height; i += gridSize) {
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
    }
    ctx.stroke();

    // Draw Food
    const foodX = food.x * gridSize;
    const foodY = food.y * gridSize;
    
    // Glow effect for food
    ctx.shadowBlur = 15;
    ctx.shadowColor = theme.foodColor;
    ctx.fillStyle = theme.foodColor;
    
    // Draw circle for food
    ctx.beginPath();
    ctx.arc(foodX + gridSize / 2, foodY + gridSize / 2, gridSize / 2 - 2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw Snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      const x = segment.x * gridSize;
      const y = segment.y * gridSize;

      ctx.shadowBlur = isHead ? 20 : 10;
      ctx.shadowColor = isHead ? theme.snakeHeadColor : theme.snakeBodyColor;
      ctx.fillStyle = isHead ? theme.snakeHeadColor : theme.snakeBodyColor;

      // Draw rounded rect for segments
      const radius = 4;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, gridSize - 2, gridSize - 2, radius);
      ctx.fill();
    });
    
    // Reset shadow
    ctx.shadowBlur = 0;

  }, [snake, food, gridSize, width, height, theme]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-xl shadow-2xl border-2 transition-colors duration-500 ease-in-out"
      style={{
        borderColor: theme.gridColor,
        boxShadow: `0 0 20px ${theme.glowColor}`
      }}
    />
  );
};

export default GameCanvas;