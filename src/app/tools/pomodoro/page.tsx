"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Coffee,
  Copy,
  Flame,
  Focus,
  GripVertical,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SkipForward,
  Target,
  TimerReset,
  Trash2,
  X,
} from "lucide-react";
import { gsap } from "gsap";
import { Breadcrumb } from "@/components/breadcrumb";
import FooterNote from "@/components/FooterNote";

type Task = {
  id: string;
  title: string;
  done: boolean;
  poms: number;
};

type Mode = "focus" | "short" | "long";

type StoredPomodoro = {
  tasks?: Task[];
  completedPoms?: number;
  todayPoms?: number;
  todayDate?: string;
  streak?: number;
  lastFocusDate?: string;
  focusMin?: number;
  shortMin?: number;
  longMin?: number;
  autoStart?: boolean;
  selectedTaskId?: string | null;
};

const MODE_CONFIG: Record<
  Mode,
  {
    label: string;
    helper: string;
    minutes: number;
    accent: string;
    soft: string;
    icon: typeof Focus;
  }
> = {
  focus: {
    label: "专注",
    helper: "只做一件事",
    minutes: 25,
    accent: "#aaff57",
    soft: "#efffdc",
    icon: Focus,
  },
  short: {
    label: "短休息",
    helper: "离开屏幕一下",
    minutes: 5,
    accent: "#9feaff",
    soft: "#e8faff",
    icon: Coffee,
  },
  long: {
    label: "长休息",
    helper: "恢复注意力",
    minutes: 15,
    accent: "#d7c4ff",
    soft: "#f1ebff",
    icon: TimerReset,
  },
};

const STORAGE_KEY = "bitleap-pomodoro";

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isYesterday(previous: string, current: string) {
  const [py, pm, pd] = previous.split("-").map(Number);
  const [cy, cm, cd] = current.split("-").map(Number);

  const previousDate = new Date(py, pm - 1, pd);
  const currentDate = new Date(cy, cm - 1, cd);
  const diff = currentDate.getTime() - previousDate.getTime();

  return Math.round(diff / 86_400_000) === 1;
}

function clampMinutes(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(120, Math.max(1, Math.round(value)));
}

export default function PomodoroPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const timerVisualRef = useRef<HTMLDivElement>(null);
  const deadlineRef = useRef<number | null>(null);
  const timerEndFiredRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [hydrated, setHydrated] = useState(false);

  const [focusMin, setFocusMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [autoStart, setAutoStart] = useState(false);

  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [completedPoms, setCompletedPoms] = useState(0);
  const [todayPoms, setTodayPoms] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastFocusDate, setLastFocusDate] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState("");

  const hasNotification =
    typeof window !== "undefined" && "Notification" in window;

  const getTotalSeconds = useCallback(
    (targetMode: Mode) => {
      const map: Record<Mode, number> = {
        focus: focusMin,
        short: shortMin,
        long: longMin,
      };
      return Math.max(1, map[targetMode]) * 60;
    },
    [focusMin, shortMin, longMin],
  );

  // Load once. The hydrated gate prevents the default state from overwriting
  // existing localStorage before the first restore has finished.
  useEffect(() => {
    const today = localDateKey();

    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const data = JSON.parse(raw) as StoredPomodoro;

        if (Array.isArray(data.tasks)) setTasks(data.tasks);
        if (typeof data.completedPoms === "number") {
          setCompletedPoms(data.completedPoms);
        }
        if (typeof data.streak === "number") setStreak(data.streak);
        if (typeof data.lastFocusDate === "string") {
          setLastFocusDate(data.lastFocusDate);
        }

        if (data.todayDate === today && typeof data.todayPoms === "number") {
          setTodayPoms(data.todayPoms);
        } else {
          setTodayPoms(0);
        }

        if (typeof data.focusMin === "number") {
          setFocusMin(clampMinutes(data.focusMin));
        }
        if (typeof data.shortMin === "number") {
          setShortMin(clampMinutes(data.shortMin));
        }
        if (typeof data.longMin === "number") {
          setLongMin(clampMinutes(data.longMin));
        }
        if (typeof data.autoStart === "boolean") {
          setAutoStart(data.autoStart);
        }
        if (
          data.selectedTaskId === null ||
          typeof data.selectedTaskId === "string"
        ) {
          setSelectedTaskId(data.selectedTaskId);
        }
      }
    } catch {
      setError("本地数据读取失败，已使用默认设置。");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tasks,
          completedPoms,
          todayPoms,
          todayDate: localDateKey(),
          streak,
          lastFocusDate,
          focusMin,
          shortMin,
          longMin,
          autoStart,
          selectedTaskId,
        }),
      );
    } catch {
      setError("保存失败，浏览器本地存储可能不可用。");
    }
  }, [
    hydrated,
    tasks,
    completedPoms,
    todayPoms,
    streak,
    lastFocusDate,
    focusMin,
    shortMin,
    longMin,
    autoStart,
    selectedTaskId,
  ]);

  useEffect(() => {
    if (!rootRef.current) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.from(".pomodoro-reveal", {
        y: 18,
        opacity: 0,
        duration: 0.55,
        stagger: 0.055,
        ease: "power3.out",
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const unlockAudio = useCallback(async () => {
    if (typeof window === "undefined") return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextCtor) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume().catch(() => {});
    }
  }, []);

  const playChime = useCallback(
    (isFocusEnd: boolean) => {
      const ctx = audioContextRef.current;

      if (ctx) {
        const now = ctx.currentTime;
        const frequencies = isFocusEnd ? [660, 880] : [520, 660];

        frequencies.forEach((frequency, index) => {
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + index * 0.18;

          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(frequency, start);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.13, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);

          oscillator.connect(gain);
          gain.connect(ctx.destination);
          oscillator.start(start);
          oscillator.stop(start + 0.18);
        });
      }

      if (hasNotification && Notification.permission === "granted") {
        try {
          new Notification("BitLeap 番茄钟", {
            body: isFocusEnd
              ? "本轮专注完成。休息一下，再回来继续。"
              : "休息结束，可以开始下一轮专注了。",
            icon: "/favicon.ico",
          });
        } catch {
          // Notification failure should never interrupt the timer flow.
        }
      }
    },
    [hasNotification],
  );

  const updateStreak = useCallback(() => {
    const today = localDateKey();

    setLastFocusDate((previous) => {
      if (previous === today) return previous;

      setStreak((current) => {
        if (!previous) return 1;
        return isYesterday(previous, today) ? current + 1 : 1;
      });

      return today;
    });
  }, []);

  const switchMode = useCallback(
    (targetMode: Mode, shouldRun = false) => {
      deadlineRef.current = null;
      timerEndFiredRef.current = false;
      setMode(targetMode);
      setSecondsLeft(getTotalSeconds(targetMode));
      setRunning(shouldRun);
    },
    [getTotalSeconds],
  );

  // Keep idle timer in sync when settings change.
  useEffect(() => {
    if (running) return;
    setSecondsLeft(getTotalSeconds(mode));
    timerEndFiredRef.current = false;
  }, [focusMin, shortMin, longMin, mode, running, getTotalSeconds]);

  // Deadline-based timer avoids the drift of a simple "subtract 1 every second"
  // interval and catches up correctly after background-tab throttling.
  useEffect(() => {
    if (!running) {
      deadlineRef.current = null;
      return;
    }

    if (!deadlineRef.current) {
      deadlineRef.current = Date.now() + secondsLeft * 1000;
    }

    const sync = () => {
      if (!deadlineRef.current) return;
      const next = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      );
      setSecondsLeft(next);
    };

    sync();
    const interval = window.setInterval(sync, 250);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [running, secondsLeft]);

  useEffect(() => {
    if (secondsLeft !== 0 || !running) {
      if (secondsLeft > 0) timerEndFiredRef.current = false;
      return;
    }

    if (timerEndFiredRef.current) return;
    timerEndFiredRef.current = true;
    deadlineRef.current = null;

    if (mode === "focus") {
      const nextCompleted = completedPoms + 1;

      playChime(true);
      setCompletedPoms(nextCompleted);
      setTodayPoms((current) => current + 1);
      updateStreak();

      if (selectedTaskId) {
        setTasks((current) =>
          current.map((task) =>
            task.id === selectedTaskId
              ? { ...task, poms: task.poms + 1 }
              : task,
          ),
        );
      }

      switchMode(nextCompleted % 4 === 0 ? "long" : "short");
    } else {
      playChime(false);
      switchMode("focus", autoStart);
    }
  }, [
    secondsLeft,
    running,
    mode,
    completedPoms,
    selectedTaskId,
    autoStart,
    playChime,
    switchMode,
    updateStreak,
  ]);

  const toggleTimer = async () => {
    await unlockAudio();

    if (!running && hasNotification && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    if (running) {
      if (deadlineRef.current) {
        const remaining = Math.max(
          0,
          Math.ceil((deadlineRef.current - Date.now()) / 1000),
        );
        setSecondsLeft(remaining);
      }

      deadlineRef.current = null;
      setRunning(false);
      return;
    }

    deadlineRef.current = Date.now() + secondsLeft * 1000;
    setRunning(true);
  };

  const skip = () => {
    deadlineRef.current = null;
    timerEndFiredRef.current = false;

    // Skipping a focus session does not count it as completed.
    if (mode === "focus") {
      switchMode(
        completedPoms > 0 && completedPoms % 4 === 0 ? "long" : "short",
      );
    } else {
      switchMode("focus");
    }
  };

  const reset = () => {
    deadlineRef.current = null;
    timerEndFiredRef.current = false;
    setRunning(false);
    setSecondsLeft(getTotalSeconds(mode));
  };

  const addTask = () => {
    const title = input.trim();

    if (!title) {
      setError("先写下一个明确的任务，再开始专注。");
      return;
    }

    const task: Task = {
      id: crypto.randomUUID(),
      title,
      done: false,
      poms: 0,
    };

    setError("");
    setTasks((current) => [...current, task]);
    setInput("");
    setSelectedTaskId((current) => current ?? task.id);
  };

  const toggleTask = (id: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    );

    if (selectedTaskId === id) {
      const target = tasks.find((task) => task.id === id);
      if (target && !target.done) setSelectedTaskId(null);
    }
  };

  const deleteTask = (id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  };

  const addPomToTask = (id: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, poms: task.poms + 1 } : task,
      ),
    );
  };

  const moveTask = (id: string, direction: -1 | 1) => {
    setTasks((current) => {
      const index = current.findIndex((task) => task.id === id);
      const targetIndex = index + direction;

      if (
        index < 0 ||
        targetIndex < 0 ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const onDragStart = (
    event: React.DragEvent,
    id: string,
  ) => {
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDrop = (
    event: React.DragEvent,
    targetId: string,
  ) => {
    event.preventDefault();

    if (!dragId || dragId === targetId) return;

    setTasks((current) => {
      const from = current.findIndex((task) => task.id === dragId);
      const to = current.findIndex((task) => task.id === targetId);

      if (from < 0 || to < 0) return current;

      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

    setDragId(null);
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("复制失败，请手动复制任务内容。");
    }
  };

  const timeDisplay = useMemo(() => {
    const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const seconds = String(secondsLeft % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [secondsLeft]);

  const progress = useMemo(() => {
    const total = getTotalSeconds(mode);
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, 1 - secondsLeft / total));
  }, [secondsLeft, mode, getTotalSeconds]);

  const activeTasks = tasks.filter((task) => !task.done);
  const doneTasks = tasks.filter((task) => task.done);
  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId && !task.done) ?? null;
  const cycleProgress = completedPoms % 4;

  const radius = 128;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const currentMode = MODE_CONFIG[mode];
  const ModeIcon = currentMode.icon;

  useEffect(() => {
    if (!timerVisualRef.current) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) return;

    gsap.fromTo(
      timerVisualRef.current,
      { scale: 0.985, opacity: 0.86 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.35,
        ease: "power3.out",
        overwrite: true,
      },
    );
  }, [mode]);

  return (
    <div
      ref={rootRef}
      className="min-h-[100dvh] bg-[#f4f4ef] text-[#11120f] selection:bg-[#dfff84]"
    >
      <div className="mx-auto w-full max-w-[1480px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <Breadcrumb />

        <header className="pomodoro-reveal mt-5 flex flex-col gap-4 border-b border-black/[0.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30">
              Focus Workspace
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.055em] sm:text-4xl">
              番茄钟
            </h1>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/42">
              一个安静的专注工作台。选择任务、开始计时，完成的番茄会自动记到当前任务。
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold text-black/35">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.07] bg-white/60 px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#aaff57]" />
              本地保存
            </span>
            <span className="hidden rounded-full border border-black/[0.07] bg-white/60 px-3 py-2 sm:inline-flex">
              无账号 · 无上传
            </span>
          </div>
        </header>

        {error && (
          <div className="pomodoro-reveal mt-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-red-400 transition hover:text-red-700"
              aria-label="关闭提示"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
          <section className="pomodoro-reveal overflow-hidden rounded-[30px] border border-black/[0.065] bg-[#fbfbf7] shadow-[0_28px_90px_-68px_rgba(0,0,0,.32)]">
            <div className="border-b border-black/[0.055] p-3 sm:p-4">
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-black/[0.035] p-1">
                {(Object.keys(MODE_CONFIG) as Mode[]).map((key) => {
                  const config = MODE_CONFIG[key];
                  const Icon = config.icon;
                  const active = mode === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => switchMode(key)}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-[11px] font-black transition ${
                        active
                          ? "bg-[#11120f] text-white shadow-sm"
                          : "text-black/42 hover:bg-white/70 hover:text-black"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 sm:p-7 lg:p-8">
              <div className="flex flex-col items-center">
                <div
                  className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 py-2 text-[10px] font-bold text-black/45"
                  title={selectedTask?.title}
                >
                  <Target className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {selectedTask
                      ? selectedTask.title
                      : mode === "focus"
                        ? "先选择一个今天最重要的任务"
                        : currentMode.helper}
                  </span>
                </div>

                <div
                  ref={timerVisualRef}
                  className="relative h-[286px] w-[286px] sm:h-[322px] sm:w-[322px]"
                >
                  <div
                    className={`absolute inset-[23px] rounded-full transition-colors duration-500 ${
                      running ? "animate-[pulse_3s_ease-in-out_infinite]" : ""
                    }`}
                    style={{ backgroundColor: currentMode.soft }}
                  />

                  <svg
                    className="absolute inset-0 h-full w-full -rotate-90"
                    viewBox="0 0 300 300"
                    aria-hidden="true"
                  >
                    <circle
                      cx="150"
                      cy="150"
                      r={radius}
                      fill="none"
                      stroke="rgba(17,18,15,.07)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="150"
                      cy="150"
                      r={radius}
                      fill="none"
                      stroke={currentMode.accent}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-[stroke-dashoffset,stroke] duration-300 ease-linear"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          running ? "animate-pulse" : ""
                        }`}
                        style={{ backgroundColor: currentMode.accent }}
                      />
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-black/30">
                        {running ? "In session" : currentMode.helper}
                      </span>
                    </div>

                    <div className="font-mono text-[54px] font-semibold tracking-[-0.075em] tabular-nums sm:text-[64px]">
                      {timeDisplay}
                    </div>

                    <div className="mt-4 flex items-center gap-1.5">
                      {[0, 1, 2, 3].map((index) => {
                        const filled =
                          index < cycleProgress ||
                          (cycleProgress === 0 &&
                            completedPoms > 0 &&
                            completedPoms % 4 === 0);

                        return (
                          <span
                            key={index}
                            className={`h-1.5 w-7 rounded-full transition ${
                              filled ? "bg-[#11120f]" : "bg-black/10"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-2 text-[9px] font-bold text-black/25">
                      {cycleProgress === 0 && completedPoms > 0
                        ? "一轮完成"
                        : `${cycleProgress}/4 本轮`}
                    </div>
                  </div>
                </div>

                <div className="mt-7 flex w-full max-w-[440px] items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTimer}
                    className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-[#11120f] px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-20px_rgba(0,0,0,.55)] active:translate-y-0 active:scale-[0.985]"
                  >
                    {running ? (
                      <Pause className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 fill-current" />
                    )}
                    {running ? "暂停" : "开始专注"}
                  </button>

                  <button
                    type="button"
                    onClick={reset}
                    aria-label="重置当前计时"
                    title="重置"
                    className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/50 transition hover:bg-black/[0.04] hover:text-black"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={skip}
                    aria-label="跳过当前阶段"
                    title="跳过"
                    className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/50 transition hover:bg-black/[0.04] hover:text-black"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-3 divide-x divide-black/[0.065] border-y border-black/[0.065] py-4">
                <Metric
                  icon={<Focus className="h-3.5 w-3.5" />}
                  value={todayPoms}
                  label="今日番茄"
                />
                <Metric
                  icon={<Flame className="h-3.5 w-3.5" />}
                  value={streak}
                  label="连续天数"
                />
                <Metric
                  icon={<Clipboard className="h-3.5 w-3.5" />}
                  value={activeTasks.length}
                  label="待办任务"
                />
              </div>

              <button
                type="button"
                onClick={() => setSettingsOpen((current) => !current)}
                className="mt-5 flex w-full items-center justify-between rounded-2xl px-2 py-2 text-left transition hover:bg-black/[0.025]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.045]">
                    <Settings2 className="h-4 w-4 text-black/50" />
                  </div>
                  <div>
                    <div className="text-xs font-black">计时设置</div>
                    <div className="mt-0.5 text-[10px] font-medium text-black/32">
                      {focusMin} / {shortMin} / {longMin} 分钟
                    </div>
                  </div>
                </div>

                <ChevronDown
                  className={`h-4 w-4 text-black/30 transition-transform ${
                    settingsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {settingsOpen && (
                <div className="mt-3 rounded-2xl border border-black/[0.06] bg-white p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MinuteInput
                      label="专注"
                      value={focusMin}
                      onChange={setFocusMin}
                    />
                    <MinuteInput
                      label="短休"
                      value={shortMin}
                      onChange={setShortMin}
                    />
                    <MinuteInput
                      label="长休"
                      value={longMin}
                      onChange={setLongMin}
                    />
                  </div>

                  <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 border-t border-black/[0.055] pt-4">
                    <div>
                      <div className="text-xs font-black">
                        休息结束自动开始专注
                      </div>
                      <div className="mt-1 text-[10px] leading-5 text-black/35">
                        适合已经进入连续工作节奏时开启。
                      </div>
                    </div>

                    <span
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                        autoStart ? "bg-[#11120f]" : "bg-black/10"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={autoStart}
                        onChange={(event) => setAutoStart(event.target.checked)}
                        className="sr-only"
                      />
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          autoStart ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </span>
                  </label>
                </div>
              )}
            </div>
          </section>

          <section className="pomodoro-reveal flex min-h-[620px] flex-col overflow-hidden rounded-[30px] border border-black/[0.065] bg-white/72 shadow-[0_28px_90px_-72px_rgba(0,0,0,.28)] backdrop-blur">
            <div className="border-b border-black/[0.055] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-black/28">
                    Today
                  </div>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">
                    今天要完成什么？
                  </h2>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-black/36">
                    点一下任务，把它设为当前专注目标。
                  </p>
                </div>

                <span className="rounded-full bg-black/[0.045] px-3 py-1.5 font-mono text-[10px] font-bold text-black/40">
                  {activeTasks.length} open
                </span>
              </div>

              <div className="mt-5 flex gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addTask();
                  }}
                  placeholder="写下下一步具体行动…"
                  className="h-12 min-w-0 flex-1 rounded-2xl border border-black/[0.07] bg-[#f7f7f3] px-4 text-sm font-medium text-black outline-none transition placeholder:text-black/25 focus:border-black/20 focus:bg-white"
                />

                <button
                  type="button"
                  onClick={addTask}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#11120f] text-white transition hover:scale-[1.03] active:scale-[0.97]"
                  aria-label="添加任务"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-black/28">
                  进行中
                </span>
                {selectedTask && (
                  <span className="max-w-[58%] truncate text-[9px] font-bold text-black/34">
                    当前 · {selectedTask.title}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {activeTasks.map((task, index) => {
                  const selected = task.id === selectedTaskId;

                  return (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={(event) => onDragStart(event, task.id)}
                      onDragOver={onDragOver}
                      onDrop={(event) => onDrop(event, task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`group cursor-pointer rounded-[20px] border p-3.5 transition ${
                        selected
                          ? "border-black/15 bg-[#f1ffdb] shadow-[0_14px_30px_-26px_rgba(0,0,0,.32)]"
                          : "border-black/[0.055] bg-[#fbfbf8] hover:border-black/10 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleTask(task.id);
                          }}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                            task.done
                              ? "border-[#11120f] bg-[#11120f] text-white"
                              : "border-black/15 bg-white hover:border-black/35"
                          }`}
                          aria-label="标记完成"
                        >
                          {task.done && <Check className="h-3 w-3" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <h3 className="min-w-0 flex-1 text-sm font-black leading-5 text-black/78">
                              {task.title}
                            </h3>

                            {selected && (
                              <span className="shrink-0 rounded-full bg-[#11120f] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white">
                                Focus
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 text-[10px] font-bold text-black/36">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#aaff57]" />
                              {task.poms} 番茄
                            </span>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                addPomToTask(task.id);
                              }}
                              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-2.5 text-[10px] font-black text-black/50 transition hover:border-black/15 hover:bg-[#f1ffdb] hover:text-black active:scale-[0.97]"
                              aria-label={`给“${task.title}”添加一个番茄`}
                            >
                              <Plus className="h-3 w-3" />
                              添加番茄
                            </button>
                          </div>
                        </div>

                        <GripVertical className="hidden h-4 w-4 shrink-0 text-black/15 sm:block" />
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-black/[0.045] pt-2.5">
                        <div className="flex items-center gap-1 sm:hidden">
                          <MiniAction
                            label="上移"
                            disabled={index === 0}
                            onClick={() => moveTask(task.id, -1)}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </MiniAction>
                          <MiniAction
                            label="下移"
                            disabled={index === activeTasks.length - 1}
                            onClick={() => moveTask(task.id, 1)}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </MiniAction>
                        </div>

                        <div className="ml-auto flex items-center gap-1">
                          <MiniAction
                            label="复制"
                            onClick={() => copy(task.title, task.id)}
                          >
                            {copied === task.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </MiniAction>
                          <MiniAction
                            label="删除"
                            onClick={() => deleteTask(task.id)}
                            danger
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </MiniAction>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {activeTasks.length === 0 && (
                  <div className="flex min-h-[230px] flex-col items-center justify-center rounded-[22px] border border-dashed border-black/[0.09] bg-black/[0.015] px-6 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7ff9c]">
                      <Target className="h-4 w-4" />
                    </div>
                    <div className="mt-4 text-sm font-black">
                      今天的列表还是空的
                    </div>
                    <p className="mt-1 max-w-[280px] text-[11px] leading-5 text-black/35">
                      不要先列十件事。写下一个你准备在下一轮 25 分钟内推进的动作。
                    </p>
                  </div>
                )}
              </div>

              <section className="mt-6 border-t border-black/[0.055] pt-4">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-black/28">
                      已完成
                    </span>
                    <span className="rounded-full bg-black/[0.045] px-2 py-0.5 font-mono text-[9px] font-bold text-black/35">
                      {doneTasks.length}
                    </span>
                  </div>

                  {doneTasks.length > 0 && (
                    <span className="text-[9px] font-medium text-black/25">
                      点击 ✓ 可恢复任务
                    </span>
                  )}
                </div>

                {doneTasks.length > 0 ? (
                  <div className="space-y-2">
                    {doneTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-center gap-3 rounded-[18px] border border-black/[0.045] bg-black/[0.022] px-3 py-3 transition hover:border-black/[0.07] hover:bg-black/[0.03]"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#11120f] text-white transition hover:scale-105 active:scale-95"
                          aria-label={`恢复任务“${task.title}”`}
                        >
                          <Check className="h-3 w-3" />
                        </button>

                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-black/30 line-through">
                          {task.title}
                        </span>

                        <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-white/70 px-2.5 text-[9px] font-bold text-black/28">
                          {task.poms} 番茄
                        </span>

                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/18 transition hover:bg-red-50 hover:text-red-500"
                          aria-label={`删除已完成任务“${task.title}”`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-black/[0.07] bg-black/[0.012] px-4 py-5 text-center text-[10px] font-medium text-black/25">
                    完成的任务会直接显示在这里
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>

        <section className="pomodoro-reveal mt-5 grid gap-3 sm:grid-cols-3">
          <InfoCard
            icon={<Target className="h-4 w-4" />}
            title="一次只选一个目标"
            text="当前任务会和计时器绑定；完成一轮专注后，番茄数自动记到这个任务。"
          />
          <InfoCard
            icon={<Bell className="h-4 w-4" />}
            title="结束时再打扰你"
            text="计时期间不制造额外反馈，只在阶段结束时播放轻提示并发送通知。"
          />
          <InfoCard
            icon={<Flame className="h-4 w-4" />}
            title="统计只服务于节奏"
            text="今日番茄与连续天数用于判断工作节奏，不做复杂的积分和游戏化。"
          />
        </section>

        <div className="mt-8">
          <FooterNote />
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="px-2 text-center">
      <div className="flex items-center justify-center gap-1.5 text-black/28">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

function MinuteInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.13em] text-black/30">
        {label}
      </span>
      <div className="flex h-10 items-center rounded-xl border border-black/[0.065] bg-[#f7f7f3] px-3">
        <input
          type="number"
          min={1}
          max={120}
          value={value}
          onChange={(event) => onChange(clampMinutes(Number(event.target.value)))}
          className="min-w-0 flex-1 bg-transparent font-mono text-xs font-bold outline-none"
        />
        <span className="text-[9px] font-bold text-black/25">min</span>
      </div>
    </label>
  );
}

function MiniAction({
  children,
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-20 ${
        danger
          ? "text-black/22 hover:bg-red-50 hover:text-red-500"
          : "text-black/22 hover:bg-black/[0.05] hover:text-black/65"
      }`}
    >
      {children}
    </button>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[22px] border border-black/[0.055] bg-white/48 p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.045] text-black/55">
        {icon}
      </div>
      <div className="mt-3 text-xs font-black">{title}</div>
      <p className="mt-1 text-[10px] font-medium leading-5 text-black/35">
        {text}
      </p>
    </div>
  );
}
