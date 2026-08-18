"use client";

import { useState } from "react";
import { Breadcrumb } from '@/components/breadcrumb'
type LabTemplate = "js" | "wasm" | "onnx" | "webgpu";

export default function LabPage() {
  const [activeTemplate, setActiveTemplate] = useState<LabTemplate>("js");
  const [code, setCode] = useState<string>(`// JS 浏览器实验台
console.log("Hello BitLeap Lab");
const arr = [1,2,3,4,5];
console.log(arr.map(x=>x*x));
`);
  const [logs, setLogs] = useState<string[]>([]);

  const runCode = () => {
    const localLogs:string[] = [];
    const originalLog = console.log;
    console.log = (...args)=>{
      localLogs.push(args.map(i=>String(i)).join(" "));
    };
    try {
      // 仅简单实验场景，生产如果做复杂沙盒建议iframe隔离
       
      eval(code);
    } catch(err:unknown) {
      localLogs.push(`❌ 错误: ${(err as Error).message}`);
    }
    console.log = originalLog;
    setLogs([...localLogs]);
  };

  const clearOutput = () => setLogs([]);

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col">
      <Breadcrumb />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">🔬 前端实验工作台</h1>
          <p className="text-sm text-app-muted">全部运行在浏览器本地，无后端</p>
        </div>
        <div className="flex gap-2">
          {(["js","wasm","onnx","webgpu"] as LabTemplate[]).map((t)=> (
            <button
              key={t}
              onClick={()=>setActiveTemplate(t)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition
              ${activeTemplate===t?"bg-violet-500 text-white border-violet-500":"border-app-border hover:bg-gray-50"}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 分割布局 上编辑区 下输出区 */}
      <div className="flex-1 grid grid-rows-2 gap-4 overflow-hidden">
        {/* 代码输入 */}
        <div className="border border-app-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-2 bg-gray-50 border-b border-app-border flex justify-between items-center">
            <span className="text-sm font-medium">Code</span>
            <button onClick={runCode} className="px-3 py-1 bg-violet-500 text-white rounded-lg text-sm">▶ 运行</button>
          </div>
          <textarea
            value={code}
            onChange={(e)=>setCode(e.target.value)}
            className="flex-1 w-full p-4 font-monospace text-sm resize-none focus:outline-none bg-app-bg"
          />
        </div>

        {/* 控制台输出 */}
        <div className="border border-app-border rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-2 bg-gray-50 border-b border-app-border flex justify-between items-center">
            <span className="text-sm font-medium">Console Output</span>
            <button onClick={clearOutput} className="px-2 py-1 text-sm border border-app-border rounded-lg">清空</button>
          </div>
          <div className="flex-1 p-4 font-monospace text-sm overflow-auto bg-gray-50">
            {logs.length === 0 ? (
              <div className="text-app-muted">点击运行查看输出...</div>
            ): (
              logs.map((line,idx)=><div key={idx} className="mb-1">{line}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
