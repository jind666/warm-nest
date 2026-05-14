"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import coverImage from "../../cover.jpg";
import { INITIAL_ENTRIES, type Entry, type MediaItem } from "@/lib/warm-nest-model";

const ACCOUNT = process.env.NEXT_PUBLIC_APP_LOGIN_USERNAME ?? "pjdizwj";

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const WEEK_DAYS = ["日", "一", "二", "三", "四", "五", "六"];

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(year: number, month: string) {
  const monthNumber = Number(month);

  if ([1, 3, 5, 7, 8, 10, 12].includes(monthNumber)) {
    return 31;
  }

  if ([4, 6, 9, 11].includes(monthNumber)) {
    return 30;
  }

  if (monthNumber === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return 30;
}

function getTodayDateParts() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: String(now.getMonth() + 1).padStart(2, "0"),
    day: String(now.getDate()).padStart(2, "0"),
  };
}


export default function Home() {
  const today = getTodayDateParts();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [username, setUsername] = useState(ACCOUNT);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [selectedYear, setSelectedYear] = useState(today.year);
  const [selectedMonth, setSelectedMonth] = useState(today.month);
  const [selectedDay, setSelectedDay] = useState(today.day);
  const [entries, setEntries] = useState(INITIAL_ENTRIES);
  const [newNote, setNewNote] = useState("");
  const [newComment, setNewComment] = useState("");
  const [entryCommentDrafts, setEntryCommentDrafts] = useState<Record<number, string>>({});
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [activeMedia, setActiveMedia] = useState<{
    type: "image" | "video";
    url: string;
    label: string;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/session", { credentials: "include" });
        const payload = (await response.json()) as {
          authenticated: boolean;
          username: string | null;
        };

        if (payload.authenticated) {
          setIsLoggedIn(true);
          if (payload.username) {
            setUsername(payload.username);
          }

          const entriesResponse = await fetch("/api/entries", {
            credentials: "include",
          });
          const entriesPayload = (await entriesResponse.json()) as {
            entries?: Entry[];
            error?: string;
          };

          if (entriesResponse.ok && entriesPayload.entries) {
            setEntries(entriesPayload.entries);
          }
        }
      } finally {
        setSessionReady(true);
      }
    };

    void loadSession();
  }, []);

  const selectedDate = useMemo(
    () => `${selectedYear}-${selectedMonth}-${selectedDay}`,
    [selectedYear, selectedMonth, selectedDay],
  );

  const selectedDayEntries = useMemo(
    () => entries.filter((entry) => entry.date === selectedDate),
    [entries, selectedDate],
  );

  const activeEntry = useMemo(() => {
    return selectedDayEntries[0] ?? null;
  }, [selectedDayEntries]);

  const daysInCurrentMonth = useMemo(
    () => getDaysInMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  );

  const currentDays = useMemo(
    () =>
      Array.from({ length: daysInCurrentMonth }, (_, index) => String(index + 1).padStart(2, "0")),
    [daysInCurrentMonth],
  );

  const calendarCells = useMemo(() => {
    const firstDayOffset = new Date(selectedYear, Number(selectedMonth) - 1, 1).getDay();
    const cells: Array<{ day: string; isCurrentMonth: boolean }> = [];

    for (let index = 0; index < firstDayOffset; index += 1) {
      cells.push({ day: "", isCurrentMonth: false });
    }

    for (const day of currentDays) {
      cells.push({ day, isCurrentMonth: true });
    }

    return cells;
  }, [currentDays, selectedMonth, selectedYear]);

  const entriesByDay = useMemo(() => {
    const counts = new Map<string, number>();

    for (const entry of entries) {
      if (!entry.date.startsWith(`${selectedYear}-${selectedMonth}`)) {
        continue;
      }

      const day = entry.date.slice(-2);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }

    return counts;
  }, [entries, selectedMonth, selectedYear]);

  const loadEntries = async () => {
    const response = await fetch("/api/entries", {
      credentials: "include",
    });

    const payload = (await response.json()) as {
      entries?: Entry[];
      error?: string;
    };

    if (response.ok && payload.entries) {
      setEntries(payload.entries);
    }
  };

  const updateYear = (year: number) => {
    setSelectedYear(year);

    const maxDay = getDaysInMonth(year, selectedMonth);
    if (Number(selectedDay) > maxDay) {
      setSelectedDay(String(maxDay).padStart(2, "0"));
    }
  };

  const updateMonth = (month: string) => {
    setSelectedMonth(month);

    const maxDay = getDaysInMonth(selectedYear, month);
    if (Number(selectedDay) > maxDay) {
      setSelectedDay(String(maxDay).padStart(2, "0"));
    }
  };

  const handleLogin = () => {
    const performLogin = async () => {
      setLoginError("");

      try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        });

        const payload = (await response.json()) as
          | { ok: true; username: string }
          | { error: string };

        if (!response.ok || !("ok" in payload)) {
          throw new Error("error" in payload ? payload.error : "登录失败");
        }

        await loadEntries();
        setIsLoggedIn(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "登录失败，请再试一次。";
        setLoginError(message);
      }
    };

    void performLogin();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setIsLoggedIn(false);
      setPassword("");
      setEntries(INITIAL_ENTRIES);
    }
  };

  const handleAddEntry = async () => {
    if (!newNote.trim()) {
      return;
    }

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "addEntry",
          entry: {
            date: selectedDate,
            title: `新的一页 · ${selectedDate}`,
            note: newNote.trim(),
            media: [] as MediaItem[],
            comments: [],
          },
        }),
      });

      const payload = (await response.json()) as
        | { entries: Entry[] }
        | { error: string };

      if (!response.ok || !("entries" in payload)) {
        throw new Error("error" in payload ? payload.error : "保存失败");
      }

      setEntries(payload.entries);
      setNewNote("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败，请再试一次。";
      setUploadMessage(message);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "deleteEntry",
          entryId,
        }),
      });

      const payload = (await response.json()) as
        | { entries: Entry[] }
        | { error: string };

      if (!response.ok || !("entries" in payload)) {
        throw new Error("error" in payload ? payload.error : "删除条目失败");
      }

      setEntries(payload.entries);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除条目失败，请再试一次。";
      setUploadMessage(message);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !activeEntry) {
      if (!activeEntry) {
        setUploadMessage("先给这一天新开一页，再写留言。");
      }
      return;
    }

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "addComment",
          entryId: activeEntry.id,
          comment: newComment.trim(),
        }),
      });

      const payload = (await response.json()) as
        | { entries: Entry[] }
        | { error: string };

      if (!response.ok || !("entries" in payload)) {
        throw new Error("error" in payload ? payload.error : "评论保存失败");
      }

      setEntries(payload.entries);
      setNewComment("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "评论保存失败，请再试一次。";
      setUploadMessage(message);
    }
  };

  const handleAddEntryComment = async (entryId: number) => {
    const comment = entryCommentDrafts[entryId]?.trim() ?? "";

    if (!comment) {
      return;
    }

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "addComment",
          entryId,
          comment,
        }),
      });

      const payload = (await response.json()) as
        | { entries: Entry[] }
        | { error: string };

      if (!response.ok || !("entries" in payload)) {
        throw new Error("error" in payload ? payload.error : "评论保存失败");
      }

      setEntries(payload.entries);
      setEntryCommentDrafts((current) => ({ ...current, [entryId]: "" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "评论保存失败，请再试一次。";
      setUploadMessage(message);
    }
  };

  const handleDeleteEntryComment = async (entryId: number, commentIndex: number) => {
    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "deleteComment",
          entryId,
          commentIndex,
        }),
      });

      const payload = (await response.json()) as
        | { entries: Entry[] }
        | { error: string };

      if (!response.ok || !("entries" in payload)) {
        throw new Error("error" in payload ? payload.error : "删除评论失败");
      }

      setEntries(payload.entries);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除评论失败，请再试一次。";
      setUploadMessage(message);
    }
  };

  const openMediaViewer = (item: MediaItem) => {
    if (!item.url) {
      return;
    }

    setActiveMedia({
      type: item.type,
      url: item.url,
      label: item.label,
    });
  };

  const closeMediaViewer = () => {
    setActiveMedia(null);
  };

  const uploadFileToCos = (uploadUrl: string, file: File) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
        setUploadMessage(`正在上传 ${file.name}，已完成 ${percent}%...`);
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }

        reject(new Error(xhr.responseText || `COS 上传失败，状态码 ${xhr.status}`));
      };

      xhr.onerror = () => {
        reject(new Error("COS 上传失败，可能是腾讯云 COS 还没有放行 PUT/OPTIONS 跨域请求。"));
      };

      xhr.send(file);
    });
  };

  const uploadFileThroughProxy = async (key: string, file: File) => {
    const response = await fetch(`/api/upload/proxy?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type || "application/octet-stream")}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    const payload = (await response.json()) as { ok?: true; error?: string };

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "COS 代理上传失败。");
    }
  };

  const handleUploadSelectedFiles = async () => {
    const files = [selectedImageFile, selectedVideoFile].filter(Boolean) as File[];

    if (files.length === 0) {
      setUploadMessage("先选择一张图片或一个视频，再上传到 COS。");
      return;
    }

    setUploading(true);
  setUploadProgress(0);
    setUploadMessage("正在上传到 COS，请稍等...");

    try {
      const uploadedMedia: Array<{ type: "image" | "video"; label: string; key: string }> = [];

      for (const [index, file] of files.entries()) {
        const response = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: selectedDate,
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
          }),
        });

        const payload = (await response.json()) as
          | { ok: true; key: string; fileName: string; uploadUrl: string; previewUrl: string }
          | { error: string };

        if (!response.ok || !("ok" in payload)) {
          if (response.status === 401) {
            setIsLoggedIn(false);
            setUploadMessage("请先重新登录，再继续上传。");
            return;
          }
          throw new Error("error" in payload ? payload.error : "上传失败");
        }

        setUploadProgress(Math.round((index / files.length) * 100));

        try {
          await uploadFileToCos(payload.uploadUrl, file);
        } catch {
          setUploadMessage(`浏览器直传失败，正在切换到代理上传 ${file.name}...`);
          await uploadFileThroughProxy(payload.key, file);
        }

        setUploadProgress(Math.round(((index + 1) / files.length) * 100));

        uploadedMedia.push({
          type: file.type.startsWith("video/") ? "video" : "image",
          label: payload.fileName,
          key: payload.key,
        });
      }

      const entryResponse = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "addEntry",
          entry: {
            date: selectedDate,
            title: `云端新页 · ${selectedDate}`,
            note: newNote.trim() || "今天上传了新的回忆。",
            media: uploadedMedia,
            comments: [],
          },
        }),
      });

      const entryPayload = (await entryResponse.json()) as
        | { entries: Entry[] }
        | { error: string };

      if (!entryResponse.ok || !("entries" in entryPayload)) {
        throw new Error("error" in entryPayload ? entryPayload.error : "保存失败");
      }

      setEntries(entryPayload.entries);
      setNewNote("");
      setSelectedImageFile(null);
      setSelectedVideoFile(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
      setUploadProgress(100);
      setUploadMessage("上传完成，内容已经保存到云端。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败，请再试一次。";
      setUploadMessage(message);
    } finally {
      setUploading(false);
    }
  };

  if (!sessionReady) {
    return (
      <main className="min-h-screen bg-[#f7f3ef] px-6 py-10 text-slate-900">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
          <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
            正在检查登录状态...
          </div>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#f7f3ef] px-6 py-10 text-slate-900">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
            <div className="mb-8 space-y-2 text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Private Access</p>
              <h1 className="text-3xl font-semibold text-slate-900">进入小窝</h1>
              <p className="text-sm leading-6 text-slate-500">
                这是我们两个人的私密空间，只有输入正确账号密码才能进入。
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-600">用户名</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                  placeholder="请输入用户名"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-600">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                  placeholder="请输入密码"
                />
              </div>

              {loginError ? (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{loginError}</p>
              ) : null}

              <button
                type="button"
                onClick={handleLogin}
                className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                登录
              </button>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              这是一个仅供我们两人使用的私密入口。
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,244,247,1),rgba(255,232,239,0.98)_30%,rgba(252,215,227,0.97)_64%,rgba(248,198,216,0.95)_100%)] text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:42px_42px] opacity-18 mix-blend-soft-light" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.36),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,223,233,0.44),transparent_32%)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-4 lg:flex-row lg:px-6">
        <aside className="w-full shrink-0 rounded-[2rem] border border-pink-100 bg-white/88 p-5 text-slate-700 shadow-[0_20px_80px_rgba(56,39,25,0.10)] backdrop-blur-xl lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-72 lg:overflow-y-auto">
          <div className="overflow-hidden rounded-[1.75rem] border border-pink-100 bg-white shadow-[0_16px_40px_rgba(56,39,25,0.08)]">
            <Image src={coverImage} alt="cover" className="h-44 w-full object-cover" />
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-pink-100 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(56,39,25,0.06)]">
            <p className="text-[11px] uppercase tracking-[0.34em] text-slate-400">Selected Day</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{selectedDate}</p>
            <p className="mt-1 text-xs text-slate-500">{selectedYear}-{selectedMonth} · 当日页数 {selectedDayEntries.length}</p>
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.38em] text-rose-700/80">I love you, every day</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">我爱你，每一天</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              把照片、视频和文字都放在这里，留住我们一起生活的每一天。
            </p>
          </div>

          <div className="mt-8 space-y-5 text-sm text-slate-700">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-500">按年</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateYear(2026)}
                  className={`rounded-2xl px-3 py-2 transition ${
                    selectedYear === 2026 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  2026
                </button>
                <button type="button" disabled className="rounded-2xl border border-dashed border-slate-200 px-3 py-2 text-slate-300">
                  2027
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-2xl border border-dashed border-slate-200 px-3 py-2 text-slate-300"
                >
                  更多年份
                </button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-500">按月</p>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month) => (
                  <button
                    key={month}
                    onClick={() => updateMonth(month)}
                    className={`rounded-2xl px-3 py-2 transition ${
                      selectedMonth === month ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">本月日历</p>
                <span className="rounded-full border border-pink-100 bg-white px-3 py-1 text-[11px] text-slate-500">
                  {selectedYear}-{selectedMonth}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.24em] text-slate-400">
                {WEEK_DAYS.map((weekDay) => (
                  <div key={weekDay} className="py-1">
                    {weekDay}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {calendarCells.map((cell, index) => {
                  const hasEntries = cell.isCurrentMonth && entriesByDay.has(cell.day);
                  const isSelected = cell.day === selectedDay;

                  return (
                    <button
                      key={`${cell.day || "blank"}-${index}`}
                      type="button"
                      disabled={!cell.isCurrentMonth}
                      onClick={() => {
                        if (cell.isCurrentMonth) {
                          setSelectedDay(cell.day);
                        }
                      }}
                      className={`flex h-12 flex-col items-center justify-center rounded-2xl border text-sm transition ${
                        !cell.isCurrentMonth
                          ? "border-transparent bg-transparent text-slate-200"
                          : isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : hasEntries
                              ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                              : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
                      }`}
                    >
                      {cell.day ? <span>{cell.day}</span> : <span className="opacity-0">00</span>}
                      {hasEntries ? <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-rose-200" /> : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>点有内容的小格，直接切到那一天。</span>
                <span>{entriesByDay.size} 天有内容</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-pink-100 bg-white text-sm text-slate-700 transition hover:bg-rose-50"
          >
            退出登录
          </button>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_80px_rgba(56,39,25,0.08)] backdrop-blur-xl lg:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Warm Nest</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  和宝宝的温暖小窝
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  这是我们的私密主页。这里可以按年、月、日去翻看每一天，也可以新开一页，把文字、视频、图片和评论都存下来。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
                {[
                  ["今日", selectedDate],
                  ["当日页数", `${selectedDayEntries.length} 页`],
                  ["本月", `${selectedYear}-${selectedMonth}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <section className="flex min-h-0 flex-col rounded-[2rem] border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_80px_rgba(56,39,25,0.08)] backdrop-blur-xl lg:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">每日新页</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">给今天新开一页</h3>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                  允许添加文字 / 照片 / 视频
                </div>
              </div>

              <div className="mt-5 space-y-4 rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-5 lg:p-6">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    setSelectedImageFile(event.target.files?.[0] ?? null);
                  }}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => {
                    setSelectedVideoFile(event.target.files?.[0] ?? null);
                  }}
                />
                <textarea
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                  rows={5}
                  placeholder="写下今天的故事、想说的话，或者记录一段很喜欢的瞬间。"
                  className="w-full resize-none rounded-[1.5rem] border border-slate-200 bg-white p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    {selectedImageFile ? `图片：${selectedImageFile.name}` : "选择图片"}
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-100 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                  >
                    {selectedVideoFile ? `视频：${selectedVideoFile.name}` : "选择视频"}
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadSelectedFiles}
                    disabled={uploading}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-amber-200 px-5 text-sm font-semibold text-slate-900 transition hover:bg-amber-100"
                  >
                    {uploading ? "上传中..." : "上传到 COS"}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddEntry}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    只保存文字页
                  </button>
                </div>

                {uploadMessage ? (
                  <div className="space-y-3 text-sm text-slate-600">
                    <p>{uploadMessage}</p>
                    {uploading ? (
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-rose-500 transition-all duration-300"
                          style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 min-h-0 flex-1 overflow-visible xl:overflow-hidden">
                <div className="space-y-4 xl:h-full xl:overflow-y-auto xl:pr-2">
                {selectedDayEntries.length > 0 ? (
                  selectedDayEntries.map((entry) => (
                    <article key={entry.id} className="rounded-[1.75rem] border border-pink-100 bg-white p-6 lg:p-7">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{entry.date}</p>
                          <h4 className="mt-2 text-xl font-semibold text-slate-900">{entry.title}</h4>
                          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{entry.note}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-pink-100 bg-white px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                        >
                          删除这一条
                        </button>
                      </div>

                      <div className="mt-5 flex justify-start">
                        <div className="grid w-full gap-2 sm:max-w-[32rem] lg:ml-auto lg:max-w-[24rem]">
                          {entry.media.map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => openMediaViewer(item)}
                              className="overflow-hidden rounded-2xl border border-pink-100 bg-slate-50 text-left text-sm text-slate-700 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(56,39,25,0.08)]"
                            >
                              {item.url && item.type === "image" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.url}
                                  alt={item.label}
                                  className="h-56 w-full object-cover"
                                />
                              ) : null}
                              {item.url && item.type === "video" ? (
                                <video
                                  src={item.url}
                                  preload="metadata"
                                  className="h-56 w-full object-cover bg-black"
                                />
                              ) : null}
                              <div className="space-y-2 p-4">
                                <div>
                                  {item.type === "video" ? "视频" : "图片"} · {item.label}
                                </div>
                                <div className="text-xs text-slate-500">点击放大播放</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 rounded-[1.5rem] border border-pink-100 bg-rose-50 p-5">
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">这一条的评论</p>
                        <div className="mt-3 space-y-2">
                          {entry.comments.length > 0 ? (
                            entry.comments.map((comment, index) => (
                              <div
                                key={`${entry.id}-${index}`}
                                className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                              >
                                <div className="min-w-0 flex-1">{comment}</div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEntryComment(entry.id, index)}
                                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-500 transition hover:bg-slate-50"
                                >
                                  删除
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
                              这里还没有评论，留一句悄悄话吧。
                            </div>
                          )}
                        </div>

                        <textarea
                          value={entryCommentDrafts[entry.id] ?? ""}
                          onChange={(event) =>
                            setEntryCommentDrafts((current) => ({ ...current, [entry.id]: event.target.value }))
                          }
                          rows={3}
                          placeholder="给这一条单独留一句话。"
                          className="mt-4 w-full resize-none rounded-[1.35rem] border border-pink-100 bg-white p-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                        />

                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => handleAddEntryComment(entry.id)}
                            className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                          >
                            添加到这一条
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_80px_rgba(56,39,25,0.08)] backdrop-blur-xl">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.14),transparent_45%)]" />
                    <div className="relative flex min-h-[340px] flex-col items-center justify-center text-center">
                      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-3xl text-slate-500">
                        ·
                      </div>
                      <p className="text-xs uppercase tracking-[0.38em] text-slate-400">空白页</p>
                      <h4 className="mt-4 text-3xl font-semibold text-slate-900">{selectedDate}</h4>
                      <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                        这一天还没有内容。你可以写一段文字、上传一张照片，或者放一个视频，让它变成属于我们的日记页。
                      </p>
                      <div className="mt-6 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
                        现在可以在上面新开一页
                      </div>
                    </div>
                  </article>
                )}
                </div>
              </div>
            </section>

            <section className="flex min-h-0 flex-col gap-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_80px_rgba(56,39,25,0.08)] backdrop-blur-xl lg:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Today View</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">这一天的留言</h3>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                    整天共 {selectedDayEntries.length} 页
                  </div>
                </div>

                <div className="mt-5 max-h-[22rem] overflow-y-auto pr-1">
                  <div className="space-y-2">
                    {activeEntry?.comments.length ? (
                      activeEntry.comments.map((comment, index) => (
                        <div
                          key={`${activeEntry.id}-day-${index}`}
                          className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        >
                          <div className="min-w-0 flex-1">{comment}</div>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntryComment(activeEntry.id, index)}
                            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-500 transition hover:bg-slate-50"
                          >
                            删除
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        这一整天还没有留言，可以先写一条整体感受。
                      </div>
                    )}
                  </div>
                </div>

                <textarea
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  rows={4}
                  placeholder={activeEntry ? "写给今天的一句整体留言。" : "先在今天新开一页，再来写留言。"}
                  disabled={!activeEntry}
                  className="mt-5 w-full resize-none rounded-[1.5rem] border border-slate-200 bg-white p-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!activeEntry}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activeEntry ? "发送留言" : "先有内容再留言"}
                </button>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_80px_rgba(56,39,25,0.08)] backdrop-blur-xl lg:p-7">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Access</p>
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  <p>账号：{ACCOUNT}</p>
                  <p>登录：后端会话保护</p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>

      {activeMedia ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={activeMedia.label}
          onClick={closeMediaViewer}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/15 bg-white shadow-[0_30px_120px_rgba(0,0,0,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Media Viewer</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{activeMedia.label}</h3>
              </div>

              <button
                type="button"
                onClick={closeMediaViewer}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                关闭
              </button>
            </div>

            <div className="bg-black">
              {activeMedia.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeMedia.url}
                  alt={activeMedia.label}
                  className="max-h-[82vh] w-full object-contain"
                />
              ) : (
                <video
                  src={activeMedia.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[82vh] w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}