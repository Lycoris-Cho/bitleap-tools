"use client";

import { useState, useCallback, useRef, useEffect, ChangeEvent } from "react";
import { Breadcrumb } from '@/components/breadcrumb'
// ===================== Types =====================
type CompType =
  | "h1" | "h2" | "h3" | "p"
  | "button" | "input" | "image" | "divider"
  | "container";

interface CanvasItem {
  id: string;
  type: CompType;
  text: string;
  imageSrc?: string;
  className: string;
  layout: {
    mode: "none" | "flex" | "grid";
    flexDir?: "row" | "col";
    justify?: "start" | "center" | "end" | "between" | "around";
    align?: "start" | "center" | "end" | "stretch";
    gap?: number;
    gridCols?: string;
  };
  style: {
    radius: number;
    shadow: "none" | "sm" | "md" | "lg" | "xl";
    glass: boolean;
    glow: boolean;
    bgGradient: boolean;
    bgColor: string;
    textColor: string;
    fontSize: number;
    fontWeight: "normal" | "medium" | "semibold" | "bold";
    borderWidth: number;
    borderColor: string;
    width: string;
    height: string;
    minHeight: string;
    padding: number;
    bgOpacity: number;
    textOpacity: number;  
  };
  image?: {
    fit: "cover" | "contain" | "fill" | "none" | "scale-down";
    position: "center" | "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
    aspectRatio: string;
  };
  children: CanvasItem[];
}

// ===================== IndexedDB Helper =====================
const DB_NAME = "BuilderDB";
const DB_VERSION = 1;
const STORE_NAME = "images";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveImageToDB(key: string, dataUrl: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(dataUrl, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getImageFromDB(key: string): Promise<string | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function stripImageData(items: CanvasItem[]): CanvasItem[] {
  return items.map(it => ({
    ...it,
    imageSrc: it.imageSrc && it.imageSrc.startsWith("data:") ? `__db__${it.id}` : it.imageSrc,
    children: stripImageData(it.children),
  }));
}

async function restoreImageData(items: CanvasItem[]): Promise<CanvasItem[]> {
  return Promise.all(items.map(async it => ({
    ...it,
    imageSrc: it.imageSrc && it.imageSrc.startsWith("__db__") ? (await getImageFromDB(it.id)) || "" : it.imageSrc,
    children: await restoreImageData(it.children),
  })));
}

// ===================== Color Utils =====================
function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const r = parseInt(full.substring(0, 2), 16);
    const g = parseInt(full.substring(2, 4), 16);
    const b = parseInt(full.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

// ===================== Migration =====================
function migrateItem(item: any): CanvasItem {
  return {
    ...item,
    style: {
        radius: 8, shadow: "none", glass: false, glow: false, bgGradient: false,
        bgColor: "", textColor: "", fontSize: 14, fontWeight: "normal",
        borderWidth: 0, borderColor: "#e5e7eb",
        width: "", height: "", minHeight: "", padding: item.type === "container" ? 4 : 0,
        bgOpacity: 100, textOpacity: 100,
        ...(item.style || {}),
      },
    layout: {
      mode: "none", flexDir: "row", justify: "start", align: "start", gap: 4, gridCols: "2",
      ...(item.layout || {}),
    },
    image: item.type === "image"
      ? { fit: "cover", position: "center", aspectRatio: "", ...(item.image || {}) }
      : undefined,
    children: (item.children || []).map(migrateItem),
  } as CanvasItem;
}

// ===================== Component Library =====================
const categories = [
  {
    name: "基础组件",
    items: [
      { type: "h1" as const, icon: "📌", label: "一级标题", defaultText: "大标题" },
      { type: "h2" as const, icon: "📍", label: "二级标题", defaultText: "二级标题" },
      { type: "h3" as const, icon: "🔹", label: "三级标题", defaultText: "三级标题" },
      { type: "p" as const, icon: "📝", label: "段落文本", defaultText: "段落内容文字" },
      { type: "button" as const, icon: "🔘", label: "按钮", defaultText: "按钮" },
      { type: "input" as const, icon: "📋", label: "输入框", defaultText: "请输入..." },
      { type: "image" as const, icon: "🖼️", label: "图片", defaultText: "" },
      { type: "divider" as const, icon: "➖", label: "分割线", defaultText: "" },
    ],
  },
  {
    name: "布局容器",
    items: [
      { type: "container" as const, icon: "📦", label: "容器", defaultText: "" },
    ],
  },
];

const PRESET_COLORS = [
  "#ffffff", "#f3f4f6", "#e5e7eb", "#d1d5db",
  "#fef3c7", "#fde68a", "#dbeafe", "#bfdbfe",
  "#fce7f3", "#fbcfe8", "#dcfce7", "#bbf7d0",
  "#ede9fe", "#ddd6fe", "#1e293b", "#0f172a",
];

const TEXT_COLORS = ["", "#111827", "#6b7280", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"];

function createNewItem(type: CompType): CanvasItem {
  const lib = categories.flatMap(c => c.items).find(l => l.type === type)!;
  const isContainer = type === "container";
  return {
    id: crypto.randomUUID(),
    type,
    text: lib.defaultText,
    imageSrc: "",
    className: "",
    layout: { mode: "none", flexDir: "row", justify: "start", align: "start", gap: 4, gridCols: "2" },
    style: {
      radius: 8,
      shadow: "none",
      glass: false,
      glow: false,
      bgGradient: false,
      bgColor: isContainer ? "#ffffff" : "",
      textColor: "",
      fontSize: type === "h1" ? 32 : type === "h2" ? 24 : type === "h3" ? 20 : type === "button" ? 14 : 14,
      fontWeight: type.startsWith("h") ? "bold" : "normal",
      borderWidth: 0,
      borderColor: "#e5e7eb",
      width: "",
      height: "",
      minHeight: isContainer ? "120px" : "",
      padding: isContainer ? 4 : 0,
      bgOpacity: 100,
      textOpacity: 100, 
    },
    image: type === "image" ? { fit: "cover", position: "center", aspectRatio: "" } : undefined,
    children: [],
  };
}

// ===================== Inline Style Builder (核心) =====================
function buildInlineStyle(item: CanvasItem): React.CSSProperties {
  const s: React.CSSProperties = {
    boxSizing: "border-box",
    overflow: "hidden",
    minWidth: 0,
  };

if (item.style.glass) {
    s.background = "rgba(255,255,255,0.2)";
    s.backdropFilter = "blur(16px)";
    s.border = "1px solid rgba(255,255,255,0.3)";
  } else if (item.style.bgGradient) {
    s.background = "linear-gradient(to right, #8b5cf6, #06b6d4)";
  } else if (item.style.bgColor) {
    const a = (item.style.bgOpacity ?? 100) / 100;
    s.backgroundColor = a >= 1 ? item.style.bgColor : hexToRgba(item.style.bgColor, a);
  }

  if (item.style.textColor) {
    const a = (item.style.textOpacity ?? 100) / 100;
    s.color = a >= 1 ? item.style.textColor : hexToRgba(item.style.textColor, a);
  }
  s.fontSize = `${item.style.fontSize}px`;
  s.fontWeight = item.style.fontWeight;
  s.borderRadius = `${item.style.radius}px`;

  if (item.style.shadow === "sm") s.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
  else if (item.style.shadow === "md") s.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
  else if (item.style.shadow === "lg") s.boxShadow = "0 10px 15px rgba(0,0,0,0.1)";
  else if (item.style.shadow === "xl") s.boxShadow = "0 20px 25px rgba(0,0,0,0.15)";
  if (item.style.glow) s.boxShadow = "0 0 24px rgba(139,92,246,0.4)";

  if (item.style.borderWidth > 0) {
    s.borderWidth = `${item.style.borderWidth}px`;
    s.borderStyle = "solid";
    s.borderColor = item.style.borderColor;
  }

  if (item.style.width === "full") s.width = "100%";
  else if (item.style.width) s.width = item.style.width;
  if (item.style.height === "auto") s.height = "auto";
  else if (item.style.height) s.height = item.style.height;
  if (item.style.minHeight) s.minHeight = item.style.minHeight;
  if (item.style.padding > 0) s.padding = `${item.style.padding * 0.25}rem`;

  if (item.layout.mode === "flex") {
    s.display = "flex";
    s.flexDirection = item.layout.flexDir === "col" ? "column" : "row";
    s.justifyContent =
      item.layout.justify === "between" ? "space-between" :
      item.layout.justify === "around" ? "space-around" :
      item.layout.justify === "center" ? "center" :
      item.layout.justify === "end" ? "flex-end" : "flex-start";
    s.alignItems =
      item.layout.align === "center" ? "center" :
      item.layout.align === "end" ? "flex-end" :
      item.layout.align === "stretch" ? "stretch" : "flex-start";
    if (item.layout.gap !== undefined) s.gap = `${item.layout.gap * 0.25}rem`;
    if (item.type === "container" && !item.style.height && !s.minHeight) {
      s.minHeight = "120px";
    }
  }

  if (item.layout.mode === "grid") {
    s.display = "grid";
    if (item.layout.gridCols) {
      if (/^\d+$/.test(item.layout.gridCols)) {
        s.gridTemplateColumns = `repeat(${item.layout.gridCols}, minmax(0, 1fr))`;
      } else {
        s.gridTemplateColumns = item.layout.gridCols;
      }
    }
    if (item.layout.gap !== undefined) s.gap = `${item.layout.gap * 0.25}rem`;
    if (item.type === "container" && !item.style.height && !s.minHeight) {
      s.minHeight = "120px";
    }
  }

  if (item.type === "image" && item.image) {
    s.objectFit = item.image.fit;
    s.objectPosition = (item.image.position || "center").replace("-", " ");
    if (item.image.aspectRatio) s.aspectRatio = item.image.aspectRatio;
  }

  return s;
}

// ===================== HTML Generators =====================
function generateHtml(item: CanvasItem): string {
  const cls = compileClass(item).replace(/"/g, "&quot;");
  let inner = "";
  for (const child of item.children) inner += generateHtml(child);

  switch (item.type) {
    case "h1": return item.text ? `  <h1 class="${cls}">${item.text}</h1>\n` : "";
    case "h2": return item.text ? `  <h2 class="${cls}">${item.text}</h2>\n` : "";
    case "h3": return item.text ? `  <h3 class="${cls}">${item.text}</h3>\n` : "";
    case "p": return item.text ? `  <p class="${cls}">${item.text}</p>\n` : "";
    case "button": return item.text ? `  <button class="${cls}">${item.text}</button>\n` : "";
    case "input": return item.text ? `  <input class="${cls}" placeholder="${item.text}" />\n` : `  <input class="${cls}" />\n`;
    case "image":
      if (!item.imageSrc) return `  <div class="${cls} bg-gray-100 flex items-center justify-center text-gray-400 text-sm" style="min-height:120px;">图片占位</div>\n`;
      return `  <img class="${cls}" src="${item.imageSrc}" alt="${item.text && !item.text.includes("点击") ? item.text : "image"}" />\n`;
    case "divider": return `  <hr class="${cls}" />\n`;
    default:
      if (!inner.trim()) return "";
      return `  <div class="${cls}">\n${inner.replace(/^/gm, "  ")}  </div>\n`;
  }
}

function compileClass(item: CanvasItem): string {
  const cls: string[] = [];

  if (item.layout.mode === "flex") {
    cls.push("flex");
    if (item.layout.flexDir) cls.push(`flex-${item.layout.flexDir}`);
    if (item.layout.justify) cls.push(`justify-${item.layout.justify}`);
    if (item.layout.align) cls.push(`items-${item.layout.align}`);
    if (item.layout.gap !== undefined) cls.push(`gap-${item.layout.gap}`);
  }
  if (item.layout.mode === "grid") {
    cls.push("grid");
    const gc = item.layout.gridCols ?? "2";
    if (/^\d+$/.test(gc)) cls.push(`grid-cols-${gc}`);
    else cls.push(`grid-cols-[${gc}]`);
    if (item.layout.gap !== undefined) cls.push(`gap-${item.layout.gap}`);
  }

  if (item.style.width === "full") cls.push("w-full");
  else if (item.style.width) cls.push(`w-[${item.style.width}]`);
  if (item.style.height === "auto") cls.push("h-auto");
  else if (item.style.height) cls.push(`h-[${item.style.height}]`);
  if (item.style.minHeight) cls.push(`min-h-[${item.style.minHeight}]`);
  if (item.style.padding > 0) cls.push(`p-${item.style.padding}`);

  cls.push(`rounded-[${item.style.radius}px]`);
  if (item.style.shadow !== "none") cls.push(`shadow-${item.style.shadow}`);
  if (item.style.bgColor && !item.style.glass && !item.style.bgGradient) cls.push(`bg-[${item.style.bgColor}]`);
  if (item.style.textColor) cls.push(`text-[${item.style.textColor}]`);
  if (item.style.borderWidth > 0) {
    cls.push(`border-[${item.style.borderWidth}px]`, `border-[${item.style.borderColor}]`);
  }
  cls.push(`text-[${item.style.fontSize}px]`, `font-${item.style.fontWeight}`);

  if (item.style.glass) cls.push("backdrop-blur-xl", "bg-app-bg/20", "border", "border-white/30");
  if (item.style.glow) cls.push("shadow-[0_0_24px_rgba(139,92,246,0.4)]");
  if (item.style.bgGradient) cls.push("bg-gradient-to-r", "from-violet-500", "to-cyan-500");

  if (item.type === "image" && item.image) {
    cls.push(`object-${item.image.fit}`);
    const posClass = item.image.position === "center" ? "center" : item.image.position.replace("-", "-");
    cls.push(`object-${posClass}`);
    if (item.image.aspectRatio) cls.push(`aspect-[${item.image.aspectRatio}]`);
  }

  if (item.className) cls.push(item.className);
  return cls.filter(Boolean).join(" ");
}

function generateHtmlCss(item: CanvasItem): string {
    const style = buildInlineStyle(item);
    
    const allStyleStr = Object.entries(style)
      .filter(([_, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => {
        const cssKey = k.replace(/([A-Z])/g, "-$1").toLowerCase();
        return `        ${cssKey}: ${v};`;
      })
      .join("\n");
  
    let inner = "";
    for (const child of item.children) {
      inner += generateHtmlCss(child);
    }
  
    const tag = (() => {
      switch (item.type) {
        case "h1": case "h2": case "h3": case "p": case "button": case "input": case "img": case "hr": return item.type;
        default: return "div";
      }
    })();
  
    if (item.type === "image") {
      if (!item.imageSrc) {
        return `    <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #9ca3af;
          font-size: 14px;
          min-height: 120px;
        ">图片占位</div>\n`;
      }
      return `    <img style="
  ${allStyleStr}
      " src="${item.imageSrc}" alt="${item.text && !item.text.includes("点击") ? item.text : "image"}" />\n`;
    }
  
    if (tag === "input" || tag === "hr") {
      const attrs = tag === "input" ? ` placeholder="${item.text || ""}"` : "";
      return `    <${tag} style="
  ${allStyleStr}
      "${attrs} />\n`;
    }
  
    if (tag === "button") {
      return `    <button style="
  ${allStyleStr}
      ">${item.text}</button>\n`;
    }
  
    const content = item.text || "";
    const hasChildren = inner.trim().length > 0;
    
    if (!hasChildren && !content.trim()) {
      return `    <div style="
  ${allStyleStr}
      "></div>\n`;
    }
  
    return `    <div style="
  ${allStyleStr}
      ">${content}${hasChildren ? `\n${inner.replace(/^/gm, "      ")}    ` : ""}</div>\n`;
  }

// ===================== Main Component =====================
export default function DragBuilderPage() {
  const [rootItems, setRootItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attrTab, setAttrTab] = useState<"content" | "layout" | "style" | "size" | "advanced">("style");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const historyRef = useRef<CanvasItem[][]>([[]]);
  const historyIndexRef = useRef(0);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportBtnRef = useRef<HTMLButtonElement | null>(null);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem("builder_canvas");
        if (raw) {
          const parsed = JSON.parse(raw) as any[];
          const restored = await restoreImageData(parsed);
          const migrated = restored.map(migrateItem);
          setRootItems(migrated);
          historyRef.current = [JSON.parse(JSON.stringify(migrated))];
        }
      } catch (e) { console.error("Load failed:", e); }
    })();
  }, []);

  // Save
  useEffect(() => {
    const stripped = stripImageData(rootItems);
    localStorage.setItem("builder_canvas", JSON.stringify(stripped));
    rootItems.forEach(async (it) => {
      if (it.imageSrc && it.imageSrc.startsWith("data:")) await saveImageToDB(it.id, it.imageSrc);
    });
  }, [rootItems]);

  const pushHistory = useCallback((newItems: CanvasItem[]) => {
    const snapshot = JSON.parse(JSON.stringify(newItems)) as CanvasItem[];
    historyRef.current = [...historyRef.current.slice(0, historyIndexRef.current + 1), snapshot];
    historyIndexRef.current += 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    setRootItems(historyRef.current[historyIndexRef.current]);
    setSelectedId(null);
    showToast("已撤销");
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    setRootItems(historyRef.current[historyIndexRef.current]);
    setSelectedId(null);
    showToast("已重做");
  }, []);

  const findItem = useCallback((list: CanvasItem[], id: string): CanvasItem | null => {
    for (const it of list) { if (it.id === id) return it; const f = findItem(it.children, id); if (f) return f; }
    return null;
  }, []);

  const updateItem = useCallback((list: CanvasItem[], id: string, patch: Partial<CanvasItem>): CanvasItem[] => {
    return list.map(it => it.id === id ? { ...it, ...patch } : { ...it, children: updateItem(it.children, id, patch) });
  }, []);

  const deleteItem = useCallback((list: CanvasItem[], id: string): CanvasItem[] => {
    return list.filter(it => it.id !== id).map(it => ({ ...it, children: deleteItem(it.children, id) }));
  }, []);

  const addChildToItem = useCallback((list: CanvasItem[], parentId: string, newChild: CanvasItem): CanvasItem[] => {
    return list.map(it => it.id === parentId ? { ...it, children: [...it.children, newChild] } : { ...it, children: addChildToItem(it.children, parentId, newChild) });
  }, []);

  const selectedItem = selectedId ? findItem(rootItems, selectedId) : null;

  const patchSelected = (patch: Partial<CanvasItem>) => {
    if (!selectedId) return;
    const next = updateItem(rootItems, selectedId, patch);
    setRootItems(next);
    pushHistory(next);
  };

  const patchLayout = (layoutPatch: Partial<CanvasItem["layout"]>) => {
    if (!selectedId) return;
    const current = findItem(rootItems, selectedId);
    if (!current) return;
    const safeLayout: CanvasItem["layout"] = {
      mode: "none",
      flexDir: "row",
      justify: "start",
      align: "start",
      gap: 4,
      gridCols: "2",
      ...current.layout,
      ...layoutPatch,
    };
    const next = updateItem(rootItems, selectedId, { layout: safeLayout });
    setRootItems(next);
    pushHistory(next);
  };

  const patchImage = (imagePatch: Partial<NonNullable<CanvasItem["image"]>>) => {
    if (!selectedId) return;
    const current = findItem(rootItems, selectedId);
    if (!current) return;
    const safeImage: NonNullable<CanvasItem["image"]> = {
      fit: "cover",
      position: "center",
      aspectRatio: "",
      ...current.image,
      ...imagePatch,
    };
    const next = updateItem(rootItems, selectedId, { image: safeImage });
    setRootItems(next);
    pushHistory(next);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const next = deleteItem(rootItems, selectedId);
    setRootItems(next);
    pushHistory(next);
    setSelectedId(null);
    showToast("组件已删除");
  };

  const [toast, setToast] = useState("");
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2500);
  }, []);

  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  const downloadFile = useCallback((filename: string, content: string, mimeType: string) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      requestAnimationFrame(() => {
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.rel = "noopener"; a.style.display = "none";
        document.body.appendChild(a); a.click();
        setTimeout(() => { if (document.body.contains(a)) document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
      });
      showToast(`✓ ${filename} 下载成功`);
    } catch { showToast("✗ 下载失败，请重试"); }
  }, [showToast]);

  // ✅ 唯一改动：用 textarea 方式复制，完全绕过 navigator.clipboard.writeText
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const success = document.execCommand("copy");
      document.body.removeChild(ta);
      
      if (success) {
        showToast(`✓ ${label} 已复制`);
      } else {
        showToast("✗ 复制失败");
      }
    } catch {
      showToast("✗ 复制失败");
    }
  }, [showToast]);

  const exportTailwindFile = useCallback(() => {
    let out = `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8" /><script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="p-6"><div class="space-y-4">\n`;
    rootItems.forEach(it => { out += generateHtml(it); });
    out += `  </div>\n</body>\n</html>`;
    downloadFile("page-tailwind.html", out, "text/html"); setShowExportMenu(false);
  }, [rootItems, downloadFile]);

  const exportHtmlCssFile = useCallback(() => {
    let out = `<!DOCTYPE html>\n<html lang="zh-CN">\n<head><meta charset="UTF-8" /></head>\n<body style="padding:1.5rem"><div style="display:flex;flex-direction:column;gap:1rem">\n`;
    rootItems.forEach(it => { out += generateHtmlCss(it); });
    out += `  </div>\n</body>\n</html>`;
    downloadFile("page.html", out, "text/html"); setShowExportMenu(false);
  }, [rootItems, downloadFile]);

  const copyCode = useCallback(async (mode: "tailwind" | "htmlcss") => {
    let out = "";
    if (mode === "tailwind") {
      out = `<div style="padding:1.5rem;display:flex;flex-direction:column;gap:1rem">\n`;
      rootItems.forEach(it => { out += generateHtml(it); });
      out += `</div>`;
    } else {
      rootItems.forEach(it => { out += generateHtmlCss(it); });
    }
    await copyToClipboard(out, mode === "tailwind" ? "Tailwind 代码" : "HTML+CSS 代码");
    setShowExportMenu(false);
  }, [rootItems, copyToClipboard]);

  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => { if (exportBtnRef.current && !exportBtnRef.current.contains(e.target as Node)) setShowExportMenu(false); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showExportMenu]);

  const openExportMenu = useCallback(() => {
    if (exportBtnRef.current) {
      const rect = exportBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setShowExportMenu(v => !v);
  }, []);

  const getBreadcrumb = useCallback((list: CanvasItem[], id: string): string[] | null => {
    for (const it of list) { if (it.id === id) return [it.type]; const r = getBreadcrumb(it.children, id); if (r) return [it.type, ...r]; }
    return null;
  }, []);
  const breadcrumb = selectedId ? (getBreadcrumb(rootItems, selectedId) ?? []) : [];

  const handleLocalImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    const reader = new FileReader();
    reader.onload = (ev) => { patchSelected({ imageSrc: ev.target?.result as string }); showToast("✓ 图片已上传"); };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const handleDragStart = (e: React.DragEvent, type: CompType) => { e.dataTransfer.setData("compType", type); };
  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault(); const type = e.dataTransfer.getData("compType") as CompType;
    if (!type) return; const ni = createNewItem(type); const next = [...rootItems, ni]; setRootItems(next); pushHistory(next); setSelectedId(ni.id);
  };
  const handleContainerDrop = (e: React.DragEvent, parentId: string) => {
    e.preventDefault(); e.stopPropagation(); const type = e.dataTransfer.getData("compType") as CompType;
    if (!type) return; const ni = createNewItem(type); const next = addChildToItem(rootItems, parentId, ni); setRootItems(next); pushHistory(next); setSelectedId(ni.id);
  };

  // ===================== Render Node =====================
  const renderNode = (item: CanvasItem): React.ReactNode => {
    const isSel = selectedId === item.id;
    const inlineStyle = buildInlineStyle(item);
    const isContainer = item.type === "container";

    let dom: React.ReactNode;
    switch (item.type) {
      case "h1": dom = <h1 style={inlineStyle}>{item.text}</h1>; break;
      case "h2": dom = <h2 style={inlineStyle}>{item.text}</h2>; break;
      case "h3": dom = <h3 style={inlineStyle}>{item.text}</h3>; break;
      case "p": dom = <p style={inlineStyle}>{item.text}</p>; break;
      case "button": dom = <button style={inlineStyle}>{item.text}</button>; break;
      case "input": dom = <input style={inlineStyle} placeholder={item.text} />; break;
      case "image":
        dom = (
          <div className="relative flex items-center justify-center" style={{ ...inlineStyle, minHeight: item.style.height ? 0 : 120, minWidth: 160 }}>
            {item.imageSrc
              ? <img src={item.imageSrc} alt={item.text} className="absolute inset-0 w-full h-full" style={{ objectFit: item.image?.fit || "cover", objectPosition: (item.image?.position || "center").replace("-", " ") }} />
              : <span className="text-gray-400 text-xs text-center px-2 pointer-events-none select-none">{item.text || "🖼️ 点击右侧上传图片"}</span>}
          </div>
        );
        break;
      case "divider": dom = <hr style={inlineStyle} />; break;
      default:
        dom = (
          <div
            style={inlineStyle}
            onDragOver={(e) => { if (isContainer) e.preventDefault(); }}
            onDrop={(e) => { if (isContainer) handleContainerDrop(e, item.id); }}
          >
            {item.text && (
              <div className="absolute top-1 left-2 text-[10px] text-gray-400 pointer-events-none select-none truncate max-w-full pr-2 z-10">
                {item.text}
              </div>
            )}
            <div
              className="w-full h-full"
              style={{
                display: inlineStyle.display,
                flexDirection: inlineStyle.flexDirection,
                justifyContent: inlineStyle.justifyContent,
                alignItems: inlineStyle.alignItems,
                gap: inlineStyle.gap,
              }}
            >
              {item.children.map(renderNode)}
            </div>
            {isContainer && item.children.length === 0 && (
              <div className="absolute inset-2 border-dashed border-2 border-gray-200 rounded-xl flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-gray-300">📥 拖入组件</span>
              </div>
            )}
          </div>
        );
    }

    return (
      <div
        key={item.id}
        className={`relative group ${isSel ? "ring-2 ring-violet-500 ring-offset-2 rounded-xl z-10" : "hover:ring-1 hover:ring-violet-200 rounded-xl"}`}
        onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}
      >
        {isSel && (
          <>
            <span className="absolute -top-6 left-0 text-[10px] bg-violet-500 text-white px-2 py-0.5 rounded-md font-medium z-20">{item.type}</span>
            <button
              className="absolute -top-2 -right-2 z-20 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center shadow-lg"
              onClick={(e) => { e.stopPropagation(); deleteSelected(); }}
            >✕</button>
          </>
        )}
        {dom}
      </div>
    );
  };

  const tabs = [
    { key: "content", label: "内容", icon: "📝" },
    { key: "layout", label: "布局", icon: "📐" },
    { key: "style", label: "外观", icon: "🎨" },
    { key: "size", label: "尺寸", icon: "📏" },
    { key: "advanced", label: "高级", icon: "⚙️" },
  ] as const;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50/50">
      <Breadcrumb />
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-medium shadow-2xl">{toast}</div>}

      {showExportMenu && (
        <div className="fixed z-[200] w-56 bg-app-bg rounded-xl shadow-2xl border border-gray-100 overflow-hidden" style={{ top: menuPos.top, right: menuPos.right }}>
          <button onClick={exportTailwindFile} className="w-full text-left px-4 py-3 text-xs hover:bg-violet-50 transition flex items-center gap-3 border-b"><span>🎨</span>下载 Tailwind HTML</button>
          <button onClick={exportHtmlCssFile} className="w-full text-left px-4 py-3 text-xs hover:bg-violet-50 transition flex items-center gap-3 border-b"><span>📄</span>下载 HTML + CSS</button>
          <button onClick={() => copyCode("tailwind")} className="w-full text-left px-4 py-2.5 text-xs hover:bg-violet-100 text-violet-600 font-medium border-b">📋 复制 Tailwind 代码</button>
          <button onClick={() => copyCode("htmlcss")} className="w-full text-left px-4 py-2.5 text-xs hover:bg-violet-100 text-violet-600 font-medium">📋 复制 HTML+CSS 代码</button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLocalImageUpload} />

      <header className="h-14 border-b bg-app-bg/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-gray-800">🧩 页面生成器</h1>
          {breadcrumb.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>根</span>
              {breadcrumb.map((b, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="mx-1">/</span>
                  <span className={i === breadcrumb.length - 1 ? "text-violet-500 font-medium" : ""}>{b}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={historyIndexRef.current <= 0} className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-gray-50 disabled:opacity-30">↩ 撤销</button>
          <button onClick={redo} disabled={historyIndexRef.current >= historyRef.current.length - 1} className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-gray-50 disabled:opacity-30">↪ 重做</button>
          <div className="w-px h-5 bg-gray-200" />
          <button onClick={() => { setRootItems([]); pushHistory([]); setSelectedId(null); showToast("画布已清空"); }} className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-red-50 hover:text-red-600">🗑 清空</button>
          <button ref={exportBtnRef} onClick={openExportMenu} className="px-3 py-1.5 text-xs bg-violet-500 text-white rounded-lg hover:bg-violet-600">📤 导出 ▾</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <aside className="w-60 border-r bg-app-bg/60 backdrop-blur-xl p-4 overflow-auto shrink-0">
          {categories.map(cat => (
            <div key={cat.name} className="mb-5">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{cat.name}</h3>
              <div className="space-y-1.5">
                {cat.items.map(item => (
                  <div key={item.type} draggable onDragStart={(e) => handleDragStart(e, item.type)} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 cursor-grab active:cursor-grabbing hover:border-violet-200 hover:bg-violet-50/50 transition-all group">
                    <span className="text-base group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-auto p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]" onDrop={handleRootDrop} onDragOver={(e) => e.preventDefault()} onClick={() => setSelectedId(null)}>
          {rootItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-violet-200 rounded-3xl bg-violet-50/30 min-h-[400px]">
              <div className="text-4xl mb-3 animate-bounce">🧩</div>
              <p className="text-base font-semibold text-violet-600 mb-1">拖拽组件到这里开始</p>
              <p className="text-xs text-gray-400">从左侧选择组件，拖到画布或者容器内</p>
            </div>
          ) : (
            <div className="bg-app-bg/90 backdrop-blur-sm min-h-full p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              {rootItems.map(renderNode)}
            </div>
          )}
        </main>

        {/* Right Panel */}
        <aside className="w-80 border-l bg-app-bg/60 backdrop-blur-xl flex flex-col shrink-0">
          <div className="flex border-b bg-app-bg/80 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setAttrTab(t.key)} className={`flex-1 min-w-[60px] py-2.5 text-xs font-medium transition-all whitespace-nowrap ${attrTab === t.key ? "text-violet-600 border-b-2 border-violet-500 bg-violet-50/30" : "text-gray-400 hover:text-gray-600"}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {!selectedItem ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-300"><span className="text-3xl mb-2">👆</span><p className="text-xs">选中画布上的组件来编辑属性</p></div>
            ) : (
              <div className="space-y-4">
                {/* Content */}
                {attrTab === "content" && (
                  <div className="space-y-4">
                    {selectedItem.type === "image" && <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 transition">📂 点击上传本地图片</button>}
                    <Section title="文本内容"><input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none" value={selectedItem.text} onChange={(e) => patchSelected({ text: e.target.value })} placeholder="输入文本..." /></Section>
                    {selectedItem.type === "image" && <Section title="或输入图片 URL"><input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none" value={selectedItem.imageSrc || ""} onChange={(e) => patchSelected({ imageSrc: e.target.value })} placeholder="https://..." /></Section>}
                    <button onClick={deleteSelected} className="w-full py-2.5 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition">🗑 删除组件</button>
                  </div>
                )}

                {/* Layout */}
                {attrTab === "layout" && (
                  <div className="space-y-4">
                    <Section title="布局模式">
                      <div className="grid grid-cols-3 gap-2">
                        {["none", "flex", "grid"].map(m => (
                          <button key={m} onClick={() => patchLayout({ mode: m as any })} className={`py-2 rounded-xl text-xs font-medium transition ${selectedItem.layout?.mode === m ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                            {m === "none" ? "无" : m === "flex" ? "Flex" : "Grid"}
                          </button>
                        ))}
                      </div>
                    </Section>

                    {selectedItem.layout?.mode === "flex" && (
                      <>
                        <Section title="方向">
                          <div className="grid grid-cols-2 gap-2">
                            {["row", "col"].map(d => (
                              <button key={d} onClick={() => patchLayout({ flexDir: d as any })} className={`py-2 rounded-xl text-xs font-medium transition ${selectedItem.layout?.flexDir === d ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                                {d === "row" ? "→ 横向" : "↓ 纵向"}
                              </button>
                            ))}
                          </div>
                        </Section>
                        <Section title="主轴对齐">
                          <div className="grid grid-cols-5 gap-1.5">
                            {["start", "center", "end", "between", "around"].map(j => (
                              <button key={j} onClick={() => patchLayout({ justify: j as any })} className={`py-1.5 rounded-lg text-[11px] font-medium transition ${selectedItem.layout?.justify === j ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>{j}</button>
                            ))}
                          </div>
                        </Section>
                        <Section title="交叉轴对齐">
                          <div className="grid grid-cols-4 gap-1.5">
                            {["start", "center", "end", "stretch"].map(a => (
                              <button key={a} onClick={() => patchLayout({ align: a as any })} className={`py-1.5 rounded-lg text-[11px] font-medium transition ${selectedItem.layout?.align === a ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>{a}</button>
                            ))}
                          </div>
                        </Section>
                      </>
                    )}

                    {(selectedItem.layout?.mode === "flex" || selectedItem.layout?.mode === "grid") && (
                      <Section title={`间距 gap-${selectedItem.layout?.gap ?? 0}`}>
                        <input type="range" min={0} max={12} className="w-full accent-violet-500" value={selectedItem.layout?.gap ?? 0} onChange={(e) => patchLayout({ gap: Number(e.target.value) })} />
                      </Section>
                    )}

                    {selectedItem.layout?.mode === "grid" && (
                      <Section title="Grid 列数">
                        <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none" value={selectedItem.layout?.gridCols ?? ""} onChange={(e) => patchLayout({ gridCols: e.target.value })} placeholder="2 或 1fr 2fr" />
                      </Section>
                    )}

                    {selectedItem.type === "image" && (
                      <>
                        <Section title="图片填充 (object-fit)">
                          <div className="grid grid-cols-5 gap-1.5">
                            {(["cover", "contain", "fill", "none", "scale-down"] as const).map(f => (
                              <button key={f} onClick={() => patchImage({ fit: f })} className={`py-1.5 rounded-lg text-[11px] font-medium transition ${selectedItem.image?.fit === f ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>{f}</button>
                            ))}
                          </div>
                        </Section>
                        <Section title="图片定位 (object-position)">
                          <div className="grid grid-cols-3 gap-1.5">
                            {(["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"] as const).map(p => (
                              <button key={p} onClick={() => patchImage({ position: p })} className={`py-1.5 rounded-lg text-[11px] font-medium transition ${selectedItem.image?.position === p ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>{p}</button>
                            ))}
                          </div>
                        </Section>
                        <Section title="比例锁定 (aspect-ratio)">
                          <div className="grid grid-cols-4 gap-1.5 mb-2">
                            {(["", "1/1", "4/3", "16/9"] as const).map(r => (
                              <button key={r || "auto"} onClick={() => patchImage({ aspectRatio: r })} className={`py-1.5 rounded-lg text-[11px] font-medium transition ${selectedItem.image?.aspectRatio === r ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>{r || "自由"}</button>
                            ))}
                          </div>
                          <input className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-mono" value={selectedItem.image?.aspectRatio || ""} onChange={(e) => patchImage({ aspectRatio: e.target.value })} placeholder='自定义如: 21/9' />
                        </Section>
                      </>
                    )}
                  </div>
                )}

                {/* Style */}
                {attrTab === "style" && (
                  <div className="space-y-4">
                    <Section title="背景颜色">
                      <div className="flex flex-wrap gap-1.5 mb-2">{PRESET_COLORS.map(c => <button key={c} onClick={() => patchSelected({ style: { ...selectedItem.style, bgColor: c, bgGradient: false, glass: false } })} className={`w-6 h-6 rounded-lg border-2 transition ${selectedItem.style.bgColor === c ? "border-violet-500 scale-110" : "border-gray-200"}`} style={{ backgroundColor: c }} />)}</div>
                      <div className="flex gap-2 items-center"><input type="color" value={selectedItem.style.bgColor || "#ffffff"} onChange={(e) => patchSelected({ style: { ...selectedItem.style, bgColor: e.target.value, bgGradient: false, glass: false } })} className="w-8 h-8 rounded cursor-pointer border-0" /><input className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-mono" value={selectedItem.style.bgColor} onChange={(e) => patchSelected({ style: { ...selectedItem.style, bgColor: e.target.value, bgGradient: false, glass: false } })} placeholder="#ffffff" />{selectedItem.style.bgColor && <button onClick={() => patchSelected({ style: { ...selectedItem.style, bgColor: "" } })} className="text-xs text-gray-400 hover:text-red-500">✕</button>}</div>
                      {selectedItem.style.bgColor && (
                      <Section title={`背景透明度 ${selectedItem.style.bgOpacity ?? 100}%`}>
                        <input type="range" min={0} max={100} step={1} className="w-full accent-violet-500" value={selectedItem.style.bgOpacity ?? 100} onChange={(e) => patchSelected({ style: { ...selectedItem.style, bgOpacity: Number(e.target.value) } })} />
                      </Section>
                    )}
                    </Section>
                    <Section title="文字颜色">
                      <div className="flex flex-wrap gap-1.5 mb-2">{TEXT_COLORS.map(c => <button key={c || "inherit"} onClick={() => patchSelected({ style: { ...selectedItem.style, textColor: c } })} className={`w-6 h-6 rounded-lg border-2 transition ${selectedItem.style.textColor === c ? "border-violet-500 scale-110" : "border-gray-200"}`} style={c ? { backgroundColor: c } : { background: "linear-gradient(135deg,#ddd,#999)" }} />)}</div>
                      <div className="flex gap-2 items-center"><input type="color" value={selectedItem.style.textColor || "#000000"} onChange={(e) => patchSelected({ style: { ...selectedItem.style, textColor: e.target.value } })} className="w-8 h-8 rounded cursor-pointer border-0" /><input className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-mono" value={selectedItem.style.textColor} onChange={(e) => patchSelected({ style: { ...selectedItem.style, textColor: e.target.value } })} placeholder="inherit" /></div>
                      {selectedItem.style.textColor && (
                      <Section title={`文字透明度 ${selectedItem.style.textOpacity ?? 100}%`}>
                        <input type="range" min={0} max={100} step={1} className="w-full accent-violet-500" value={selectedItem.style.textOpacity ?? 100} onChange={(e) => patchSelected({ style: { ...selectedItem.style, textOpacity: Number(e.target.value) } })} />
                      </Section>
                    )}
                    </Section>
                    <Section title={`文字大小 ${selectedItem.style.fontSize}px`}><input type="range" min={10} max={72} step={1} className="w-full accent-violet-500" value={selectedItem.style.fontSize} onChange={(e) => patchSelected({ style: { ...selectedItem.style, fontSize: Number(e.target.value) } })} /></Section>
                    <Section title="字重"><div className="grid grid-cols-4 gap-1.5">{["normal", "medium", "semibold", "bold"].map(w => <button key={w} onClick={() => patchSelected({ style: { ...selectedItem.style, fontWeight: w as any } })} className={`py-1.5 rounded-lg text-[11px] font-medium transition ${selectedItem.style.fontWeight === w ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>{w}</button>)}</div></Section>
                    <Section title={`边框宽度 ${selectedItem.style.borderWidth}px`}><input type="range" min={0} max={8} step={1} className="w-full accent-violet-500" value={selectedItem.style.borderWidth} onChange={(e) => patchSelected({ style: { ...selectedItem.style, borderWidth: Number(e.target.value) } })} />{selectedItem.style.borderWidth > 0 && <div className="flex gap-2 items-center mt-2"><input type="color" value={selectedItem.style.borderColor} onChange={(e) => patchSelected({ style: { ...selectedItem.style, borderColor: e.target.value } })} className="w-7 h-7 rounded cursor-pointer border-0" /><input className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-mono" value={selectedItem.style.borderColor} onChange={(e) => patchSelected({ style: { ...selectedItem.style, borderColor: e.target.value } })} /></div>}</Section>
                    <Section title={`圆角 ${selectedItem.style.radius}px`}><input type="range" min={0} max={200} step={1} className="w-full accent-violet-500" value={selectedItem.style.radius} onChange={(e) => patchSelected({ style: { ...selectedItem.style, radius: Number(e.target.value) } })} /></Section>
                    <Section title="阴影"><div className="grid grid-cols-5 gap-1.5">{["none", "sm", "md", "lg", "xl"].map(s => <button key={s} onClick={() => patchSelected({ style: { ...selectedItem.style, shadow: s as any } })} className={`py-1.5 rounded-lg text-[11px] font-medium transition ${selectedItem.style.shadow === s ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>{s}</button>)}</div></Section>
                    <ToggleRow label="🔮 毛玻璃" checked={selectedItem.style.glass} onChange={(v) => patchSelected({ style: { ...selectedItem.style, glass: v, bgGradient: false } })} />
                    <ToggleRow label="✨ 紫色发光" checked={selectedItem.style.glow} onChange={(v) => patchSelected({ style: { ...selectedItem.style, glow: v } })} />
                    <ToggleRow label="🌈 渐变背景" checked={selectedItem.style.bgGradient} onChange={(v) => patchSelected({ style: { ...selectedItem.style, bgGradient: v, glass: false } })} />
                  </div>
                )}

                {/* Size */}
                {attrTab === "size" && (
                  <div className="space-y-4">
                    <Section title="宽度">
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <button onClick={() => patchSelected({ style: { ...selectedItem.style, width: "" } })} className={`py-2 rounded-xl text-xs font-medium transition ${selectedItem.style.width === "" ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>自适应</button>
                        <button onClick={() => patchSelected({ style: { ...selectedItem.style, width: "full" } })} className={`py-2 rounded-xl text-xs font-medium transition ${selectedItem.style.width === "full" ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>100% 撑满</button>
                        <button onClick={() => patchSelected({ style: { ...selectedItem.style, width: "320px" } })} className={`py-2 rounded-xl text-xs font-medium transition ${selectedItem.style.width === "320px" ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>固定 320px</button>
                      </div>
                      <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none font-mono" value={selectedItem.style.width} onChange={(e) => patchSelected({ style: { ...selectedItem.style, width: e.target.value } })} placeholder='如: 100%, 320px, 50vw' />
                    </Section>
                    <Section title="高度">
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <button onClick={() => patchSelected({ style: { ...selectedItem.style, height: "" } })} className={`py-2 rounded-xl text-xs font-medium transition ${selectedItem.style.height === "" ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>自适应</button>
                        <button onClick={() => patchSelected({ style: { ...selectedItem.style, height: "auto" } })} className={`py-2 rounded-xl text-xs font-medium transition ${selectedItem.style.height === "auto" ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>auto</button>
                        <button onClick={() => patchSelected({ style: { ...selectedItem.style, height: "200px" } })} className={`py-2 rounded-xl text-xs font-medium transition ${selectedItem.style.height === "200px" ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}>固定 200px</button>
                      </div>
                      <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none font-mono" value={selectedItem.style.height} onChange={(e) => patchSelected({ style: { ...selectedItem.style, height: e.target.value } })} placeholder='如: 200px, 50vh' />
                    </Section>
                    <Section title="最小高度">
                      <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none font-mono" value={selectedItem.style.minHeight} onChange={(e) => patchSelected({ style: { ...selectedItem.style, minHeight: e.target.value } })} placeholder='如: 120px, 50vh' />
                    </Section>
                    <Section title={`内边距 padding-${selectedItem.style.padding}`}>
                      <input type="range" min={0} max={16} className="w-full accent-violet-500" value={selectedItem.style.padding} onChange={(e) => patchSelected({ style: { ...selectedItem.style, padding: Number(e.target.value) } })} />
                    </Section>
                  </div>
                )}

                {/* Advanced */}
                {attrTab === "advanced" && (
                  <div className="space-y-4">
                    <Section title="自定义 Class">
                      <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-200 outline-none font-mono" value={selectedItem.className} onChange={(e) => patchSelected({ className: e.target.value })} placeholder="如: animate-bounce custom-class" />
                    </Section>
                    <button onClick={deleteSelected} className="w-full py-2.5 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition">🗑 删除组件</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ===================== Helper Components =====================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-gray-600">{label}</span>
      <button onClick={() => onChange(!checked)} className={`w-10 h-5 rounded-full transition relative ${checked ? "bg-violet-500" : "bg-gray-200"}`}>
        <span className={`absolute top-0.5 ${checked ? "right-0.5" : "left-0.5"} w-4 h-4 bg-app-bg rounded-full shadow transition`} />
      </button>
    </div>
  );
}