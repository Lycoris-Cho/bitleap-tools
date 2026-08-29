"use client";

import { useState } from "react";
import { Breadcrumb } from '@/components/breadcrumb'
import FooterNote from '@/components/FooterNote'

type LabTemplate = "js" | "wasm" | "onnx" | "webgpu";

const TEMPLATES: Record<LabTemplate, string> = {
  js: `// JS 浏览器实验台
console.log("Hello BitLeap Lab");
const arr = [1, 2, 3, 4, 5];
console.log(arr.map(x => x * x));
`,
  wasm: `// WebAssembly 实验模板
// 编译 C/C++/Rust 为 WASM 后在此调用
console.log("WASM 模板待配置");
`,
  onnx: `// ONNX Runtime Web 实验模板
// 加载 .onnx 模型进行推理
console.log("ONNX 模板待配置");
`,
  webgpu: `// WebGPU 实验模板
// 访问 navigator.gpu 进行 GPU 计算
console.log("WebGPU 模板待配置");
`,
};

export default function LabPage() {
  const [activeTemplate, setActiveTemplate] = useState<LabTemplate>("js");
  const [code, setCode] = useState<string>(TEMPLATES.js);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runCode = () => {
    if (isRunning) return;
    setIsRunning(true);
    const localLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => {
      localLogs.push(args.map(i => String(i)).join(" "));
    };
    try {
      // 仅简单实验场景，生产如果做复杂沙盒建议 iframe 隔离
      eval(code);
    } catch (err: unknown) {
      localLogs.push(`❌ 错误: ${(err as Error).message}`);
    }
    console.log = originalLog;
    setLogs([...localLogs]);
    setIsRunning(false);
  };

  const clearOutput = () => setLogs([]);

  const switchTemplate = (t: LabTemplate) => {
    setActiveTemplate(t);
    setCode(TEMPLATES[t]);
    setLogs([]);
  };

  return (
    <div className="max-w-6xl mx-auto w-full py-12 px-4 sm:px-6 lg:px-10 flex flex-col min-h-[calc(100vh-4rem)]">
      <Breadcrumb />
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">前端实验工作台</h1>
          <p className="text-sm text-app-muted">全部运行在浏览器本地，无后端</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["js", "wasm", "onnx", "webgpu"] as LabTemplate[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTemplate(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                activeTemplate === t
                  ? "bg-violet-500 text-white border-violet-500 shadow-sm shadow-violet-500/20"
                  : "bg-app-bg border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 分割布局 上编辑区 下输出区 */}
      <div className="flex-1 grid grid-rows-[1fr_1fr] gap-4 min-h-0">
        {/* 代码输入 */}
        <div className="border border-app-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-app-border flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Code</span>
            <button
              onClick={runCode}
              disabled={isRunning}
              className="px-4 py-1.5 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? '⏳ 运行中...' : '▶ 运行'}
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none bg-app-bg"
            spellCheck={false}
          />
        </div>

        {/* 控制台输出 */}
        <div className="border border-app-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-app-border flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Console Output</span>
            <button
              onClick={clearOutput}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
            >
              清空
            </button>
          </div>
          <div className="flex-1 p-4 font-mono text-sm overflow-auto bg-gray-50">
            {logs.length === 0 ? (
              <div className="text-app-muted">点击运行查看输出...</div>
            ) : (
              logs.map((line, idx) => (
                <div key={idx} className="mb-1 text-gray-800">{line}</div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="mt-6 p-4 bg-gray-50 border border-app-border rounded-xl shrink-0">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h3>
        <ul className="text-xs text-app-muted space-y-1.5 leading-relaxed">
          <li>• 在编辑区编写 JavaScript 代码，点击「运行」即可在浏览器中执行</li>
          <li>• 切换顶部标签可加载不同实验模板（WASM / ONNX / WebGPU 需自行补充代码）</li>
          <li>• 同步 <code className="font-mono bg-white px-1 rounded">console.log</code> 输出会捕获到下方控制台，异步日志会打印到浏览器真实 Console</li>
          <li>• 代码仅在当前页面执行，刷新页面后重置</li>
        </ul>
      </div>

      <FooterNote />
    </div>
  );
}