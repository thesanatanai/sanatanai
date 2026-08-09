"use client";
import React, { useRef, useEffect } from "react";

export interface ParticleOptions {
  particleCount?: number;
  colors?: string[];
  minSize?: number;
  maxSize?: number;
  speed?: number;
  connectionDistance?: number;
  opacity?: number;
  className?: string;
}

export const ParticleBackground: React.FC<ParticleOptions> = ({
  particleCount,
  colors = ["#8e44ad", "#3498db", "#2ecc71", "#f1c40f", "#ffffff"],
  minSize = 2,
  maxSize = 6,
  speed = 0.5,
  connectionDistance = 150,
  opacity = 1,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    
    // Calculate initial count if not provided
    const defaultCount = window.innerWidth / 50;
    const pCount = particleCount || (defaultCount < 15 ? 16 : defaultCount);

    interface Particle {
      x: number;
      y: number;
      s: number;
      c: string;
      sx: number;
      sy: number;
      op: number;
    }

    // Helper function
    const hexToRgba = (hex: string, op: number) => {
      let r, g, b;
      if (hex.length === 4) {
        r = Number.parseInt(hex.charAt(1) + hex.charAt(1), 16);
        g = Number.parseInt(hex.charAt(2) + hex.charAt(2), 16);
        b = Number.parseInt(hex.charAt(3) + hex.charAt(3), 16);
      } else {
        r = Number.parseInt(hex.substring(1, 3), 16);
        g = Number.parseInt(hex.substring(3, 5), 16);
        b = Number.parseInt(hex.substring(5, 7), 16);
      }
      return `rgba(${r}, ${g}, ${b}, ${op})`;
    };

    const createParticles = (width: number, height: number) => {
      particles = [];
      for (let i = 0; i < pCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          s: Math.random() * (maxSize - minSize) + minSize,
          c: colors[Math.floor(Math.random() * colors.length)],
          sx: (Math.random() - 0.5) * speed,
          sy: (Math.random() - 0.5) * speed,
          op: Math.random() * 0.5 + 0.3,
        });
      }
    };

    const resizeCanvas = () => {
      if (!canvas.parentElement) return;
      const { width, height } = canvas.parentElement.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      createParticles(width, height);
    };

    const animate = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.sx;
        p.y += p.sy;

        // Boundary checks
        if (p.x > canvas.width) p.x = 0;
        else if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0;
        else if (p.y < 0) p.y = canvas.height;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(p.c, p.op);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    // Initialization
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animate();

    // Cleanup phase (Destroy equivalent)
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    particleCount,
    colors,
    minSize,
    maxSize,
    speed,
    connectionDistance,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`background-particles ${className}`}
      style={{
        opacity: opacity,
      }}
    />
  );
};