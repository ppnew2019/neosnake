import React, { useRef, useEffect, useState } from 'react';
import { initializeVision, detectGesture } from '../services/visionService';
import { Direction } from '../types';

interface VisionControlProps {
  onDirectionChange: (dir: Direction) => void;
  isActive: boolean;
}

const VisionControl: React.FC<VisionControlProps> = ({ onDirectionChange, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detectedDirection, setDetectedDirection] = useState<Direction | null>(null);

  useEffect(() => {
    let animationFrameId: number;

    const setupCamera = async () => {
      try {
        await initializeVision();
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240, facingMode: 'user' } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
             setPermissionGranted(true);
             setLoading(false);
             processVideo();
          });
        }
      } catch (err) {
        console.error("Camera access denied or error:", err);
        setLoading(false);
      }
    };

    const processVideo = () => {
      if (videoRef.current && isActive) {
        const direction = detectGesture(videoRef.current);
        if (direction) {
          setDetectedDirection(direction);
          onDirectionChange(direction);
        } else {
            setDetectedDirection(null);
        }
      }
      animationFrameId = requestAnimationFrame(processVideo);
    };

    if (isActive) {
        setupCamera();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]); // Intentionally not including onDirectionChange to avoid re-setup

  if (!isActive) return null;

  return (
    <div className="relative w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
       {/* Instruction Overlay */}
       <div className="absolute top-0 left-0 w-full p-1 bg-black/60 z-20 text-[10px] text-center text-cyan-400 font-mono">
        POINT INDEX FINGER
       </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-cyan-500 text-xs">
          Loading AI Vision...
        </div>
      )}
      
      {!permissionGranted && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs text-center p-2">
          Camera needed for gestures
        </div>
      )}

      {/* Video Feed (Mirrored) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform -scale-x-100 opacity-80"
      />

      {/* Direction Overlay */}
      {detectedDirection && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-6xl text-white font-bold opacity-75 drop-shadow-lg">
             {detectedDirection === Direction.UP && '↑'}
             {detectedDirection === Direction.DOWN && '↓'}
             {detectedDirection === Direction.LEFT && '←'}
             {detectedDirection === Direction.RIGHT && '→'}
          </div>
        </div>
      )}
      
      {/* Neutral Zone Guide */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-white/20 rounded-full pointer-events-none"></div>
    </div>
  );
};

export default VisionControl;
