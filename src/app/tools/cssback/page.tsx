"use client";

import { useEffect, useRef } from "react";

// ===================== 下载按钮 =====================
function DownloadBackgroundButton() {
  const handleDownload = () => {
    const html = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <title>Bubbles Background Animation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Dongle:wght@700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/meyer-reset/2.0/reset.min.css">
  <style>
    html,
    body {
      font-family: "Dongle", sans-serif;
      margin: 0;
      padding: 0;
    }

    .text-container {
      z-index: 100;
      width: 100vw;
      height: 100vh;
      display: flex;
      position: absolute;
      top: 0;
      left: 0;
      justify-content: center;
      align-items: center;
      font-size: 96px;
      color: white;
      opacity: 0.8;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      text-shadow: 1px 1px rgba(0, 0, 0, 0.1);
    }

    :root {
      --color-bg1: rgb(108, 0, 162);
      --color-bg2: rgb(0, 17, 82);
      --color1: 18, 113, 255;
      --color2: 221, 74, 255;
      --color3: 100, 220, 255;
      --color4: 200, 50, 50;
      --color5: 180, 180, 50;
      --color-interactive: 140, 100, 255;
      --circle-size: 80%;
      --blending: hard-light;
    }

    @keyframes moveInCircle {
      0% { transform: rotate(0deg); }
      50% { transform: rotate(180deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes moveVertical {
      0% { transform: translateY(-50%); }
      50% { transform: translateY(50%); }
      100% { transform: translateY(-50%); }
    }

    @keyframes moveHorizontal {
      0% { transform: translateX(-50%) translateY(-10%); }
      50% { transform: translateX(50%) translateY(10%); }
      100% { transform: translateX(-50%) translateY(-10%); }
    }

    .gradient-bg {
      width: 100vw;
      height: 100vh;
      position: relative;
      overflow: hidden;
      background: linear-gradient(40deg, var(--color-bg1), var(--color-bg2));
      top: 0;
      left: 0;
    }

    .gradient-bg svg {
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
    }

    .gradient-bg .gradients-container {
      filter: url(#goo) blur(40px);
      width: 100%;
      height: 100%;
    }

    .gradient-bg .g1 {
      position: absolute;
      background: radial-gradient(circle at center, rgba(var(--color1), 0.8) 0, rgba(var(--color1), 0) 50%) no-repeat;
      mix-blend-mode: var(--blending);
      width: var(--circle-size);
      height: var(--circle-size);
      top: calc(50% - var(--circle-size) / 2);
      left: calc(50% - var(--circle-size) / 2);
      transform-origin: center center;
      animation: moveVertical 30s ease infinite;
      opacity: 1;
    }

    .gradient-bg .g2 {
      position: absolute;
      background: radial-gradient(circle at center, rgba(var(--color2), 0.8) 0, rgba(var(--color2), 0) 50%) no-repeat;
      mix-blend-mode: var(--blending);
      width: var(--circle-size);
      height: var(--circle-size);
      top: calc(50% - var(--circle-size) / 2);
      left: calc(50% - var(--circle-size) / 2);
      transform-origin: calc(50% - 400px);
      animation: moveInCircle 20s reverse infinite;
      opacity: 1;
    }

    .gradient-bg .g3 {
      position: absolute;
      background: radial-gradient(circle at center, rgba(var(--color3), 0.8) 0, rgba(var(--color3), 0) 50%) no-repeat;
      mix-blend-mode: var(--blending);
      width: var(--circle-size);
      height: var(--circle-size);
      top: calc(50% - var(--circle-size) / 2 + 200px);
      left: calc(50% - var(--circle-size) / 2 - 500px);
      transform-origin: calc(50% + 400px);
      animation: moveInCircle 40s linear infinite;
      opacity: 1;
    }

    .gradient-bg .g4 {
      position: absolute;
      background: radial-gradient(circle at center, rgba(var(--color4), 0.8) 0, rgba(var(--color4), 0) 50%) no-repeat;
      mix-blend-mode: var(--blending);
      width: var(--circle-size);
      height: var(--circle-size);
      top: calc(50% - var(--circle-size) / 2);
      left: calc(50% - var(--circle-size) / 2);
      transform-origin: calc(50% - 200px);
      animation: moveHorizontal 40s ease infinite;
      opacity: 0.7;
    }

    .gradient-bg .g5 {
      position: absolute;
      background: radial-gradient(circle at center, rgba(var(--color5), 0.8) 0, rgba(var(--color5), 0) 50%) no-repeat;
      mix-blend-mode: var(--blending);
      width: calc(var(--circle-size) * 2);
      height: calc(var(--circle-size) * 2);
      top: calc(50% - var(--circle-size));
      left: calc(50% - var(--circle-size));
      transform-origin: calc(50% - 800px) calc(50% + 200px);
      animation: moveInCircle 20s ease infinite;
      opacity: 1;
    }

    .gradient-bg .interactive {
      position: absolute;
      background: radial-gradient(circle at center, rgba(var(--color-interactive), 0.8) 0, rgba(var(--color-interactive), 0) 50%) no-repeat;
      mix-blend-mode: var(--blending);
      width: 100%;
      height: 100%;
      top: -50%;
      left: -50%;
      opacity: 0.7;
    }
  </style>
</head>

<body>
  <div class="text-container">
    Bubbles
  </div>
  <div class="gradient-bg">
    <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>
    <div class="gradients-container">
      <div class="g1"></div>
      <div class="g2"></div>
      <div class="g3"></div>
      <div class="g4"></div>
      <div class="g5"></div>
      <div class="interactive"></div>
    </div>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      var interBubble = document.querySelector('.interactive');
      var curX = 0, curY = 0, tgX = 0, tgY = 0;
      function move() {
        curX += (tgX - curX) / 20;
        curY += (tgY - curY) / 20;
        interBubble.style.transform = 'translate(' + Math.round(curX) + 'px, ' + Math.round(curY) + 'px)';
        requestAnimationFrame(move);
      }
      window.addEventListener('mousemove', function (event) {
        tgX = event.clientX;
        tgY = event.clientY;
      });
      move();
    });
  </script>
</body>

</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bubbles-background.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="fixed bottom-6 right-6 z-50 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-3 rounded-xl shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
      </svg>
      下载背景 HTML
    </button>
  );
}

// ===================== 页面主体 =====================
export default function Page() {
  const interactiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = interactiveRef.current;
    if (!el) return;

    let curX = window.innerWidth / 2;
    let curY = window.innerHeight / 2;
    let tgX = curX;
    let tgY = curY;

    const move = () => {
      curX += (tgX - curX) / 20;
      curY += (tgY - curY) / 20;
      el.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
      requestAnimationFrame(move);
    };

    const handleMouse = (e: MouseEvent) => {
      tgX = e.clientX;
      tgY = e.clientY;
    };

    window.addEventListener("mousemove", handleMouse);
    move();

    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-[100vh] overflow-hidden">

      {/* ===== 背景层 ===== */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "linear-gradient(40deg, rgb(108, 0, 162), rgb(0, 17, 82))",
        }}
      >
        {/* SVG Gooey 滤镜 */}
        <svg className="absolute w-0 h-0">
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>
        </svg>

        {/* 气泡容器 */}
        <div
          className="relative w-full h-full"
          style={{ filter: "url(#goo) blur(40px)" }}
        >
          <div
            className="absolute opacity-80 mix-blend-hard-light rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgba(18,113,255,0.8) 0%, rgba(18,113,255,0) 50%) no-repeat",
              width: "80%", height: "80%",
              top: "calc(50% - 40%)", left: "calc(50% - 40%)",
              transformOrigin: "center center",
              animation: "moveVertical 30s ease infinite",
            }}
          />
          <div
            className="absolute opacity-100 mix-blend-hard-light rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgba(221,74,255,0.8) 0%, rgba(221,74,255,0) 50%) no-repeat",
              width: "80%", height: "80%",
              top: "calc(50% - 40%)", left: "calc(50% - 40%)",
              transformOrigin: "calc(50% - 400px)",
              animation: "moveInCircle 20s reverse infinite",
            }}
          />
          <div
            className="absolute opacity-100 mix-blend-hard-light rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgba(100,220,255,0.8) 0%, rgba(100,220,255,0) 50%) no-repeat",
              width: "80%", height: "80%",
              top: "calc(50% - 40% + 200px)", left: "calc(50% - 40% - 500px)",
              transformOrigin: "calc(50% + 400px)",
              animation: "moveInCircle 40s linear infinite",
            }}
          />
          <div
            className="absolute opacity-70 mix-blend-hard-light rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgba(200,50,50,0.8) 0%, rgba(200,50,50,0) 50%) no-repeat",
              width: "80%", height: "80%",
              top: "calc(50% - 40%)", left: "calc(50% - 40%)",
              transformOrigin: "calc(50% - 200px)",
              animation: "moveHorizontal 40s ease infinite",
            }}
          />
          <div
            className="absolute opacity-100 mix-blend-hard-light rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgba(180,180,50,0.8) 0%, rgba(180,180,50,0) 50%) no-repeat",
              width: "160%", height: "160%",
              top: "calc(50% - 80%)", left: "calc(50% - 80%)",
              transformOrigin: "calc(50% - 800px) calc(50% + 200px)",
              animation: "moveInCircle 20s ease infinite",
            }}
          />
          <div
            ref={interactiveRef}
            className="absolute opacity-70 mix-blend-hard-light rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgba(140,100,255,0.8) 0%, rgba(140,100,255,0) 50%) no-repeat",
              width: "100%", height: "100%",
              top: "-50%", left: "-50%",
            }}
          />
        </div>
      </div>

      {/* ===== 前景文字 ===== */}
      <div className="relative z-10 flex items-center justify-center w-full h-full pointer-events-none select-none">
        <h1 className="text-white text-6xl md:text-8xl lg:text-9xl font-bold opacity-80 drop-shadow-sm">
        Bubbles
        </h1>
      </div>

      {/* ===== 下载按钮 ===== */}
      <DownloadBackgroundButton />

      {/* ===== 动画 keyframes（放全局 style 避免 hydration mismatch）===== */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes moveInCircle {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(180deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes moveVertical {
          0% { transform: translateY(-50%); }
          50% { transform: translateY(50%); }
          100% { transform: translateY(-50%); }
        }
        @keyframes moveHorizontal {
          0% { transform: translateX(-50%) translateY(-10%); }
          50% { transform: translateX(50%) translateY(10%); }
          100% { transform: translateX(-50%) translateY(-10%); }
        }
      `}} />
    </div>
  );
}