import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Papa from "papaparse";
import {
  BarChart3, CalendarDays, Check, ChevronDown, Circle, Download, GripVertical, Languages,
  ListTodo, Moon, Pencil, Plus, RotateCcw, Sun, Tag, Trash2, Upload, X,
} from "lucide-react";

type Locale = "zh" | "ja" | "en";
type Theme = "light" | "dark";
type Filter = "all" | "active" | "completed";
type View = "list" | "calendar" | "stats";
type Repeat = "none" | "daily" | "weekly" | "monthly";
type Subtask = { id: string; title: string; completed: boolean };
type Task = {
  id: string; title: string; completed: boolean; createdAt: number; subtasks: Subtask[];
  tags: string[]; project: string; dueDate: string; repeat: Repeat; repeatSpawned?: boolean;
};

const TASKS_KEY = "todo-apple-tasks-v2";
const OLD_TASKS_KEY = "todo-apple-tasks";
const THEME_KEY = "todo-apple-theme";
const LOCALE_KEY = "todo-apple-locale";

const copy = {
  zh: { app: "Focus Glass", today: "任务中心", add: "添加任务", placeholder: "今天想完成什么？", all: "全部", active: "进行中", completed: "已完成", list: "清单", calendar: "日历", stats: "统计", empty: "这里很安静", emptyHint: "添加一个任务，让今天开始流动。", remaining: "项待完成", clear: "清除已完成", project: "项目", tags: "标签，用逗号分隔", due: "截止日期", repeat: "重复", none: "不重复", daily: "每天", weekly: "每周", monthly: "每月", subtask: "添加子任务", completeRate: "完成率", done: "已完成", total: "总任务", import: "导入 CSV", export: "导出 CSV", auto: "自动保存在此设备", edit: "编辑任务", remove: "删除任务", theme: "切换深色模式", noDue: "未设置日期" },
  ja: { app: "Focus Glass", today: "タスクセンター", add: "タスクを追加", placeholder: "今日は何を終わらせますか？", all: "すべて", active: "進行中", completed: "完了", list: "リスト", calendar: "カレンダー", stats: "統計", empty: "静かな一日です", emptyHint: "タスクを追加して始めましょう。", remaining: "件 未完了", clear: "完了を削除", project: "プロジェクト", tags: "タグ（カンマ区切り）", due: "期限", repeat: "繰り返し", none: "なし", daily: "毎日", weekly: "毎週", monthly: "毎月", subtask: "サブタスクを追加", completeRate: "完了率", done: "完了", total: "全タスク", import: "CSV 読込", export: "CSV 書出", auto: "この端末に自動保存", edit: "編集", remove: "削除", theme: "ダークモード", noDue: "日付なし" },
  en: { app: "Focus Glass", today: "Task Center", add: "Add task", placeholder: "What would you like to finish?", all: "All", active: "Active", completed: "Completed", list: "List", calendar: "Calendar", stats: "Insights", empty: "Nothing here yet", emptyHint: "Add a task and let the day begin.", remaining: "left", clear: "Clear completed", project: "Project", tags: "Tags, comma separated", due: "Due date", repeat: "Repeat", none: "No repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly", subtask: "Add subtask", completeRate: "Completion", done: "Completed", total: "Total tasks", import: "Import CSV", export: "Export CSV", auto: "Saved automatically on this device", edit: "Edit task", remove: "Delete task", theme: "Toggle dark mode", noDue: "No date" },
};

const id = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const normalize = (task: Partial<Task>): Task => ({
  id: task.id || id(), title: task.title || "", completed: Boolean(task.completed), createdAt: task.createdAt || Date.now(),
  subtasks: Array.isArray(task.subtasks) ? task.subtasks : [], tags: Array.isArray(task.tags) ? task.tags : [],
  project: task.project || "Personal", dueDate: task.dueDate || "", repeat: task.repeat || "none", repeatSpawned: task.repeatSpawned,
});
const readTasks = () => { try { const raw = localStorage.getItem(TASKS_KEY) || localStorage.getItem(OLD_TASKS_KEY); return raw ? JSON.parse(raw).map(normalize) : []; } catch { return []; } };
const nextDate = (date: string, repeat: Repeat) => { const value = date ? new Date(`${date}T12:00:00`) : new Date(); if (repeat === "daily") value.setDate(value.getDate() + 1); if (repeat === "weekly") value.setDate(value.getDate() + 7); if (repeat === "monthly") value.setMonth(value.getMonth() + 1); return value.toISOString().slice(0, 10); };

function SortableTask({ task, locale, onToggle, onDelete, onUpdate }: { task: Task; locale: Locale; onToggle: () => void; onDelete: () => void; onUpdate: (task: Task) => void }) {
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [subtask, setSubtask] = useState("");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const saveEdit = () => { const title = editValue.trim(); if (title) onUpdate({ ...task, title }); setEditing(false); };
  const addSubtask = (event: FormEvent) => { event.preventDefault(); if (!subtask.trim()) return; onUpdate({ ...task, subtasks: [...task.subtasks, { id: id(), title: subtask.trim(), completed: false }] }); setSubtask(""); };
  return (
    <article ref={setNodeRef} style={style} className={`glass task-card ${isDragging ? "is-dragging" : ""}`}>
      <div className="task-row">
        <button className="drag-handle" aria-label="Drag" {...attributes} {...listeners}><GripVertical size={18} /></button>
        <button className={`check ${task.completed ? "is-checked" : ""}`} onClick={onToggle} aria-label={task.completed ? t.completed : t.active}><Check size={15} /></button>
        <div className="task-main" onClick={() => setOpen(!open)}>
          {editing ? <input autoFocus className="inline-edit" value={editValue} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") saveEdit(); }} /> : <h3 className={task.completed ? "completed-title" : ""}>{task.title}</h3>}
          <div className="task-meta">
            {task.project && <span className="project-pill">{task.project}</span>}
            {task.dueDate && <span><CalendarDays size={13} />{task.dueDate}</span>}
            {task.repeat !== "none" && <span><RotateCcw size={13} />{t[task.repeat]}</span>}
            {task.tags.map((tag) => <span className="tag-pill" key={tag}>#{tag}</span>)}
          </div>
        </div>
        <button className="icon-button" onClick={() => setEditing(true)} aria-label={t.edit}><Pencil size={16} /></button>
        <button className="icon-button danger" onClick={onDelete} aria-label={t.remove}><Trash2 size={16} /></button>
        <button className={`icon-button disclosure ${open ? "open" : ""}`} onClick={() => setOpen(!open)}><ChevronDown size={17} /></button>
      </div>
      {open && <div className="task-details">
        <div className="subtasks">
          {task.subtasks.map((sub) => <div className="subtask" key={sub.id}>
            <button className={`mini-check ${sub.completed ? "is-checked" : ""}`} onClick={() => onUpdate({ ...task, subtasks: task.subtasks.map((item) => item.id === sub.id ? { ...item, completed: !item.completed } : item) })}><Check size={11} /></button>
            <span className={sub.completed ? "completed-title" : ""}>{sub.title}</span>
            <button onClick={() => onUpdate({ ...task, subtasks: task.subtasks.filter((item) => item.id !== sub.id) })}><X size={14} /></button>
          </div>)}
          <form className="subtask-form" onSubmit={addSubtask}><Plus size={15} /><input value={subtask} onChange={(e) => setSubtask(e.target.value)} placeholder={t.subtask} /></form>
        </div>
      </div>}
    </article>
  );
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(readTasks);
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem(LOCALE_KEY) as Locale) || "zh");
  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState(""); const [project, setProject] = useState("Personal"); const [tags, setTags] = useState("");
  const [dueDate, setDueDate] = useState(""); const [repeat, setRepeat] = useState<Repeat>("none"); const [advanced, setAdvanced] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const t = copy[locale];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  useEffect(() => localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)), [tasks]);
  useEffect(() => { localStorage.setItem(THEME_KEY, theme); document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);
  useEffect(() => localStorage.setItem(LOCALE_KEY, locale), [locale]);
  const visible = useMemo(() => tasks.filter((task) => filter === "all" || (filter === "active" ? !task.completed : task.completed)), [tasks, filter]);
  const completed = tasks.filter((task) => task.completed).length;
  const rate = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const projects = [...new Set(tasks.map((task) => task.project).filter(Boolean))];
  const addTask = (event: FormEvent) => { event.preventDefault(); if (!draft.trim()) return; setTasks([{ id: id(), title: draft.trim(), completed: false, createdAt: Date.now(), subtasks: [], tags: tags.split(",").map((x) => x.trim()).filter(Boolean), project: project.trim() || "Personal", dueDate, repeat }, ...tasks]); setDraft(""); setTags(""); setDueDate(""); setRepeat("none"); };
  const toggleTask = (task: Task) => { const completing = !task.completed; let next = tasks.map((item) => item.id === task.id ? { ...item, completed: completing, repeatSpawned: completing && item.repeat !== "none" ? true : item.repeatSpawned } : item); if (completing && task.repeat !== "none" && !task.repeatSpawned) next = [{ ...task, id: id(), completed: false, createdAt: Date.now(), dueDate: nextDate(task.dueDate, task.repeat), repeatSpawned: false, subtasks: task.subtasks.map((sub) => ({ ...sub, id: id(), completed: false })) }, ...next]; setTasks(next); };
  const dragEnd = ({ active, over }: DragEndEvent) => { if (!over || active.id === over.id) return; const oldIndex = tasks.findIndex((task) => task.id === active.id); const newIndex = tasks.findIndex((task) => task.id === over.id); setTasks(arrayMove(tasks, oldIndex, newIndex)); };
  const exportCsv = () => { const csv = Papa.unparse(tasks.map((task) => ({ title: task.title, completed: task.completed, project: task.project, tags: task.tags.join("|"), dueDate: task.dueDate, repeat: task.repeat, subtasks: task.subtasks.map((sub) => `${sub.completed ? "1" : "0"}:${sub.title}`).join("|") }))); const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "focus-glass-tasks.csv"; link.click(); URL.revokeObjectURL(url); };
  const importCsv = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: ({ data }) => setTasks((current) => [...data.map((row) => normalize({ title: row.title, completed: row.completed === "true", project: row.project, tags: row.tags?.split("|").filter(Boolean), dueDate: row.dueDate, repeat: (row.repeat as Repeat) || "none", subtasks: row.subtasks?.split("|").filter(Boolean).map((value) => { const [done, ...title] = value.split(":"); return { id: id(), completed: done === "1", title: title.join(":") }; }) })), ...current]) }); event.target.value = ""; };
  const calendarDays = useMemo(() => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth(), 1); const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); return [...Array(first.getDay()).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]; }, []);

  return <div className="app-shell">
    <main className="app-container">
      <header className="topbar glass">
        <div className="brand"><div className="brand-icon"><Check size={22} strokeWidth={3} /></div><div><span>{t.app}</span><h1>{t.today}</h1></div></div>
        <nav className="view-switch">{(["list", "calendar", "stats"] as View[]).map((item) => <button className={view === item ? "active" : ""} onClick={() => setView(item)} key={item}>{item === "list" ? <ListTodo /> : item === "calendar" ? <CalendarDays /> : <BarChart3 />}<span>{t[item]}</span></button>)}</nav>
        <div className="header-actions">
          <label className="locale"><Languages size={17} /><select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}><option value="zh">中文</option><option value="ja">日本語</option><option value="en">English</option></select></label>
          <button className="glass-button" aria-label={t.theme} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon /> : <Sun />}</button>
        </div>
      </header>

      <section className="composer glass">
        <form onSubmit={addTask}>
          <div className="composer-main"><input aria-label={t.add} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.placeholder} /><button type="button" className={`options-button ${advanced ? "active" : ""}`} onClick={() => setAdvanced(!advanced)}><Tag size={18} /></button><button className="add-button" aria-label={t.add}><Plus size={22} /></button></div>
          {advanced && <div className="advanced-grid">
            <label><span>{t.project}</span><input list="projects" value={project} onChange={(e) => setProject(e.target.value)} /><datalist id="projects">{projects.map((item) => <option key={item} value={item} />)}</datalist></label>
            <label><span>{t.tags}</span><input value={tags} onChange={(e) => setTags(e.target.value)} /></label>
            <label><span>{t.due}</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
            <label><span>{t.repeat}</span><select value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>{(["none", "daily", "weekly", "monthly"] as Repeat[]).map((item) => <option key={item} value={item}>{t[item]}</option>)}</select></label>
          </div>}
        </form>
      </section>

      {view === "list" && <>
        <div className="toolbar"><div className="segmented">{(["all", "active", "completed"] as Filter[]).map((item) => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{t[item]}</button>)}</div><div className="toolbar-actions"><span>{tasks.length - completed} {t.remaining}</span><button onClick={() => fileRef.current?.click()}><Upload />{t.import}</button><button onClick={exportCsv}><Download />{t.export}</button>{completed > 0 && <button onClick={() => setTasks(tasks.filter((task) => !task.completed))}>{t.clear}</button>}<input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={importCsv} /></div></div>
        <DndContext sensors={sensors} onDragEnd={dragEnd}><SortableContext items={visible.map((task) => task.id)} strategy={verticalListSortingStrategy}><div className="task-list">{visible.map((task) => <SortableTask key={task.id} task={task} locale={locale} onToggle={() => toggleTask(task)} onDelete={() => setTasks(tasks.filter((item) => item.id !== task.id))} onUpdate={(updated) => setTasks(tasks.map((item) => item.id === updated.id ? updated : item))} />)}</div></SortableContext></DndContext>
        {!visible.length && <div className="empty glass"><div className="empty-icon"><ListTodo /></div><h2>{t.empty}</h2><p>{t.emptyHint}</p></div>}
      </>}

      {view === "calendar" && <section className="calendar-view glass"><div className="calendar-heading"><CalendarDays /><h2>{new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale === "ja" ? "ja-JP" : "en-US", { month: "long", year: "numeric" }).format(new Date())}</h2></div><div className="calendar-grid">{calendarDays.map((day, index) => <div className={`calendar-day ${day ? "" : "blank"}`} key={index}>{day && <><strong>{day}</strong><div>{tasks.filter((task) => task.dueDate && new Date(`${task.dueDate}T12:00:00`).getMonth() === new Date().getMonth() && Number(task.dueDate.slice(-2)) === day).map((task) => <span className={task.completed ? "done" : ""} key={task.id}>{task.title}</span>)}</div></>}</div>)}</div></section>}

      {view === "stats" && <section className="stats-grid"><article className="stat-card glass hero-stat"><div className="progress-ring" style={{ "--progress": `${rate * 3.6}deg` } as React.CSSProperties}><div>{rate}%</div></div><div><span>{t.completeRate}</span><h2>{completed} / {tasks.length}</h2></div></article><article className="stat-card glass"><Check /><span>{t.done}</span><strong>{completed}</strong></article><article className="stat-card glass"><ListTodo /><span>{t.total}</span><strong>{tasks.length}</strong></article><article className="stat-card glass project-stat"><Tag /><span>{t.project}</span><div>{projects.map((item) => <p key={item}><span>{item}</span><strong>{tasks.filter((task) => task.project === item).length}</strong></p>)}</div></article></section>}

      <footer><Circle size={7} fill="currentColor" />{t.auto}</footer>
    </main>
  </div>;
}

export default App;
