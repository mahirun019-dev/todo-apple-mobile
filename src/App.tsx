import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { Check, Circle, ClipboardList, Moon, Pencil, Plus, Sun, Trash2 } from "lucide-react";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
};

type Filter = "all" | "active" | "completed";
type Theme = "light" | "dark";

const TASKS_KEY = "todo-apple-tasks";
const THEME_KEY = "todo-apple-theme";

const readTasks = (): Task[] => {
  try {
    const saved = localStorage.getItem(TASKS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const readTheme = (): Theme => {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "dark" ? "dark" : "light";
};

function App() {
  const [tasks, setTasks] = useState<Task[]>(readTasks);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)), [tasks]);
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const visibleTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((task) => !task.completed);
    if (filter === "completed") return tasks.filter((task) => task.completed);
    return tasks;
  }, [filter, tasks]);

  const activeCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.length - activeCount;

  function addTask(event: FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setTasks((current) => [{ id: crypto.randomUUID(), title, completed: false, createdAt: Date.now() }, ...current]);
    setDraft("");
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  }

  function removeTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function beginEditing(task: Task) {
    setEditingId(task.id);
    setEditingValue(task.title);
  }

  function saveEdit(id: string) {
    const title = editingValue.trim();
    if (!title) return removeTask(id);
    setTasks((current) => current.map((task) => task.id === id ? { ...task, title } : task));
    setEditingId(null);
  }

  function editKeyDown(event: KeyboardEvent<HTMLInputElement>, id: string) {
    if (event.key === "Enter") saveEdit(id);
    if (event.key === "Escape") setEditingId(null);
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#18253a] transition-colors duration-300 dark:bg-[#111722] dark:text-[#eef4ff]">
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-8 sm:py-12">
        <header className="mb-8 flex items-center justify-between sm:mb-12">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#1473e6] text-white shadow-lg shadow-blue-500/25">
              <Check size={23} strokeWidth={3} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400">PERSONAL LIST</p>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">今日待办</h1>
            </div>
          </div>
          <button
            aria-label="切换深色模式"
            className="grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#1a2230] dark:text-amber-200"
            onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
          </button>
        </header>

        <section className="rounded-[28px] border border-white/80 bg-white p-4 shadow-apple transition-colors dark:border-white/10 dark:bg-[#182131] dark:shadow-apple-dark sm:p-6">
          <form className="flex gap-3" onSubmit={addTask}>
            <input
              aria-label="新增任务"
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-[#111722] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-[#111722] dark:focus:ring-blue-500/15"
              placeholder="添加一件想完成的事"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="grid size-[52px] shrink-0 place-items-center rounded-2xl bg-[#1473e6] text-white transition hover:-translate-y-0.5 hover:bg-[#0e66cf] active:translate-y-0" type="submit" aria-label="添加任务">
              <Plus size={23} />
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/5">
              {(["all", "active", "completed"] as Filter[]).map((item) => (
                <button
                  key={item}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${filter === item ? "bg-white text-[#1473e6] shadow-sm dark:bg-[#29364a] dark:text-blue-200" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"}`}
                  onClick={() => setFilter(item)}
                >
                  {{ all: "全部", active: "进行中", completed: "已完成" }[item]}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400 sm:justify-end">
              <span>{activeCount} 项待完成</span>
              {completedCount > 0 && (
                <button className="font-semibold text-slate-600 transition hover:text-[#1473e6] dark:text-slate-300 dark:hover:text-blue-300" onClick={() => setTasks((current) => current.filter((task) => !task.completed))}>
                  清除已完成
                </button>
              )}
            </div>
          </div>

          <div className="mt-2">
            {visibleTasks.length === 0 ? (
              <div className="grid min-h-64 place-items-center px-4 text-center animate-rise">
                <div>
                  <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-blue-50 text-[#1473e6] dark:bg-blue-400/10 dark:text-blue-300"><ClipboardList size={26} /></div>
                  <h2 className="font-bold">{tasks.length === 0 ? "今天从一件小事开始" : "这里已经清空了"}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">在上方写下任务，清单会自动保存。</p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/10">
                {visibleTasks.map((task) => (
                  <li className="group flex items-center gap-3 py-4 animate-rise" key={task.id}>
                    <button
                      aria-label={task.completed ? "标记为未完成" : "标记为完成"}
                      className={`grid size-6 shrink-0 place-items-center rounded-full border transition ${task.completed ? "border-[#1473e6] bg-[#1473e6] text-white" : "border-slate-300 text-transparent hover:border-[#1473e6] dark:border-slate-500"}`}
                      onClick={() => toggleTask(task.id)}
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                    {editingId === task.id ? (
                      <input
                        autoFocus
                        className="min-w-0 flex-1 rounded-lg bg-slate-100 px-2 py-1 outline-none ring-2 ring-blue-300 dark:bg-white/10"
                        value={editingValue}
                        onChange={(event) => setEditingValue(event.target.value)}
                        onBlur={() => saveEdit(task.id)}
                        onKeyDown={(event) => editKeyDown(event, task.id)}
                      />
                    ) : (
                      <button className={`min-w-0 flex-1 truncate text-left text-base font-medium transition ${task.completed ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-800 dark:text-slate-100"}`} onClick={() => toggleTask(task.id)}>
                        {task.title}
                      </button>
                    )}
                    <div className="flex items-center opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      <button className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#1473e6] dark:hover:bg-white/10" onClick={() => beginEditing(task)} aria-label="编辑任务"><Pencil size={16} /></button>
                      <button className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-400/10" onClick={() => removeTask(task.id)} aria-label="删除任务"><Trash2 size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <footer className="mt-auto flex items-center justify-center gap-2 pt-8 text-sm text-slate-400 dark:text-slate-500">
          <Circle size={8} fill="currentColor" /> 自动保存在此设备
        </footer>
      </main>
    </div>
  );
}

export default App;
