import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Papa from "papaparse";
import {
  BarChart3, CalendarDays, Check, ChevronDown, ChevronRight, Circle, Download, GripVertical, Languages,
  ListTodo, Monitor, Moon, Pencil, Plus, RotateCcw, Settings, Sun, Tag, Trash2, Upload, X,
} from "lucide-react";

type Locale = "zh" | "ja" | "en";
type Theme = "light" | "dark" | "system";
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
const ICON_KEY = "todo-apple-custom-icon";

const copy = {
  zh: { app: "Focus Glass", today: "任务中心", add: "添加任务", first: "添加第一个任务", settings: "设置", language: "语言", appearance: "外观", light: "浅色", dark: "深色", system: "跟随系统", icon: "自定义 App 图标", selected: "已选择", placeholder: "今天想完成什么？", all: "全部", active: "未完成", completed: "已完成", list: "清单", calendar: "日历", stats: "统计", empty: "还没有任务", emptyHint: "从一件小事开始安排今天。", remaining: "项待完成", clear: "清除已完成", project: "项目", tags: "标签，用逗号分隔", due: "截止日期", repeat: "重复", none: "不重复", daily: "每天", weekly: "每周", monthly: "每月", subtask: "添加子任务", completeRate: "完成率", done: "已完成", total: "总任务", import: "导入 CSV", export: "导出 CSV", auto: "自动保存至此设备", edit: "编辑任务", remove: "删除任务", theme: "深色模式", noDue: "未设置日期" },
  ja: { app: "Focus Glass", today: "タスクセンター", add: "タスクを追加", first: "最初のタスクを追加", settings: "設定", language: "言語", appearance: "表示", light: "ライト", dark: "ダーク", system: "システム", icon: "Appアイコン", selected: "選択中", placeholder: "今日は何を終わらせますか？", all: "すべて", active: "未完了", completed: "完了", list: "リスト", calendar: "カレンダー", stats: "統計", empty: "タスクはありません", emptyHint: "小さなことから今日を始めましょう。", remaining: "件 未完了", clear: "完了を削除", project: "プロジェクト", tags: "タグ（カンマ区切り）", due: "期限", repeat: "繰り返し", none: "なし", daily: "毎日", weekly: "毎週", monthly: "毎月", subtask: "サブタスクを追加", completeRate: "完了率", done: "完了", total: "全タスク", import: "CSV 読込", export: "CSV 書出", auto: "この端末に自動保存", edit: "編集", remove: "削除", theme: "ダークモード", noDue: "日付なし" },
  en: { app: "Focus Glass", today: "Task Center", add: "Add task", first: "Add your first task", settings: "Settings", language: "Language", appearance: "Appearance", light: "Light", dark: "Dark", system: "System", icon: "Custom app icon", selected: "Selected", placeholder: "What would you like to finish?", all: "All", active: "Incomplete", completed: "Completed", list: "List", calendar: "Calendar", stats: "Insights", empty: "No tasks yet", emptyHint: "Start today with one small thing.", remaining: "left", clear: "Clear completed", project: "Project", tags: "Tags, comma separated", due: "Due date", repeat: "Repeat", none: "No repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly", subtask: "Add subtask", completeRate: "Completion", done: "Completed", total: "Total tasks", import: "Import CSV", export: "Export CSV", auto: "Saved automatically on this device", edit: "Edit task", remove: "Delete task", theme: "Dark mode", noDue: "No date" },
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
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) || "system");
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem(LOCALE_KEY) as Locale) || "zh");
  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState(""); const [project, setProject] = useState("Personal"); const [tags, setTags] = useState("");
  const [dueDate, setDueDate] = useState(""); const [repeat, setRepeat] = useState<Repeat>("none"); const [advanced, setAdvanced] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsClosing, setSettingsClosing] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [customIcon, setCustomIcon] = useState(() => localStorage.getItem(ICON_KEY) || "");
  const fileRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<HTMLInputElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const t = copy[locale];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  useEffect(() => localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)), [tasks]);
  useEffect(() => { const media = matchMedia("(prefers-color-scheme: dark)"); const apply = () => document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && media.matches)); apply(); localStorage.setItem(THEME_KEY, theme); media.addEventListener("change", apply); return () => media.removeEventListener("change", apply); }, [theme]);
  useEffect(() => localStorage.setItem(LOCALE_KEY, locale), [locale]);
  useEffect(() => { if (!settingsOpen) return; settingsPanelRef.current?.focus(); const close = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") closeSettings(); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [settingsOpen]);
  const visible = useMemo(() => tasks.filter((task) => filter === "all" || (filter === "active" ? !task.completed : task.completed)), [tasks, filter]);
  const completed = tasks.filter((task) => task.completed).length;
  const rate = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const projects = [...new Set(tasks.map((task) => task.project).filter(Boolean))];
  const addTask = (event: FormEvent) => { event.preventDefault(); if (!draft.trim()) return; setTasks([{ id: id(), title: draft.trim(), completed: false, createdAt: Date.now(), subtasks: [], tags: tags.split(",").map((x) => x.trim()).filter(Boolean), project: project.trim() || "Personal", dueDate, repeat }, ...tasks]); setDraft(""); setTags(""); setDueDate(""); setRepeat("none"); };
  const toggleTask = (task: Task) => { const completing = !task.completed; let next = tasks.map((item) => item.id === task.id ? { ...item, completed: completing, repeatSpawned: completing && item.repeat !== "none" ? true : item.repeatSpawned } : item); if (completing && task.repeat !== "none" && !task.repeatSpawned) next = [{ ...task, id: id(), completed: false, createdAt: Date.now(), dueDate: nextDate(task.dueDate, task.repeat), repeatSpawned: false, subtasks: task.subtasks.map((sub) => ({ ...sub, id: id(), completed: false })) }, ...next]; setTasks(next); };
  const dragEnd = ({ active, over }: DragEndEvent) => { if (!over || active.id === over.id) return; const oldIndex = tasks.findIndex((task) => task.id === active.id); const newIndex = tasks.findIndex((task) => task.id === over.id); setTasks(arrayMove(tasks, oldIndex, newIndex)); };
  const exportCsv = () => { const csv = Papa.unparse(tasks.map((task) => ({ title: task.title, completed: task.completed, project: task.project, tags: task.tags.join("|"), dueDate: task.dueDate, repeat: task.repeat, subtasks: task.subtasks.map((sub) => `${sub.completed ? "1" : "0"}:${sub.title}`).join("|") }))); const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "focus-glass-tasks.csv"; link.click(); URL.revokeObjectURL(url); };
  const importCsv = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: ({ data }) => setTasks((current) => [...data.map((row) => normalize({ title: row.title, completed: row.completed === "true", project: row.project, tags: row.tags?.split("|").filter(Boolean), dueDate: row.dueDate, repeat: (row.repeat as Repeat) || "none", subtasks: row.subtasks?.split("|").filter(Boolean).map((value) => { const [done, ...title] = value.split(":"); return { id: id(), completed: done === "1", title: title.join(":") }; }) })), ...current]) }); event.target.value = ""; };
  const updateIcon = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file || !file.type.startsWith("image/")) return; const reader = new FileReader(); reader.onload = () => { const value = String(reader.result || ""); setCustomIcon(value); localStorage.setItem(ICON_KEY, value); }; reader.readAsDataURL(file); event.target.value = ""; };
  function closeSettings() { setSettingsClosing(true); setTimeout(() => { setSettingsOpen(false); setSettingsClosing(false); setLanguageOpen(false); settingsButtonRef.current?.focus(); }, 160); }
  const visibleCount = visible.length;
  const calendarDays = useMemo(() => { const now = new Date(); const first = new Date(now.getFullYear(), now.getMonth(), 1); const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); return [...Array(first.getDay()).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]; }, []);

  return <div className="app-shell">
    <main className="app-container">
      <header className="topbar glass">
        <div className="brand"><div className="brand-icon">{customIcon ? <img src={customIcon} alt="" /> : <Check size={22} strokeWidth={3} />}</div><div><span>{t.app}</span><h1>{t.today}</h1></div></div>
        <div className="header-actions"><button ref={settingsButtonRef} className="glass-button" aria-label={t.settings} aria-haspopup="dialog" aria-expanded={settingsOpen} onClick={() => settingsOpen ? closeSettings() : (setSettingsClosing(false), setSettingsOpen(true))}><Settings /></button></div>
      </header>
      {settingsOpen && <><button className={`settings-backdrop ${settingsClosing ? "closing" : ""}`} aria-label="Close settings" onClick={closeSettings} /><div ref={settingsPanelRef} className={`settings-menu ${settingsClosing ? "closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="settings-title" tabIndex={-1} style={{ "--anchor-right": `${Math.max(10, innerWidth - (settingsButtonRef.current?.getBoundingClientRect().right || innerWidth - 10))}px` } as CSSProperties}>
        <div className="settings-title"><strong id="settings-title">{t.settings}</strong><button aria-label="Close settings" onClick={closeSettings}><X /></button></div>
        <button className="settings-row" aria-expanded={languageOpen} onClick={() => setLanguageOpen(!languageOpen)}><span><Languages />{t.language}</span><span>{locale === "zh" ? "中文" : locale === "ja" ? "日本語" : "English"}<ChevronRight className={languageOpen ? "rotated" : ""} /></span></button>
        {languageOpen && <div className="language-list" role="listbox" aria-label={t.language}>{([['zh','中文'],['ja','日本語'],['en','English']] as [Locale,string][]).map(([value,label]) => <button role="option" aria-selected={locale === value} key={value} onClick={() => { setLocale(value); setLanguageOpen(false); }}><span>{label}</span>{locale === value && <><Check /><span className="sr-only">{t.selected}</span></>}</button>)}</div>}
        <div className="settings-group"><span>{t.appearance}</span><div className="theme-options">{(["light", "dark", "system"] as Theme[]).map((item) => <button className={theme === item ? "active" : ""} aria-pressed={theme === item} onClick={() => setTheme(item)} key={item}>{item === "light" ? <Sun /> : item === "dark" ? <Moon /> : <Monitor />}<span>{t[item]}</span></button>)}</div></div>
        <button className="settings-row" onClick={() => iconRef.current?.click()}><span><div className="mini-app-icon">{customIcon ? <img src={customIcon} alt="" /> : <Check />}</div>{t.icon}</span><ChevronRight /></button>
        <button className="settings-row" onClick={() => fileRef.current?.click()}><span><Upload />{t.import}</span></button>
        <button className="settings-row" onClick={exportCsv}><span><Download />{t.export}</span></button>
        <div className="settings-note"><Circle size={6} fill="currentColor" />{t.auto}</div>
        <input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={importCsv} /><input ref={iconRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={updateIcon} />
      </div></>}
      <nav className="view-switch">{(["list", "calendar", "stats"] as View[]).map((item) => <button className={view === item ? "active" : ""} onClick={() => setView(item)} key={item}>{item === "list" ? <ListTodo /> : item === "calendar" ? <CalendarDays /> : <BarChart3 />}<span>{t[item]}</span></button>)}</nav>

      <section className="composer glass">
        <form onSubmit={addTask}>
          <div className="composer-main"><input ref={draftRef} aria-label={t.add} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.placeholder} /><button type="button" className={`options-button ${advanced ? "active" : ""}`} onClick={() => setAdvanced(!advanced)}><Tag size={18} /></button><button className="add-button" aria-label={t.add}><Plus size={22} /></button></div>
          {advanced && <div className="advanced-grid">
            <label><span>{t.project}</span><input list="projects" value={project} onChange={(e) => setProject(e.target.value)} /><datalist id="projects">{projects.map((item) => <option key={item} value={item} />)}</datalist></label>
            <label><span>{t.tags}</span><input value={tags} onChange={(e) => setTags(e.target.value)} /></label>
            <label><span>{t.due}</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
            <label><span>{t.repeat}</span><select value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>{(["none", "daily", "weekly", "monthly"] as Repeat[]).map((item) => <option key={item} value={item}>{t[item]}</option>)}</select></label>
          </div>}
        </form>
      </section>

      {view === "list" && <>
        <div className="toolbar"><div className="segmented">{(["all", "active", "completed"] as Filter[]).map((item) => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{t[item]}</button>)}</div><div className="toolbar-actions"><span>{visibleCount} {t[filter]}</span>{completed > 0 && <button onClick={() => setTasks(tasks.filter((task) => !task.completed))}>{t.clear}</button>}</div></div>
        <DndContext sensors={sensors} onDragEnd={dragEnd}><SortableContext items={visible.map((task) => task.id)} strategy={verticalListSortingStrategy}><div className="task-list">{visible.map((task) => <SortableTask key={task.id} task={task} locale={locale} onToggle={() => toggleTask(task)} onDelete={() => setTasks(tasks.filter((item) => item.id !== task.id))} onUpdate={(updated) => setTasks(tasks.map((item) => item.id === updated.id ? updated : item))} />)}</div></SortableContext></DndContext>
        {!visible.length && <div className="empty glass"><div className="empty-icon"><ListTodo /></div><h2>{t.empty}</h2><p>{t.emptyHint}</p><button className="empty-action" onClick={() => { setView("list"); setFilter("all"); draftRef.current?.focus(); }}>{t.first}</button></div>}
      </>}

      {view === "calendar" && <section className="calendar-view glass"><div className="calendar-heading"><CalendarDays /><h2>{new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale === "ja" ? "ja-JP" : "en-US", { month: "long", year: "numeric" }).format(new Date())}</h2></div><div className="calendar-grid">{calendarDays.map((day, index) => <div className={`calendar-day ${day ? "" : "blank"}`} key={index}>{day && <><strong>{day}</strong><div>{tasks.filter((task) => task.dueDate && new Date(`${task.dueDate}T12:00:00`).getMonth() === new Date().getMonth() && Number(task.dueDate.slice(-2)) === day).map((task) => <span className={task.completed ? "done" : ""} key={task.id}>{task.title}</span>)}</div></>}</div>)}</div></section>}

      {view === "stats" && <section className="stats-grid"><article className="stat-card glass hero-stat"><div className="progress-ring" style={{ "--progress": `${rate * 3.6}deg` } as React.CSSProperties}><div>{rate}%</div></div><div><span>{t.completeRate}</span><h2>{completed} / {tasks.length}</h2></div></article><article className="stat-card glass"><Check /><span>{t.done}</span><strong>{completed}</strong></article><article className="stat-card glass"><ListTodo /><span>{t.total}</span><strong>{tasks.length}</strong></article><article className="stat-card glass project-stat"><Tag /><span>{t.project}</span><div>{projects.map((item) => <p key={item}><span>{item}</span><strong>{tasks.filter((task) => task.project === item).length}</strong></p>)}</div></article></section>}

    </main>
  </div>;
}

export default App;
