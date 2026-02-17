'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerStore } from '@/lib/store';

// 简单的2D噪声生成器
class FlowFieldNoise {
    private perm: number[] = [];
    
    constructor(seed = 1) {
        // 使用种子初始化排列数组
        this.perm = [];
        const p = [];
        for (let i = 0; i < 256; i++) p[i] = i;
        
        // 洗牌算法
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(seed * i) % (i + 1);
            [p[i], p[j]] = [p[j], p[i]];
            seed = (seed * 16807) % 2147483647;
        }
        
        // 复制一份用于快速查找
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
        }
    }
    
    // 2D噪声函数
    noise(x: number, y: number): number {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = x * x * x * (x * (x * 6 - 15) + 10);
        const v = y * y * y * (y * (y * 6 - 15) + 10);
        
        const A = this.perm[X] + Y;
        const B = this.perm[X + 1] + Y;
        
        return this.lerp(
            v,
            this.lerp(u, this.grad(this.perm[A], x, y, 0),
                         this.grad(this.perm[B], x - 1, y, 0)),
            this.lerp(u, this.grad(this.perm[A + 1], x, y - 1, 0),
                         this.grad(this.perm[B + 1], x - 1, y - 1, 0))
        ) * 0.5 + 0.5; // 归一化到[0,1]
    }
    
    private lerp(t: number, a: number, b: number): number {
        return a + t * (b - a);
    }
    
    private grad(hash: number, x: number, y: number, z: number): number {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
}

function BoldMediumWaves() {
    const pointsRef = useRef<THREE.Points>(null);
    const textureRef = useRef<THREE.Texture | null>(null);
    const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const sampleCtxRef = useRef<CanvasRenderingContext2D | null>(null);
    const targetColorsRef = useRef<Float32Array | null>(null);
    const nextColorsRef = useRef<Float32Array | null>(null);
    const lastSampleAtRef = useRef<number>(0);
    const hasInitializedColorsRef = useRef<boolean>(false);
    const transitionStartRef = useRef<number>(0);
    const lastAlbumArtRef = useRef<string | undefined>(undefined);
    const { currentSong, musicOceanSettings } = usePlayerStore();

    // Grid settings - Use store values
    const count = Math.ceil(Math.sqrt(2000)); // ~45x45 grid for ~2000 points
    const spacing = 8.0 - (musicOceanSettings.dotDensity / 50) * 6.0; // Higher density = smaller spacing
    const bounds = (count * spacing) / 2; // 边界范围
    
    const initialPositions = useMemo(() => {
        const p = new Float32Array(count * count * 3);
        const offset = (count * spacing) / 2;
        for (let i = 0; i < count; i++) {
            for (let j = 0; j < count; j++) {
                p[(i * count + j) * 3] = i * spacing - offset;
                p[(i * count + j) * 3 + 1] = 0;
                p[(i * count + j) * 3 + 2] = j * spacing - offset;
            }
        }
        return p;
    }, [count, spacing, musicOceanSettings.dotDensity]); // Add dotDensity to dependencies

    // 加载专辑封面纹理
    useEffect(() => {
        if (currentSong?.albumArt) {
            const loader = new THREE.TextureLoader();
            loader.load(
                currentSong.albumArt,
                (texture) => {
                    textureRef.current = texture;
                    // 确保纹理是可重复的
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                },
                undefined,
                (error) => {
                    console.error('Error loading album art:', error);
                    // Fallback to a default texture if loading fails
                    const canvas = document.createElement('canvas');
                    canvas.width = 256;
                    canvas.height = 256;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // Create a gradient fallback
                        const gradient = ctx.createLinearGradient(0, 0, 256, 256);
                        gradient.addColorStop(0, '#ff6b6b');
                        gradient.addColorStop(0.5, '#4ecdc4');
                        gradient.addColorStop(1, '#45b7d1');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(0, 0, 256, 256);
                        
                        const fallbackTexture = new THREE.CanvasTexture(canvas);
                        fallbackTexture.wrapS = THREE.RepeatWrapping;
                        fallbackTexture.wrapT = THREE.RepeatWrapping;
                        textureRef.current = fallbackTexture;
                    }
                }
            );
        }
        // Only reset transition if this is a new album art
        if (currentSong?.albumArt && lastAlbumArtRef.current !== currentSong.albumArt) {
            transitionStartRef.current = 0; // Will be set when frame starts
            lastAlbumArtRef.current = currentSong.albumArt;
        } else if (!currentSong) {
            // Reset album art ref if no current song
            lastAlbumArtRef.current = undefined;
        }
        hasInitializedColorsRef.current = false;
    }, [currentSong?.albumArt]);

    useEffect(() => {
        if (!sampleCanvasRef.current) {
            const canvas = document.createElement('canvas');
            sampleCanvasRef.current = canvas;
            sampleCtxRef.current = canvas.getContext('2d', { willReadFrequently: true });
        }
    }, []);

    useFrame((state) => {
        if (pointsRef.current) {
            const t = state.clock.getElapsedTime();
            const posAttr = pointsRef.current.geometry.attributes.position;

            // 优化1：减少循环次数，只更新可见部分的点
            const visibleCount = Math.min(count, 50); // 减少到50x50的点阵
            for (let i = 0; i < visibleCount; i++) {
                for (let j = 0; j < visibleCount; j++) {
                    const idx = (i * count + j) * 3;
                    const x = initialPositions[idx];
                    const z = initialPositions[idx + 2];

                    // MEDIUM SPEED, HIGH AMPLITUDE
                    const swell1 = Math.sin(x * 0.12 + t * 1.3) * 2.0;
                    const swell2 = Math.cos(z * 0.15 + t * 1.5) * 1.5;
                    const diagonal = Math.sin((x + z) * 0.08 + t * 1.0) * 1.2;

                    const height = swell1 + swell2 + diagonal;

                    posAttr.array[idx + 1] = height;
                }
            }
            posAttr.needsUpdate = true;

            // 更新颜色 - 直接映射模糊后的专辑封面
            if (pointsRef.current.geometry.attributes.color && textureRef.current) {
                // 优化2：减少颜色更新频率，每3帧更新一次
                if (Math.floor(t * 60) % 3 !== 0) return;
                
                const colorAttr = pointsRef.current.geometry.attributes.color;
                const image = textureRef.current.image;
                const time = state.clock.getElapsedTime();
                
                const img = image instanceof HTMLImageElement || image instanceof HTMLCanvasElement ? image : null;

                const canvas = sampleCanvasRef.current;
                const ctx = sampleCtxRef.current;

                if (ctx && img && canvas) {
                    // 优化3：减小画布大小以提高性能
                    const size = 256;
                    if (canvas.width !== size) canvas.width = size;
                    if (canvas.height !== size) canvas.height = size;
                    
                    // 清空画布
                    ctx.clearRect(0, 0, size, size);

                    ctx.save();
                    
                    // 应用模糊滤镜 (关键步骤)
                    ctx.filter = 'blur(20px)'; // 减少模糊半径

                    // 变换中心点
                    ctx.translate(size / 2, size / 2);
                    
                    // 1. 旋转
                    ctx.rotate(time * 0.3); // 加快旋转速度
                    
                    // 2. 缩放 (呼吸效果)
                    const scale = 0.7 + Math.sin(time * 1.0) * 0.5; // 更快的呼吸频率，更大的缩放范围
                    ctx.scale(scale, scale);
                    
                    // 3. 平移 (流动感)
                    const offsetX = Math.sin(time * 0.6) * 150; // 减少平移范围
                    const offsetY = Math.cos(time * 0.7) * 150;
                    ctx.translate(offsetX, offsetY);

                    // 绘制图像的9个副本（中心+8个方向），确保无论怎么变换都能覆盖整个画布
                    const tileSize = size;
                    
                    // 中心
                    ctx.drawImage(img, -tileSize / 2, -tileSize / 2, tileSize, tileSize);
                    
                    // 上
                    ctx.drawImage(img, -tileSize / 2, -tileSize / 2 - tileSize, tileSize, tileSize);
                    
                    // 下
                    ctx.drawImage(img, -tileSize / 2, -tileSize / 2 + tileSize, tileSize, tileSize);
                    
                    // 左
                    ctx.drawImage(img, -tileSize / 2 - tileSize, -tileSize / 2, tileSize, tileSize);
                    
                    // 右
                    ctx.drawImage(img, -tileSize / 2 + tileSize, -tileSize / 2, tileSize, tileSize);
                    
                    // 左上
                    ctx.drawImage(img, -tileSize / 2 - tileSize, -tileSize / 2 - tileSize, tileSize, tileSize);
                    
                    // 右上
                    ctx.drawImage(img, -tileSize / 2 + tileSize, -tileSize / 2 - tileSize, tileSize, tileSize);
                    
                    // 左下
                    ctx.drawImage(img, -tileSize / 2 - tileSize, -tileSize / 2 + tileSize, tileSize, tileSize);
                    
                    // 右下
                    ctx.drawImage(img, -tileSize / 2 + tileSize, -tileSize / 2 + tileSize, tileSize, tileSize);
                    
                    ctx.restore();

                    // 获取像素数据
                    const imageData = ctx.getImageData(0, 0, size, size);
                    const data = imageData.data;

                    const total = count * count * 3;
                    if (!nextColorsRef.current || nextColorsRef.current.length !== total) {
                        nextColorsRef.current = new Float32Array(total);
                    }

                    const next = nextColorsRef.current;

                    // 遍历所有点，直接映射颜色
                    for (let i = 0; i < visibleCount; i++) {
                        for (let j = 0; j < visibleCount; j++) {
                            const idx = (i * count + j) * 3;
                            
                            // 获取点的世界坐标 (相对于中心)
                            // i, j 从 0 到 count-1
                            // 归一化到 [0, 1]
                            const u = i / (count - 1);
                            const v = j / (count - 1);
                            
                            // 映射到像素坐标并取模，实现无缝循环
                            const px = Math.floor((u * size) % size);
                            const py = Math.floor((v * size) % size);
                            
                            const pixelIdx = (py * size + px) * 4;
                            
                            // 读取颜色 (归一化到 0-1)
                            const r = data[pixelIdx] / 255;
                            const g = data[pixelIdx + 1] / 255;
                            const b = data[pixelIdx + 2] / 255;

                            // 平滑过渡
                            const cr = colorAttr.array[idx];
                            const cg = colorAttr.array[idx + 1];
                            const cb = colorAttr.array[idx + 2];
                            
                            const lerpSpeed = 0.2; // 加快过渡速度
                            
                            next[idx] = cr + (r - cr) * lerpSpeed;
                            next[idx + 1] = cg + (g - cg) * lerpSpeed;
                            next[idx + 2] = cb + (b - cb) * lerpSpeed;
                        }
                    }
                    
                    colorAttr.array.set(next);
                    colorAttr.needsUpdate = true;
                }
            }
        }
    });

    // 初始化颜色属性 - 设置为白色
    const colors = useMemo(() => {
        const c = new Float32Array(count * count * 3);
        for (let i = 0; i < count * count; i++) {
            c[i * 3] = 1;     // R
            c[i * 3 + 1] = 1; // G
            c[i * 3 + 2] = 1; // B
        }
        return c;
    }, [count, musicOceanSettings.dotDensity]); // Add dotDensity since spacing depends on it
    
    // 确保在组件挂载时重置过渡状态
    useEffect(() => {
        hasInitializedColorsRef.current = false;
        transitionStartRef.current = 0;
    }, []);

    const pointTexture = useMemo(() => {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.clearRect(0, 0, size, size);
        const cx = size / 2;
        const cy = size / 2;
        const r = size * 0.34;
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }, []);

    // 简单的圆形点 - 移除复杂的纹理，使用基础圆形
    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[initialPositions, 3]}
                    count={initialPositions.length / 3}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-color"
                    args={[colors, 3]}
                    count={colors.length / 3}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={musicOceanSettings.dotSize} // Use store value
                vertexColors={true}
                transparent={true}
                opacity={1}
                sizeAttenuation={false} // 保持一致的大小
                map={pointTexture || undefined}
                alphaTest={0.38}
                depthWrite={false}
            />
        </points>
    );
}

export default function MusicOcean() {
    return (
        <div className="w-full h-full absolute inset-0 bg-transparent">
            <Canvas camera={{ position: [0, 35, 0], fov: 45 }} dpr={[1, 2]}>
                <ambientLight intensity={1.5} />
                <BoldMediumWaves />
            </Canvas>
        </div>
    );
}