import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Papa from "papaparse";
import { createBackup, deleteBackup, listBackups, type BackupSnapshot } from "./backups";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Download,
  FileJson,
  Home,
  MoreHorizontal,
  Plus,
  Settings,
  Target,
  Timer,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type View = "dashboard" | "companies" | "schedule" | "materials";
type Theme = "light" | "dark" | "system";
type Locale = "zh" | "ja" | "en";
type Stage =
  | "saved"
  | "briefing"
  | "es_draft"
  | "es_submitted"
  | "web_test"
  | "first_interview"
  | "second_interview"
  | "final_interview"
  | "offer"
  | "rejected"
  | "withdrawn";
type ItemType =
  | "es"
  | "web_test"
  | "resume"
  | "interview"
  | "briefing"
  | "research"
  | "general";
type Priority = "low" | "medium" | "high";
type CreateType = "company" | "schedule" | "es" | "interview" | "preparation";
type PrepType =
  | "research"
  | "es_fix"
  | "interview_practice"
  | "web_test_prep"
  | "documents"
  | "clothes"
  | "route"
  | "other";
type Company = {
  id: string;
  name: string;
  industry: string;
  position: string;
  interestLevel: number;
  stage: Stage;
  nextEventAt?: string;
  locationOrOnline?: string;
  careersUrl?: string;
  notes: string;
  tags: string[];
  color: string;
  createdAt: number;
  updatedAt: number;
};
type Material = {
  id: string;
  title: string;
  companyId?: string;
  type: ItemType;
  dueAt?: string;
  priority: Priority;
  tags: string[];
  notes: string;
  completed: boolean;
  isWeeklyFocus: boolean;
  createdAt: number;
  updatedAt: number;
  documentType?: "es" | "resume" | "open_es" | "transcript" | "graduation" | "recommendation" | "other";
  submissionStatus?: "not_started" | "drafting" | "review" | "submitted" | "returned";
  submittedAt?: string;
  versionName?: string;
  fileName?: string;
  language?: string;
  characterLimit?: string;
  motivation?: string;
  selfPr?: string;
  gakuchika?: string;
  strengths?: string;
  weaknesses?: string;
  research?: string;
  customQuestions?: { question: string; answer: string }[];
  result?: "undecided" | "passed" | "failed";
  resultAt?: string;
  revisionPoints?: string;
};
type Event = {
  id: string;
  companyId?: string;
  title: string;
  type: ItemType;
  stage: Stage;
  startsAt: string;
  locationOrOnline: string;
  notes: string;
  createdAt: number;
};
type InterviewRecord = {
  id: string;
  companyId?: string;
  round: string;
  interviewAt: string;
  format: string;
  interviewers: string;
  questions: string;
  answers: string;
  feeling: string;
  score: number;
  result: string;
  improvements: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
};
type Preparation = {
  id: string;
  title: string;
  companyId?: string;
  type: PrepType;
  dueAt?: string;
  priority: Priority;
  completed: boolean;
  notes: string;
  createdAt: number;
  updatedAt: number;
};
type Data = {
  schemaVersion: 5;
  companies: Company[];
  materials: Material[];
  events: Event[];
  interviews: InterviewRecord[];
  preparations: Preparation[];
  focusMinutes: number;
};
const KEY = "career-flow-data-v5",
  OLD = "career-flow-data-v4",
  BACKUP = "career-flow-pre-v5-backup",
  CLEAN = "career-flow-demo-cleaned-v1",
  THEME = "todo-apple-theme",
  LOCALE = "todo-apple-locale",
  ICON = "todo-apple-custom-icon";
const demoNames = ["Rakuten Group", "三菱UFJ银行", "CyberAgent"];
const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const types: ItemType[] = [
  "es",
  "web_test",
  "resume",
  "interview",
  "briefing",
  "research",
  "general",
];
const stages: Stage[] = [
  "saved",
  "briefing",
  "es_draft",
  "es_submitted",
  "web_test",
  "first_interview",
  "second_interview",
  "final_interview",
  "offer",
  "rejected",
  "withdrawn",
];
const tr = {
  zh: {
    dashboard: "主页",
    companies: "企业",
    schedule: "日程",
    materials: "ES・面试",
    settings: "设置",
    new: "新建",
    title: "本周就活摘要",
    fieldTitle: "标题",
    subtitle: "日本就活进度与材料管理",
    addCompany: "新增企业",
    addEvent: "新增日程",
    addMaterial: "添加书类",
    addInterview: "新增面试记录",
    addPrep: "新增准备事项",
    interviews: "面试记录",
    preparations: "准备事项",
    round: "面试轮次",
    interviewAt: "面试日期和时间",
    format: "面试形式",
    interviewers: "面试官",
    questions: "提问内容",
    answers: "回答内容",
    feeling: "面试感受",
    score: "自我评分",
    result: "结果",
    improvements: "改进事项",
    prepType: "准备类型",
    es_fix: "ES 修改",
    interview_practice: "面试练习",
    web_test_prep: "Web 测试准备",
    documents: "证件准备",
    clothes: "服装准备",
    route: "交通路线确认",
    other: "其他",
    inProgress: "选考中",
    dueWeek: "本周截止",
    waiting: "等待结果",
    next: "下一项重要日程",
    deadlines: "本周截止",
    funnel: "选考进度",
    results: "等待结果",
    focus: "本周准备重点",
    company: "企业",
    industry: "行业",
    position: "职位",
    interest: "志望度",
    stage: "当前选考阶段",
    event: "下一项日程",
    place: "地点或线上方式",
    url: "招聘页面",
    notes: "备注",
    saved: "收藏",
    briefing: "说明会",
    es_draft: "ES 准备",
    es_submitted: "ES 已提交",
    web_test: "Web 测试",
    first_interview: "一次面试",
    second_interview: "二次面试",
    final_interview: "最终面试",
    offer: "Offer",
    rejected: "不通过",
    withdrawn: "辞退",
    es: "ES",
    resume: "履历书",
    interview: "面试",
    research: "企业研究",
    general: "普通事项",
    high: "高",
    medium: "中",
    low: "低",
    due: "截止时间",
    priority: "优先级",
    tags: "标签",
    all: "全部",
    incomplete: "未完成",
    completed: "已完成",
    overdue: "已逾期",
    urgent: "24 小时内",
    days: "天",
    save: "保存",
    cancel: "取消",
    edit: "编辑",
    remove: "删除",
    appearance: "外观",
    language: "语言",
    light: "浅色",
    dark: "深色",
    system: "跟随系统",
    importCsv: "导入 CSV",
    exportCsv: "导出 CSV",
    backup: "完整备份",
    restore: "恢复备份",
    data: "数据管理",
    icon: "自定义图标",
    online: "线上",
    noData: "暂无事项",
    loadDemo: "载入示例数据",
    clearDemo: "清除示例数据",
    deleteCompany: "删除企业",
    deleteQuestion: "是否同时删除该企业关联的日程、资料和选考记录？",
    deleteAll: "同时删除关联数据",
    deleteOnly: "仅删除企业",
    undo: "撤销",
    materialsSub: "ES、履历书、面试记录与准备事项",
    scheduleSub: "说明会、笔试、面试与截止时间",
  },
  ja: {
    dashboard: "ホーム",
    companies: "企業",
    schedule: "日程",
    materials: "ES・面接",
    settings: "設定",
    new: "新規作成",
    title: "今週の就活サマリー",
    fieldTitle: "タイトル",
    subtitle: "日本就活進捗・書類管理",
    addCompany: "企業を追加",
    addEvent: "日程を追加",
    addMaterial: "書類を追加",
    addInterview: "面接記録を追加",
    addPrep: "準備事項を追加",
    interviews: "面接記録",
    preparations: "準備事項",
    round: "面接回数",
    interviewAt: "面接日時",
    format: "面接形式",
    interviewers: "面接官",
    questions: "質問内容",
    answers: "回答内容",
    feeling: "面接の感触",
    score: "自己評価",
    result: "結果",
    improvements: "改善点",
    prepType: "準備タイプ",
    es_fix: "ES修正",
    interview_practice: "面接練習",
    web_test_prep: "Webテスト対策",
    documents: "書類準備",
    clothes: "服装準備",
    route: "交通経路確認",
    other: "その他",
    inProgress: "選考中",
    dueWeek: "今週の締切",
    waiting: "結果待ち",
    next: "次の重要日程",
    deadlines: "今週の締切",
    funnel: "選考進捗",
    results: "結果待ち",
    focus: "今週の準備重点",
    company: "企業",
    industry: "業界",
    position: "職種",
    interest: "志望度",
    stage: "選考段階",
    event: "次の日程",
    place: "場所・オンライン",
    url: "採用ページ",
    notes: "メモ",
    saved: "気になる",
    briefing: "説明会",
    es_draft: "ES作成",
    es_submitted: "ES提出済",
    web_test: "Webテスト",
    first_interview: "一次面接",
    second_interview: "二次面接",
    final_interview: "最終面接",
    offer: "内定",
    rejected: "不合格",
    withdrawn: "辞退",
    es: "エントリーシート",
    resume: "履歴書",
    interview: "面接",
    research: "企業研究",
    general: "その他",
    high: "高",
    medium: "中",
    low: "低",
    due: "締切",
    priority: "優先度",
    tags: "タグ",
    all: "すべて",
    incomplete: "未完了",
    completed: "完了",
    overdue: "期限切れ",
    urgent: "24時間以内",
    days: "日",
    save: "保存",
    cancel: "キャンセル",
    edit: "編集",
    remove: "削除",
    appearance: "表示",
    language: "言語",
    light: "ライト",
    dark: "ダーク",
    system: "システム",
    importCsv: "CSV読込",
    exportCsv: "CSV書出",
    backup: "完全バックアップ",
    restore: "復元",
    data: "データ",
    icon: "アイコン",
    online: "オンライン",
    noData: "予定なし",
    loadDemo: "サンプルを読み込む",
    clearDemo: "サンプルを削除",
    deleteCompany: "企業を削除",
    deleteQuestion: "関連する日程、資料、選考記録も削除しますか？",
    deleteAll: "関連データも削除",
    deleteOnly: "企業のみ削除",
    undo: "元に戻す",
    materialsSub: "ES・履歴書・面接記録・準備事項",
    scheduleSub: "説明会・筆記・面接・締切",
  },
  en: {
    dashboard: "Home",
    companies: "Companies",
    schedule: "Schedule",
    materials: "ES · Interview",
    settings: "Settings",
    new: "New",
    title: "This week's search",
    fieldTitle: "Title",
    subtitle: "Japan job search progress and materials",
    addCompany: "Add company",
    addEvent: "Add event",
    addMaterial: "Add document",
    addInterview: "Add interview record",
    addPrep: "Add preparation",
    interviews: "Interview records",
    preparations: "Preparations",
    round: "Interview round",
    interviewAt: "Interview date and time",
    format: "Format",
    interviewers: "Interviewers",
    questions: "Questions",
    answers: "Answers",
    feeling: "Feeling",
    score: "Self score",
    result: "Result",
    improvements: "Improvements",
    prepType: "Preparation type",
    es_fix: "ES revision",
    interview_practice: "Interview practice",
    web_test_prep: "Web test prep",
    documents: "Documents",
    clothes: "Clothes",
    route: "Route check",
    other: "Other",
    inProgress: "In process",
    dueWeek: "Due this week",
    waiting: "Waiting",
    next: "Next key event",
    deadlines: "Due this week",
    funnel: "Application funnel",
    results: "Waiting for result",
    focus: "Weekly priorities",
    company: "Company",
    industry: "Industry",
    position: "Position",
    interest: "Interest",
    stage: "Stage",
    event: "Next event",
    place: "Location or online",
    url: "Careers page",
    notes: "Notes",
    saved: "Saved",
    briefing: "Briefing",
    es_draft: "ES draft",
    es_submitted: "ES submitted",
    web_test: "Web test",
    first_interview: "First interview",
    second_interview: "Second interview",
    final_interview: "Final interview",
    offer: "Offer",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
    es: "ES",
    resume: "Resume",
    interview: "Interview",
    research: "Research",
    general: "General",
    high: "High",
    medium: "Medium",
    low: "Low",
    due: "Due",
    priority: "Priority",
    tags: "Tags",
    all: "All",
    incomplete: "Incomplete",
    completed: "Completed",
    overdue: "Overdue",
    urgent: "Within 24h",
    days: "days",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    remove: "Delete",
    appearance: "Appearance",
    language: "Language",
    light: "Light",
    dark: "Dark",
    system: "System",
    importCsv: "Import CSV",
    exportCsv: "Export CSV",
    backup: "Full backup",
    restore: "Restore",
    data: "Data",
    icon: "Custom icon",
    online: "Online",
    noData: "Nothing here",
    loadDemo: "Load sample data",
    clearDemo: "Clear sample data",
    deleteCompany: "Delete company",
    deleteQuestion:
      "Also delete related events, materials and application records?",
    deleteAll: "Delete related data",
    deleteOnly: "Delete company only",
    undo: "Undo",
    materialsSub: "ES, resumes, interview records and preparations",
    scheduleSub: "Briefings, tests, interviews and deadlines",
  },
};
// Keep keyboard viewport changes out of React's render path. Safari can emit many
// visualViewport resize events while the keyboard and address bar settle.
if (typeof window !== "undefined") {
  let keyboardFrame = 0;
  const syncKeyboardClass = () => {
    cancelAnimationFrame(keyboardFrame);
    keyboardFrame = requestAnimationFrame(() => {
    const vv = window.visualViewport;
    const keyboardOpen = !!vv && window.innerHeight - vv.height > 140;
    document.documentElement.classList.toggle("keyboard-open", keyboardOpen);
    });
  };
  window.visualViewport?.addEventListener("resize", syncKeyboardClass, {
    passive: true,
  });
  window.visualViewport?.addEventListener("scroll", syncKeyboardClass, {
    passive: true,
  });
  window.addEventListener("resize", syncKeyboardClass, { passive: true });
  queueMicrotask(syncKeyboardClass);
}
function emptyData(): Data {
  return {
    schemaVersion: 5,
    companies: [],
    materials: [],
    events: [],
    interviews: [],
    preparations: [],
    focusMinutes: 0,
  };
}
function demo(): Data {
  const a = id(),
    b = id();
  return {
    ...emptyData(),
    companies: [
      {
        id: a,
        name: "Rakuten Group",
        industry: "互联网 / 电商",
        position: "Business Development",
        interestLevel: 5,
        stage: "first_interview",
        nextEventAt: at(2, 14),
        locationOrOnline: "Online",
        careersUrl: "",
        notes: "准备案例面试",
        tags: ["sample"],
        color: "#555555",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: b,
        name: "三菱UFJ银行",
        industry: "金融",
        position: "総合職",
        interestLevel: 4,
        stage: "es_submitted",
        nextEventAt: at(5, 23),
        locationOrOnline: "Online",
        careersUrl: "",
        notes: "",
        tags: ["sample"],
        color: "#d18135",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    materials: [
      {
        id: id(),
        title: "Rakuten 一次面接准备",
        companyId: a,
        type: "interview",
        dueAt: at(1, 20),
        priority: "high",
        tags: ["sample"],
        notes: "",
        completed: false,
        isWeeklyFocus: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
  };
}
function at(days: number, hour = 18) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}
function normalize(x: any): Data {
  return {
    schemaVersion: 5,
    companies: x.companies || [],
    materials: x.materials || [],
    events: x.events || [],
    interviews: x.interviews || [],
    preparations: x.preparations || [],
    focusMinutes: x.focusMinutes || 0,
  };
}
function load(): Data {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return clean(normalize(JSON.parse(stored)));
    const old = localStorage.getItem(OLD);
    if (!old) return emptyData();
    localStorage.setItem(BACKUP, old);
    const x = JSON.parse(old),
      ids = new Set(
        (x.companies || [])
          .filter((v: any) => !demoNames.includes(v.name))
          .map((v: any) => v.id),
      );
    return clean(
      normalize({
        schemaVersion: 5,
        companies: (x.companies || [])
          .filter((v: any) => !demoNames.includes(v.name))
          .map((v: any) => ({
            ...v,
            interestLevel: v.interestLevel || 3,
            tags: v.tags || [],
            color: v.color || "#555555",
          })),
        materials: (x.materials || [])
          .filter((v: any) => !v.companyId || ids.has(v.companyId))
          .map((v: any) => ({
            ...v,
            tags: v.tags || [],
            isWeeklyFocus: !!v.isWeeklyFocus,
          })),
        events: [],
        focusMinutes: x.focusMinutes || 0,
      }),
    );
  } catch {
    return emptyData();
  }
}
function clean(d: Data): Data {
  if (localStorage.getItem(CLEAN)) return d;
  const sampleIds = new Set(
    d.companies
      .filter((x) => demoNames.includes(x.name) || x.tags?.includes("sample"))
      .map((x) => x.id),
  );
  localStorage.setItem(CLEAN, "1");
  return sampleIds.size
    ? {
        ...d,
        companies: d.companies.filter((x) => !sampleIds.has(x.id)),
        materials: d.materials.filter(
          (x) =>
            !sampleIds.has(x.companyId || "") && !x.tags?.includes("sample"),
        ),
        events: d.events.filter((x) => !sampleIds.has(x.companyId || "")),
        interviews: d.interviews.filter(
          (x) => !sampleIds.has(x.companyId || ""),
        ),
        preparations: d.preparations.filter(
          (x) => !sampleIds.has(x.companyId || ""),
        ),
      }
    : d;
}
export default function App() {
  const [data, setData] = useState<Data>(load);
  const [view, setView] = useState<View>("dashboard"),
    [theme, setTheme] = useState<Theme>(
      () => (localStorage.getItem(THEME) as Theme) || "system",
    ),
    [locale, setLocale] = useState<Locale>(
      () => (localStorage.getItem(LOCALE) as Locale) || "zh",
    ),
    [menu, setMenu] = useState(false),
    [desktopMenu, setDesktopMenu] = useState(false),
    [settings, setSettings] = useState(false),
    [form, setForm] = useState<CreateType | null>(null),
    [editCompany, setEditCompany] = useState<Company>(),
    [editEvent, setEditEvent] = useState<Event>(),
    [editInterview, setEditInterview] = useState<InterviewRecord>(),
    [editPrep, setEditPrep] = useState<Preparation>(),
    [selected, setSelected] = useState<string>(),
    [confirm, setConfirm] = useState<Company>(),
    [filter, setFilter] = useState("all"),
    [toast, setToast] = useState<{ text: string; undo: () => void }>(),
    [icon, setIcon] = useState(() => localStorage.getItem(ICON) || "");
  const csv = useRef<HTMLInputElement>(null),
    json = useRef<HTMLInputElement>(null),
    iconRef = useRef<HTMLInputElement>(null);
  const firstDataRender = useRef(true);
  const t = tr[locale];
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(data)), [data]);
  useEffect(() => {
    if (firstDataRender.current) {
      firstDataRender.current = false;
      return;
    }
    const snapshot: BackupSnapshot = {
      schemaVersion: data.schemaVersion,
      createdAt: Date.now(),
      companies: data.companies,
      schedules: data.events,
      resources: data.materials,
      interviews: data.interviews,
      preparations: data.preparations,
      selectionRecords: data.companies.map((x) => ({ id: x.id, stage: x.stage, updatedAt: x.updatedAt })),
      settings: { theme, locale },
    };
    createBackup(snapshot).catch(() => setToast({ text: locale === "ja" ? "自動バックアップに失敗しました" : locale === "en" ? "Automatic backup failed" : "自动备份失败", undo: () => undefined }));
  }, [data, locale, theme]);
  useEffect(() => localStorage.setItem(LOCALE, locale), [locale]);
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme:dark)");
    const f = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && m.matches),
      );
    f();
    localStorage.setItem(THEME, theme);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [theme]);
  useEffect(() => {
    document.body.classList.toggle("sheet-open", menu);
    return () => document.body.classList.remove("sheet-open");
  }, [menu]);
  useEffect(() => {
    if (!toast) return;
    const x = setTimeout(() => setToast(undefined), 5000);
    return () => clearTimeout(x);
  }, [toast]);
  const byId = useMemo(
    () => Object.fromEntries(data.companies.map((x) => [x.id, x])),
    [data.companies],
  );
  const active = data.companies.filter(
      (x) => !["saved", "offer", "rejected", "withdrawn"].includes(x.stage),
    ),
    due = [
      ...data.materials.filter((x) => !x.completed && x.dueAt),
      ...data.preparations.filter((x) => !x.completed && x.dueAt),
    ]
      .filter((x) => new Date(x.dueAt!).getTime() < Date.now() + 6048e5)
      .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt))),
    waiting = data.companies.filter(
      (x) =>
        [
          "web_test",
          "first_interview",
          "second_interview",
          "final_interview",
        ].includes(x.stage) && !x.nextEventAt,
    ),
    focus = data.materials.filter((x) => x.isWeeklyFocus).slice(0, 3);
  const schedules = [
    ...data.events.map((x) => ({
      kind: "event" as const,
      id: x.id,
      at: x.startsAt,
      title: x.title,
      company: byId[x.companyId || ""],
      type: x.type,
      event: x,
    })),
    ...data.materials
      .filter((x) => x.dueAt)
      .map((x) => ({
        kind: "material" as const,
        id: x.id,
        at: x.dueAt!,
        title: x.title,
        company: byId[x.companyId || ""],
        type: x.type,
        material: x,
      })),
    ...data.preparations
      .filter((x) => x.dueAt)
      .map((x) => ({
        kind: "preparation" as const,
        id: x.id,
        at: x.dueAt!,
        title: x.title,
        company: byId[x.companyId || ""],
        type: x.type,
        preparation: x,
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const next = schedules[0];
  const toggle = (x: string) =>
    setData((d) => ({
      ...d,
      materials: d.materials.map((v) =>
        v.id === x ? { ...v, completed: !v.completed } : v,
      ),
      preparations: d.preparations.map((v) =>
        v.id === x ? { ...v, completed: !v.completed } : v,
      ),
    }));
  const focusToggle = (x: string) =>
    setData((d) => ({
      ...d,
      materials: d.materials.map((v) =>
        v.id === x ? { ...v, isWeeklyFocus: !v.isWeeklyFocus } : v,
      ),
    }));
  const removeMaterial = (x: Material) => {
    setData((d) => ({
      ...d,
      materials: d.materials.filter((v) => v.id !== x.id),
    }));
    setToast({
      text: x.title,
      undo: () => setData((d) => ({ ...d, materials: [x, ...d.materials] })),
    });
  };
  const removeEvent = (x: Event) => {
    setData((d) => ({ ...d, events: d.events.filter((v) => v.id !== x.id) }));
    setToast({
      text: x.title,
      undo: () => setData((d) => ({ ...d, events: [x, ...d.events] })),
    });
  };
  const removeInterview = (x: InterviewRecord) => {
    setData((d) => ({
      ...d,
      interviews: d.interviews.filter((v) => v.id !== x.id),
    }));
    setToast({
      text: x.round,
      undo: () => setData((d) => ({ ...d, interviews: [x, ...d.interviews] })),
    });
  };
  const removePrep = (x: Preparation) => {
    setData((d) => ({
      ...d,
      preparations: d.preparations.filter((v) => v.id !== x.id),
    }));
    setToast({
      text: x.title,
      undo: () =>
        setData((d) => ({ ...d, preparations: [x, ...d.preparations] })),
    });
  };
  const saveCompany = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      base = editCompany;
    const v: Company = {
      id: base?.id || id(),
      name: String(f.get("name")),
      industry: String(f.get("industry")),
      position: String(f.get("position")),
      interestLevel: Number(f.get("interest")),
      stage: f.get("stage") as Stage,
      nextEventAt: String(f.get("event") || "") || undefined,
      locationOrOnline: String(f.get("place")),
      careersUrl: String(f.get("url")),
      notes: String(f.get("notes")),
      tags: base?.tags || [],
      color: String(f.get("color")),
      createdAt: base?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    setData((d) => ({
      ...d,
      companies: base
        ? d.companies.map((x) => (x.id === v.id ? v : x))
        : [v, ...d.companies],
    }));
    setForm(null);
    setEditCompany(undefined);
  };
  const saveMaterial = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      v: Material = {
        id: id(),
        title: String(f.get("versionName") || f.get("documentType") || "书类"),
        companyId: String(f.get("company") || "") || undefined,
        type: "es",
        dueAt: String(f.get("due") || "") || undefined,
        priority: f.get("priority") as Priority,
        tags: String(f.get("tags") || "")
          .split(/[，,\n]+/)
          .map((tag) => tag.trim())
          .filter(Boolean),
        notes: String(f.get("notes") || ""),
        completed: false,
        isWeeklyFocus: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        documentType: f.get("documentType") as Material["documentType"],
        submissionStatus: f.get("submissionStatus") as Material["submissionStatus"],
        submittedAt: String(f.get("submittedAt") || "") || undefined,
        versionName: String(f.get("versionName") || "") || undefined,
        fileName: String(f.get("fileName") || "") || undefined,
        language: String(f.get("language") || "") || undefined,
        characterLimit: String(f.get("characterLimit") || "") || undefined,
        motivation: String(f.get("motivation") || "") || undefined,
        selfPr: String(f.get("selfPr") || "") || undefined,
        gakuchika: String(f.get("gakuchika") || "") || undefined,
        strengths: String(f.get("strengths") || "") || undefined,
        weaknesses: String(f.get("weaknesses") || "") || undefined,
        research: String(f.get("research") || "") || undefined,
        customQuestions: String(f.get("customQuestions") || "[]") ? JSON.parse(String(f.get("customQuestions") || "[]")) : [],
        result: f.get("result") as Material["result"],
        resultAt: String(f.get("resultAt") || "") || undefined,
        revisionPoints: String(f.get("revisionPoints") || "") || undefined,
      };
    setData((d) => ({ ...d, materials: [v, ...d.materials] }));
    setForm(null);
  };
  const saveEvent = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      base = editEvent,
      v: Event = {
        id: base?.id || id(),
        companyId: String(f.get("company") || "") || undefined,
        title: String(f.get("title")),
        type: f.get("type") as ItemType,
        stage: f.get("stage") as Stage,
        startsAt: String(f.get("startsAt")),
        locationOrOnline: String(f.get("place")),
        notes: String(f.get("notes")),
        createdAt: base?.createdAt || Date.now(),
      };
    setData((d) => ({
      ...d,
      events: base
        ? d.events.map((x) => (x.id === v.id ? v : x))
        : [v, ...d.events],
    }));
    setForm(null);
    setEditEvent(undefined);
  };
  const saveInterview = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      base = editInterview,
      v: InterviewRecord = {
        id: base?.id || id(),
        companyId: String(f.get("company") || "") || undefined,
        round: String(f.get("round")),
        interviewAt: String(f.get("interviewAt")),
        format: String(f.get("format")),
        interviewers: String(f.get("interviewers")),
        questions: String(f.get("questions")),
        answers: String(f.get("answers")),
        feeling: String(f.get("feeling")),
        score: Number(f.get("score") || 3),
        result: String(f.get("result")),
        improvements: String(f.get("improvements")),
        notes: String(f.get("notes")),
        createdAt: base?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
    setData((d) => ({
      ...d,
      interviews: base
        ? d.interviews.map((x) => (x.id === v.id ? v : x))
        : [v, ...d.interviews],
    }));
    setForm(null);
    setEditInterview(undefined);
  };
  const savePrep = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      base = editPrep,
      v: Preparation = {
        id: base?.id || id(),
        title: String(f.get("title")),
        companyId: String(f.get("company") || "") || undefined,
        type: f.get("type") as PrepType,
        dueAt: String(f.get("due") || "") || undefined,
        priority: f.get("priority") as Priority,
        completed: f.get("completed") === "on",
        notes: String(f.get("notes")),
        createdAt: base?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
    setData((d) => ({
      ...d,
      preparations: base
        ? d.preparations.map((x) => (x.id === v.id ? v : x))
        : [v, ...d.preparations],
    }));
    setForm(null);
    setEditPrep(undefined);
  };
  const deleteCompany = (co: Company, all: boolean) => {
    setData((d) => ({
      ...d,
      companies: d.companies.filter((x) => x.id !== co.id),
      materials: all
        ? d.materials.filter((x) => x.companyId !== co.id)
        : d.materials.map((x) =>
            x.companyId === co.id ? { ...x, companyId: undefined } : x,
          ),
      events: all
        ? d.events.filter((x) => x.companyId !== co.id)
        : d.events.map((x) =>
            x.companyId === co.id ? { ...x, companyId: undefined } : x,
          ),
      interviews: all
        ? d.interviews.filter((x) => x.companyId !== co.id)
        : d.interviews.map((x) =>
            x.companyId === co.id ? { ...x, companyId: undefined } : x,
          ),
      preparations: all
        ? d.preparations.filter((x) => x.companyId !== co.id)
        : d.preparations.map((x) =>
            x.companyId === co.id ? { ...x, companyId: undefined } : x,
          ),
    }));
    setConfirm(undefined);
    setSelected(undefined);
  };
  const download = (name: string, body: string, type: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff", body], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const x = JSON.parse(String(r.result));
        if (x.schemaVersion !== 5 || !Array.isArray(x.companies) || !Array.isArray(x.materials) || !Array.isArray(x.events)) throw new Error("invalid");
        setData(normalize(x));
      } catch {
        setToast({ text: locale === "ja" ? "バックアップの形式が無効です" : locale === "en" ? "Invalid backup format; existing data was kept" : "备份格式无效，原数据未改变", undo: () => undefined });
      }
    };
    r.readAsText(f);
  };
  const importCsv = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    Papa.parse<any>(f, {
      header: true,
      complete: ({ data: rows }) =>
        setData((d) => ({
          ...d,
          materials: [
            ...rows
              .filter((x: any) => x.title)
              .map((x: any) => ({
                ...x,
                id: id(),
                tags: String(x.tags || "")
                  .split("|")
                  .filter(Boolean),
                completed: x.completed === "true",
                isWeeklyFocus: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              })),
            ...d.materials,
          ],
        })),
    });
  };
  const upload = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const v = String(r.result);
      setIcon(v);
      localStorage.setItem(ICON, v);
    };
    r.readAsDataURL(f);
  };
  const open = (kind: CreateType) => {
    setMenu(false);
    setDesktopMenu(false);
    localStorage.setItem("careerflow-last-create-type", kind);
    setForm(kind);
  };
  return (
    <div className="app-shell">
      <div className="build-badge">Build: 376130e · based on 623d743</div>
      <div className="student-app career-app">
        <aside className="sidebar panel">
          <Brand icon={icon} />
          <StableNav view={view} setView={setView} t={t} />
          <DesktopCreate
            t={t}
            open={open}
            active={desktopMenu}
            setActive={setDesktopMenu}
          />
          <div className="course-nav">
            <div>
              <span>{t.companies}</span>
              <button onClick={() => open("company")}>
                <Plus />
              </button>
            </div>
            {data.companies.map((x) => (
              <button
                className={view === "companies" && selected === x.id ? "selected" : ""}
                title={x.name}
                key={x.id}
                onClick={() => {
                  setSelected(x.id);
                  setView("companies");
                }}
              >
                <i style={{ background: x.color }} />
                {x.name}
              </button>
            ))}
          </div>
          <button className="settings-link" onClick={() => setSettings(true)}>
            <Settings />
            {t.settings}
          </button>
        </aside>
        <header className="mobile-header glass-lite">
          <Brand icon={icon} />
          <button onClick={() => setSettings(true)}>
            <Settings />
          </button>
        </header>
        <main className="workspace">
          {view === "dashboard" && (
            <Dashboard
              {...{
                t,
                data,
                active,
                due,
                waiting,
                next,
                focus,
                byId,
                toggle,
                focusToggle,
                open,
              }}
            />
          )}
          {view === "companies" && (
            <Companies
              {...{
                t,
                data,
                byId,
                selected,
                setSelected,
                open,
                setEditCompany,
                setConfirm,
              }}
            />
          )}
          {view === "schedule" && (
            <Schedule
              {...{
                t,
                schedules,
                setEditEvent,
                setForm,
                removeEvent,
                removeMaterial,
                removePrep,
                setEditPrep,
              }}
            />
          )}
          {view === "materials" && (
            <Materials
              {...{
                t,
                data,
                byId,
                filter,
                setFilter,
                toggle,
                focusToggle,
                open,
                removeMaterial,
                removeInterview,
                removePrep,
                setEditInterview,
                setEditPrep,
              }}
            />
          )}
        </main>
        <MobileNav
          view={view}
          setView={setView}
          t={t}
          menu={menu}
          onAdd={() => (menu ? setMenu(false) : setMenu(true))}
        />
        {menu && (
          <ActionMenu
            t={t}
            view={view}
            close={() => setMenu(false)}
            open={open}
          />
        )}{" "}
        {settings && (
          <SettingsPanel
            t={t}
            theme={theme}
            setTheme={setTheme}
            locale={locale}
            setLocale={setLocale}
            close={() => setSettings(false)}
            data={data}
            setData={setData}
            icon={icon}
            csv={csv}
            json={json}
            iconRef={iconRef}
            importCsv={importCsv}
            importJson={importJson}
            upload={upload}
            download={download}
          />
        )}{" "}
        {form === "company" && (
          <CompanyForm
            t={t}
            initial={editCompany}
            close={() => {
              setForm(null);
              setEditCompany(undefined);
            }}
            save={saveCompany}
          />
        )}{" "}
        {form === "es" && (
          <MaterialForm
            t={t}
            companies={data.companies}
            close={() => setForm(null)}
            save={saveMaterial}
          />
        )}{" "}
        {form === "schedule" && (
          <EventForm
            t={t}
            companies={data.companies}
            initial={editEvent}
            close={() => {
              setForm(null);
              setEditEvent(undefined);
            }}
            save={saveEvent}
          />
        )}{" "}
        {form === "interview" && (
          <InterviewForm
            t={t}
            companies={data.companies}
            initial={editInterview}
            close={() => {
              setForm(null);
              setEditInterview(undefined);
            }}
            save={saveInterview}
          />
        )}{" "}
        {form === "preparation" && (
          <PreparationForm
            t={t}
            companies={data.companies}
            initial={editPrep}
            close={() => {
              setForm(null);
              setEditPrep(undefined);
            }}
            save={savePrep}
          />
        )}{" "}
        {confirm && (
          <Confirm
            t={t}
            company={confirm}
            close={() => setConfirm(undefined)}
            remove={deleteCompany}
          />
        )}{" "}
        {toast && (
          <Toast t={t} toast={toast} close={() => setToast(undefined)} />
        )}
      </div>
    </div>
  );
}
function Brand({ icon }: { icon: string }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        {icon ? <img src={icon} /> : <BriefcaseBusiness />}
      </div>
      <div>
        <strong>CareerFlow</strong>
        <span>日本就活管理</span>
      </div>
    </div>
  );
}
function Nav({
  view,
  setView,
  t,
}: {
  view: View;
  setView: (v: View) => void;
  t: any;
}) {
  const [activeSection, setActiveSection] = useState<View>(view);
  const [debugPhase, setDebugPhase] = useState<"idle" | "pressed" | "clicked" | "active">("idle");
  useEffect(() => setActiveSection(view), [view]);
  useEffect(() => {
    console.log("[nav] sidebar mounted", performance.now());
    return () => console.log("[nav] sidebar unmounted", performance.now());
  }, []);
  useEffect(() => {
    console.log("[nav] render", performance.now(), { activeSection, view, pathname: window.location.pathname });
  });
  useEffect(() => setDebugPhase("active"), [view]);
  const a: [View, any, string][] = [
    ["dashboard", Home, "dashboard"],
    ["companies", Building2, "companies"],
    ["schedule", CalendarDays, "schedule"],
    ["materials", BriefcaseBusiness, "materials"],
  ];
  return (
    <div className="nav-list">
      {a.map(([v, I, k]) => (
        <button
          className={activeSection === v ? "active" : ""}
          style={debugPhase !== "idle" && activeSection === v ? { backgroundColor: debugPhase === "pressed" ? "#ef4444" : debugPhase === "clicked" ? "#22c55e" : "#9ca3af" } : undefined}
          onClick={(e) => {
            console.log("[nav] click", performance.now(), v);
            setDebugPhase("clicked");
            setActiveSection(v);
            requestAnimationFrame(() => {
              console.log("[nav] navigate", performance.now(), v);
              setView(v);
              const el = e.currentTarget;
              console.log("[nav] frame 1", performance.now(), getComputedStyle(el).backgroundColor);
              requestAnimationFrame(() => console.log("[nav] frame 2", performance.now(), getComputedStyle(el).backgroundColor));
            });
          }}
          aria-current={view === v ? "page" : undefined}
          onPointerDown={(e) => { console.log("[nav] pointerdown", performance.now(), v); setDebugPhase("pressed"); e.currentTarget.dataset.pressed = "true"; }}
          onPointerUp={(e) => { delete e.currentTarget.dataset.pressed; }}
          onPointerLeave={(e) => { delete e.currentTarget.dataset.pressed; }}
          key={v}
        >
          <I />
          <span>{t[k]}</span>
        </button>
      ))}
    </div>
  );
}
const StableNav = memo(Nav);
function createActions(t: any): [CreateType, any, string][] {
  return [
    ["company", Building2, t.addCompany],
    ["schedule", CalendarDays, t.addEvent],
    ["es", FileJson, t.addMaterial],
    ["interview", BriefcaseBusiness, t.addInterview],
    ["preparation", MoreHorizontal, t.addPrep],
  ];
}
function DesktopCreate({
  t,
  open,
  active,
  setActive,
}: {
  t: any;
  open: (x: CreateType) => void;
  active: boolean;
  setActive: (x: boolean) => void;
}) {
  return (
    <div className="desktop-create">
      <button className="create-entry" onClick={() => setActive(!active)}>
        <Plus />
        <span>{t.new}</span>
      </button>
      {active && (
        <div className="desktop-create-menu">
          {createActions(t).map(([kind, Icon, label]) => (
            <button key={kind} onClick={() => open(kind)}>
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function MobileNav({
  view,
  setView,
  t,
  onAdd,
  menu,
}: {
  view: View;
  setView: (v: View) => void;
  t: any;
  onAdd: () => void;
  menu: boolean;
}) {
  return (
    <nav className="mobile-nav career-mobile-nav">
      <button
        className={view === "dashboard" ? "active" : ""}
        onClick={() => setView("dashboard")}
        aria-current={view === "dashboard" ? "page" : undefined}
        onPointerDown={(e) => { e.currentTarget.dataset.pressed = "true"; }}
        onPointerUp={(e) => { delete e.currentTarget.dataset.pressed; }}
        onPointerLeave={(e) => { delete e.currentTarget.dataset.pressed; }}
      >
        <Home />
        <span>{t.dashboard}</span>
      </button>
      <button
        className={view === "companies" ? "active" : ""}
        onClick={() => setView("companies")}
        aria-current={view === "companies" ? "page" : undefined}
        onPointerDown={(e) => { e.currentTarget.dataset.pressed = "true"; }}
        onPointerUp={(e) => { delete e.currentTarget.dataset.pressed; }}
        onPointerLeave={(e) => { delete e.currentTarget.dataset.pressed; }}
      >
        <Building2 />
        <span>{t.companies}</span>
      </button>
      <button
        className={`nav-add ${menu ? "open" : ""}`}
        onClick={onAdd}
        aria-label={menu ? "Close" : "Add"}
      >
        {menu ? <X /> : <Plus />}
      </button>
      <button
        className={view === "schedule" ? "active" : ""}
        onClick={() => setView("schedule")}
        aria-current={view === "schedule" ? "page" : undefined}
        onPointerDown={(e) => { e.currentTarget.dataset.pressed = "true"; }}
        onPointerUp={(e) => { delete e.currentTarget.dataset.pressed; }}
        onPointerLeave={(e) => { delete e.currentTarget.dataset.pressed; }}
      >
        <CalendarDays />
        <span>{t.schedule}</span>
      </button>
      <button
        className={view === "materials" ? "active" : ""}
        onClick={() => setView("materials")}
        aria-current={view === "materials" ? "page" : undefined}
        onPointerDown={(e) => { e.currentTarget.dataset.pressed = "true"; }}
        onPointerUp={(e) => { delete e.currentTarget.dataset.pressed; }}
        onPointerLeave={(e) => { delete e.currentTarget.dataset.pressed; }}
      >
        <BriefcaseBusiness />
        <span>{t.materials}</span>
      </button>
    </nav>
  );
}
function Title({
  children,
  action,
  className = "",
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`section-title ${className}`}>
      <h2>{children}</h2>
      {action}
    </div>
  );
}
function Empty({ t, load, kind = "general", open }: { t: any; load?: () => void; kind?: "company" | "schedule" | "materials" | "general"; open?: () => void }) {
  const copy: Record<string, [string, string, string]> = t.language === "言語" ? { company: ["企業がまだ登録されていません", "応募先企業を追加して、選考状況や締切をまとめて管理できます。", t.addCompany], schedule: ["日程がまだありません", "説明会や面接の予定を登録すると、次の行動が見やすくなります。", t.addEvent], materials: ["資料・面接記録がまだありません", "ESや面接記録を登録して、就活の準備を整理しましょう。", t.addMaterial], general: [t.noData, "ここから就活の記録を追加できます。", t.new] } : t.language === "Language" ? { company: ["No companies yet", "Add companies to keep applications, stages, and deadlines together.", t.addCompany], schedule: ["No schedule yet", "Add briefings and interviews to make your next action clear.", t.addEvent], materials: ["No materials or interview records yet", "Add ES, resumes, and interview notes to organize your search.", t.addMaterial], general: [t.noData, "Start by adding your first career record.", t.new] } : { company: ["还没有企业", "添加应聘企业，集中管理选考进度和截止时间。", t.addCompany], schedule: ["还没有日程", "添加说明会或面试安排，让下一步更清晰。", t.addEvent], materials: ["还没有资料或面试记录", "添加 ES、履历书或面试记录，整理你的就活准备。", t.addMaterial], general: [t.noData, "从这里开始添加你的就活记录。", t.new] };
  if (t.language === "言語") copy.schedule[1] = "説明会、筆記試験、面接などの予定を追加して、選考スケジュールを管理しましょう。";
  const [title, description, action] = copy[kind];
  return (
    <div className="empty-small">
      <BriefcaseBusiness aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
      {open && <button className="primary" onClick={open}><Plus />{action}</button>}
      {load && (
        <button className="text-button" onClick={load}>
          {t.loadDemo}
        </button>
      )}
    </div>
  );
}
function Dashboard({
  t,
  data,
  active,
  due,
  waiting,
  next,
  focus,
  byId,
  toggle,
  focusToggle,
  open,
}: any) {
  return (
    <>
      <div className="page-head">
        <div>
          <span>
            {new Intl.DateTimeFormat(undefined, {
              month: "long",
              day: "numeric",
              weekday: "long",
            }).format(new Date())}
          </span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <button className="primary" onClick={() => open("company")}>
          <Plus />
          {t.addCompany}
        </button>
      </div>
      <div className="main-dashboard-layout">
        <div className="dashboard-main">
          <div className="overview-grid">
            <Metric n={active.length} l={t.inProgress} i={BriefcaseBusiness} />
            <Metric n={due.length} l={t.dueWeek} i={Clock3} />
            <Metric n={waiting.length} l={t.waiting} i={Timer} />
          </div>
          <section className="entity-card next-class">
            <Title>{t.next}</Title>
            {next ? (
              <div>
                <i style={{ background: next.company?.color || "#555555" }} />
                <div>
                  <h3>{next.company?.name || t.general}</h3>
                  <p>
                    {t[next.type]} · {when(next.at)}
                  </p>
                  <span>
                    {next.company?.locationOrOnline || t.online} ·{" "}
                    {relative(next.at, t)}
                  </span>
                </div>
              </div>
            ) : (
            <Empty t={t} kind="schedule" open={() => open("schedule")} />
            )}
          </section>
          <section>
            <Title
              className="deadline-title"
              action={
                <button className="text-button" onClick={() => open("es")}>
                  <Plus />
                  {t.addMaterial}
                </button>
              }
            >
              {t.deadlines}
            </Title>
            <div className="deadline-list">
              {due.length ? (
                due.map((x: any) => (
                  <MaterialRow
                    key={x.id}
                    x={x}
                    company={byId[x.companyId]}
                    t={t}
                    toggle={toggle}
                    focus={focusToggle}
                  />
                ))
              ) : (
                <Empty t={t} />
              )}
            </div>
          </section>
        </div>
        <aside className="dashboard-sidebar">
          <section className="entity-card">
            <Title>{t.funnel}</Title>
            <div className="funnel">
              {[
                "saved",
                "es_submitted",
                "web_test",
                "first_interview",
                "offer",
              ].map((s) => (
                <div key={s}>
                  <span>{t[s]}</span>
                  <b>
                    {
                      data.companies.filter(
                        (x: any) =>
                          x.stage === s ||
                          (s === "first_interview" &&
                            [
                              "first_interview",
                              "second_interview",
                              "final_interview",
                            ].includes(x.stage)),
                      ).length
                    }
                  </b>
                </div>
              ))}
            </div>
          </section>
          <section className="entity-card">
            <Title>{t.results}</Title>
            {waiting.length ? (
              waiting.map((x: any) => (
                <div className="wait-row" key={x.id}>
                  <div>
                    <strong>{x.name}</strong>
                    <span>{t[x.stage]}</span>
                  </div>
                  <b>
                    {Math.max(
                      1,
                      Math.floor((Date.now() - x.updatedAt) / 864e5),
                    )}{" "}
                    <small>{t.days}</small>
                  </b>
                </div>
              ))
            ) : (
              <Empty t={t} />
            )}
          </section>
          <section className="entity-card">
            <Title>{t.focus}</Title>
            <div className="focus-list">
              {focus.map((x: any) => (
                <label key={x.id}>
                  <button
                    className={x.completed ? "done" : ""}
                    onClick={() => toggle(x.id)}
                  >
                    <Check />
                  </button>
                  <span>{x.title}</span>
                  <button onClick={() => focusToggle(x.id)}>
                    <X />
                  </button>
                </label>
              ))}
              {focus.length < 3 && <p>{t.language === "言語" ? `あと${3 - focus.length}件追加できます` : t.language === "Language" ? `${3 - focus.length} slots available` : `还可以添加 ${3 - focus.length} 项`}</p>}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
function Metric({ n, l, i: I }: { n: number; l: string; i: any }) {
  return (
    <div className="metric entity-card">
      <I />
      <div>
        <strong>{n}</strong>
        <span>{l}</span>
      </div>
    </div>
  );
}
function MaterialRow({
  x,
  company,
  t,
  toggle,
  focus,
}: {
  x: Material | Preparation;
  company?: Company;
  t: any;
  toggle: (x: string) => void;
  focus: (x: string) => void;
}) {
  const d = x.dueAt ? new Date(x.dueAt) : undefined,
    diff = d ? d.getTime() - Date.now() : Infinity;
  const isMaterial = "isWeeklyFocus" in x;
  return (
    <article
      className={`task-row-card entity-card ${diff < 0 ? "overdue" : diff < 864e5 ? "urgent" : ""}`}
    >
      <button
        className={`task-check ${x.completed ? "done" : ""}`}
        onClick={() => toggle(x.id)}
      >
        <Check />
      </button>
      <div>
        <h3>{x.title}</h3>
        <p>
          {company?.name || t.general} · {t[x.type]}
        </p>
      </div>
      <div className="task-due">
        <span>{d ? when(x.dueAt!) : "—"}</span>
        {diff < 0 && <b>{t.overdue}</b>}
        {diff >= 0 && diff < 864e5 && <b>{t.urgent}</b>}
      </div>
      {isMaterial && (
        <button
          className={`focus-star ${x.isWeeklyFocus ? "active" : ""}`}
          onClick={() => focus(x.id)}
        >
          <Target />
        </button>
      )}
    </article>
  );
}
function when(s: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(s));
}
function relative(s: string, t: any) {
  const h = Math.ceil((new Date(s).getTime() - Date.now()) / 36e5);
  return h < 1 ? "Now" : h < 24 ? `${h}h` : `${Math.ceil(h / 24)} ${t.days}`;
}
function Companies({
  t,
  data,
  byId,
  selected,
  setSelected,
  open,
  setEditCompany,
  setConfirm,
}: any) {
  const co = selected ? byId[selected] : undefined;
  if (co) {
    const materials = data.materials.filter((x: any) => x.companyId === co.id),
      interviews = data.interviews.filter((x: any) => x.companyId === co.id),
      preps = data.preparations.filter((x: any) => x.companyId === co.id);
    return (
      <>
        <div className="page-head">
          <div>
            <button className="back" onClick={() => setSelected(undefined)}>
              ‹ {t.companies}
            </button>
            <h1>{co.name}</h1>
            <p>
              {co.industry} · {co.position} · {"★".repeat(co.interestLevel)}
            </p>
          </div>
          <div className="head-actions">
            <button
              onClick={() => {
                setEditCompany(co);
                open("company");
              }}
            >
              {t.edit}
            </button>
            <button className="danger-button" onClick={() => setConfirm(co)}>
              {t.remove}
            </button>
          </div>
        </div>
        <div className="course-detail">
          <section className="entity-card course-profile">
            <i style={{ background: co.color }} />
            <h2>{t[co.stage]}</h2>
            <p>{co.notes || t.noData}</p>
            {co.careersUrl && (
              <a href={co.careersUrl} target="_blank" rel="noreferrer">
                {co.careersUrl}
              </a>
            )}
            {materials.filter((x: Material) => x.documentType).map((x: Material) => (
              <div className="document-summary" key={x.id}>
                <strong>{x.documentType === "resume" ? "履歴書" : x.documentType === "open_es" ? "OpenES" : x.documentType === "es" ? "ES" : x.documentType}</strong>
                <span>{x.dueAt ? when(x.dueAt) : "—"} · {x.submissionStatus || "未着手"}</span>
                <span>{x.versionName || ""} {x.result && `· ${x.result}`}</span>
              </div>
            ))}
          </section>
          <section className="detail-stack">
            <Title
              action={
                <button className="text-button" onClick={() => open("es")}>
                  <Plus />
                  {t.addMaterial}
                </button>
              }
            >
              {t.materials}
            </Title>
            <div className="deadline-list">
              {materials.map((x: any) => (
                <MaterialRow
                  key={x.id}
                  x={x}
                  company={co}
                  t={t}
                  toggle={() => {}}
                  focus={() => {}}
                />
              ))}
              {interviews.map((x: any) => (
                <InterviewRow key={x.id} x={x} company={co} t={t} />
              ))}
              {preps.map((x: any) => (
                <MaterialRow
                  key={x.id}
                  x={x}
                  company={co}
                  t={t}
                  toggle={() => {}}
                  focus={() => {}}
                />
              ))}
              {!materials.length && !interviews.length && !preps.length && (
                <Empty t={t} />
              )}
            </div>
          </section>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t.companies}</h1>
          <p>{t.subtitle}</p>
        </div>
        <button className="primary" onClick={() => open("company")}>
          <Plus />
          {t.addCompany}
        </button>
      </div>
      <div className="company-grid">
        {data.companies.length ? (
          data.companies.map((x: any) => (
            <button
              className="company-card entity-card"
              onClick={() => setSelected(x.id)}
              key={x.id}
            >
              <i style={{ background: x.color }} />
              <div>
                <span>{t[x.stage]}</span>
                <h3>{x.name}</h3>
                <p>
                  {x.industry} · {x.position}
                </p>
              </div>
              <ChevronRight />
            </button>
          ))
        ) : (
          <Empty t={t} kind="company" open={() => open("company")} />
        )}
      </div>
    </>
  );
}
function Schedule({
  t,
  schedules,
  setEditEvent,
  setForm,
  removeEvent,
  removeMaterial,
  removePrep,
  setEditPrep,
}: any) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t.schedule}</h1>
          <p>{t.scheduleSub}</p>
        </div>
        <button className="primary" onClick={() => setForm("schedule")}>
          <Plus />
          {t.addEvent}
        </button>
      </div>
      <div className="timeline">
        {schedules.length ? (
          schedules.map((x: any) => (
            <Swipe
              key={x.kind + x.id}
              remove={() =>
                x.kind === "event"
                  ? removeEvent(x.event)
                  : x.kind === "preparation"
                    ? removePrep(x.preparation)
                    : removeMaterial(x.material)
              }
            >
              <button
                className="timeline-row entity-card"
                onClick={() => {
                  if (x.kind === "event") {
                    setEditEvent(x.event);
                    setForm("schedule");
                  }
                  if (x.kind === "preparation") {
                    setEditPrep(x.preparation);
                    setForm("preparation");
                  }
                }}
              >
                <time>{when(x.at)}</time>
                <i style={{ background: x.company?.color || "#d18135" }} />
                <div>
                  <strong>{x.title}</strong>
                  <span>
                    {x.company?.name || t.general} · {t[x.type]}
                  </span>
                </div>
                <ChevronRight />
              </button>
            </Swipe>
          ))
        ) : (
          <Empty t={t} kind="schedule" open={() => setForm("schedule")} />
        )}
      </div>
    </>
  );
}
function Materials({
  t,
  data,
  byId,
  filter,
  setFilter,
  toggle,
  focusToggle,
  open,
  removeMaterial,
  removeInterview,
  removePrep,
  setEditInterview,
  setEditPrep,
}: any) {
  const materials = data.materials.filter(
      (x: any) =>
        filter === "all" ||
        (filter === "incomplete" && !x.completed) ||
        (filter === "completed" && x.completed) ||
        x.type === filter,
    ),
    interviews =
      filter === "all" || filter === "interview" ? data.interviews : [],
    preps = data.preparations.filter(
      (x: any) =>
        filter === "all" ||
        (filter === "incomplete" && !x.completed) ||
        (filter === "completed" && x.completed) ||
        x.type === filter,
    );
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t.materials}</h1>
          <p>{t.materialsSub}</p>
        </div>
        <button className="primary" onClick={() => open("es")}>
          <Plus />
          {t.new}
        </button>
      </div>
      <div className="filter-bar entity-card">
        {[
          "all",
          "incomplete",
          "completed",
          ...types,
          "es_fix",
          "interview_practice",
          "web_test_prep",
          "documents",
          "clothes",
          "route",
          "other",
        ].map((x) => (
          <button
            className={filter === x ? "active" : ""}
            onClick={() => setFilter(x)}
            key={x}
          >
            {t[x]}
          </button>
        ))}
      </div>
      <div className="deadline-list">
        {materials.map((x: any) => (
          <Swipe key={x.id} remove={() => removeMaterial(x)}>
            <MaterialRow
              x={x}
              company={byId[x.companyId]}
              t={t}
              toggle={toggle}
              focus={focusToggle}
            />
          </Swipe>
        ))}
        {interviews.map((x: any) => (
          <Swipe key={x.id} remove={() => removeInterview(x)}>
            <button
              className="plain-row"
              onClick={() => {
                setEditInterview(x);
                open("interview");
              }}
            >
              <InterviewRow x={x} company={byId[x.companyId]} t={t} />
            </button>
          </Swipe>
        ))}
        {preps.map((x: any) => (
          <Swipe key={x.id} remove={() => removePrep(x)}>
            <button
              className="plain-row"
              onClick={() => {
                setEditPrep(x);
                open("preparation");
              }}
            >
              <MaterialRow
                x={x}
                company={byId[x.companyId]}
                t={t}
                toggle={toggle}
                focus={() => {}}
              />
            </button>
          </Swipe>
        ))}
        {!materials.length && !interviews.length && !preps.length && (
          <Empty t={t} kind="materials" open={() => open("es")} />
        )}
      </div>
    </>
  );
}
function Swipe({
  children,
  remove,
}: {
  children: ReactNode;
  remove: () => void;
}) {
  const start = useRef(0);
  return (
    <div
      className="swipe-row"
      onTouchStart={(e) => (start.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (start.current - e.changedTouches[0].clientX > 70) remove();
      }}
    >
      {children}
    </div>
  );
}
function InterviewRow({
  x,
  company,
  t,
}: {
  x: InterviewRecord;
  company?: Company;
  t: any;
}) {
  return (
    <article className="task-row-card entity-card interview-card">
      <BriefcaseBusiness />
      <div>
        <h3>{x.round || t.interview}</h3>
        <p>
          {company?.name || t.general} · {x.format || t.online}
        </p>
      </div>
      <div className="task-due">
        <span>{x.interviewAt ? when(x.interviewAt) : "—"}</span>
        {x.result && <b>{x.result}</b>}
      </div>
    </article>
  );
}
function ActionMenu({
  t,
  view,
  close,
  open,
}: {
  t: any;
  view: View;
  close: () => void;
  open: (x: CreateType) => void;
}) {
  const [start, setStart] = useState(0),
    [closing, setClosing] = useState(false);
  const dismiss = () => {
    setClosing(true);
    setTimeout(close, 220);
  };
  const actions = createActions(t).filter(([kind]) => kind !== "preparation");
  const recent = localStorage.getItem("careerflow-last-create-type");
  const preferred = actions.findIndex(([kind]) => kind === recent);
  const ordered = [
    ...(preferred >= 0 ? [actions[preferred]] : []),
    ...actions.filter((_, index) => index !== preferred),
  ];
  return (
    <div className="bottom-sheet-layer">
      <button
        className={`sheet-backdrop ${closing ? "closing" : ""}`}
        onClick={dismiss}
        aria-label="Close"
      />
      <section
        className={`action-sheet ${closing ? "closing" : ""}`}
        onTouchStart={(e) => setStart(e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (e.changedTouches[0].clientY - start > 60) dismiss();
        }}
      >
        <div className="sheet-handle" />
        {ordered.map(([kind, Icon, label]) => (
          <button
            className="sheet-action"
            onClick={() => open(kind)}
            key={kind}
          >
            <Icon />
            <span>{label}</span>
            <ChevronRight />
          </button>
        ))}
        <div className="sheet-gap" />
        <button className="cancel-action" onClick={dismiss}>
          {t.cancel}
        </button>
      </section>
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);
  return (
    <div className="modal-layer">
      <button className="modal-backdrop" onClick={close} />
      <section className="drawer entity-card" role="dialog">
        <header>
          <h2>{title}</h2>
          <button onClick={close}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function CompanyForm({
  t,
  initial,
  close,
  save,
}: {
  t: any;
  initial?: Company;
  close: () => void;
  save: any;
}) {
  const colors = ["#555555", "#777777", "#d18135", "#d4534d", "#2d9b78", "#9a6b44", "#6e7d91", "#c04f8a"];
  const [color, setColor] = useState(initial?.color || colors[0]);
  return (
    <Modal title={initial ? t.edit : t.addCompany} close={close}>
      <form className="form-grid" onSubmit={save}>
        <label>
          <span>{t.company}</span>
          <input name="name" defaultValue={initial?.name} required />
        </label>
        <label>
          <span>{t.industry}</span>
          <input name="industry" defaultValue={initial?.industry} />
        </label>
        <label>
          <span>{t.position}</span>
          <input name="position" defaultValue={initial?.position} />
        </label>
        <label>
          <span>{t.interest}</span>
          <select name="interest" defaultValue={initial?.interestLevel || 3}>
            {[1, 2, 3, 4, 5].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.stage}</span>
          <select name="stage" defaultValue={initial?.stage || "saved"}>
            {stages.map((x) => (
              <option key={x} value={x}>
                {t[x]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.event}</span>
          <input
            name="event"
            type="datetime-local"
            defaultValue={initial?.nextEventAt}
          />
        </label>
        <label>
          <span>{t.place}</span>
          <input name="place" defaultValue={initial?.locationOrOnline} />
        </label>
        <label>
          <span>{t.url}</span>
          <input name="url" type="url" defaultValue={initial?.careersUrl} />
        </label>
        <label>
          <span>{t.language === "言語" ? "表示色" : t.language === "Language" ? "Display color" : "显示色"}</span>
          <input name="color" type="hidden" value={color} readOnly />
          <div className="color-swatches" role="radiogroup" aria-label={t.language === "言語" ? "表示色" : "Display color"}>
            {colors.map((value) => <button type="button" key={value} className={`color-swatch ${color === value ? "active" : ""}`} style={{ background: value }} aria-label={value} aria-pressed={color === value} onClick={() => setColor(value)}>{color === value && <Check />}</button>)}
          </div>
        </label>
        <label className="wide">
          <span>{t.notes}</span>
          <textarea name="notes" defaultValue={initial?.notes} />
        </label>
        <Actions t={t} close={close} />
      </form>
    </Modal>
  );
}
function MaterialForm({
  t,
  companies,
  close,
  save,
}: {
  t: any;
  companies: Company[];
  close: () => void;
  save: any;
}) {
  const ja = t.language === "言語";
  const en = t.language === "Language";
  const [documentType, setDocumentType] = useState("es");
  const [questions, setQuestions] = useState([{ question: "", answer: "" }]);
  const label = (zh: string, jp: string, eng: string) => ja ? jp : en ? eng : zh;
  const types = [
    ["es", "ES"], ["resume", "履歴書"], ["open_es", "OpenES"],
    ["transcript", "成績証明書"], ["graduation", "卒業見込証明書"],
    ["recommendation", "推薦状"], ["other", label("其他", "その他", "Other")],
  ];
  const statuses = [["not_started", label("未着手", "未着手", "Not started")], ["drafting", label("作成中", "作成中", "Drafting")], ["review", label("确认待ち", "確認待ち", "Review")], ["submitted", label("已提交", "提出済み", "Submitted")], ["returned", label("退回", "差し戻し", "Returned")]];
  const isContentDocument = ["es", "resume", "open_es"].includes(documentType);
  return (
    <Modal title={label("添加书类", "書類を追加", "Add document")} close={close}>
      <form className="form-grid document-form" onSubmit={save}>
        <label>
          <span>{label("关联企业", "企業", "Company")} *</span>
          <select name="company" required>
            <option value="">—</option>
            {companies.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{label("书类类型", "書類の種類", "Document type")} *</span>
          <select name="documentType" value={documentType} onChange={(e) => setDocumentType(e.target.value)} required>
            {types.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </label>
        <label>
          <span>{label("截止日期", "締切", "Deadline")} *</span>
          <input name="due" type="datetime-local" required />
        </label>
        <label>
          <span>{label("提交状态", "提出状況", "Submission status")} *</span>
          <select name="submissionStatus" defaultValue="not_started" required>
            {statuses.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </label>
        <label>
          <span>{label("提交日期", "提出日", "Submitted on")}</span>
          <input name="submittedAt" type="date" />
        </label>
        <label><span>{label("版本名称", "バージョン名", "Version name")}</span><input name="versionName" /></label>
        <label><span>{label("文件名", "ファイル名", "File name")}</span><input name="fileName" /></label>
        <label><span>{label("使用语言", "使用言語", "Language")}</span><input name="language" placeholder="日本語 / 中文 / English" /></label>
        <label><span>{label("字数限制", "文字数制限", "Character limit")}</span><input name="characterLimit" type="number" min="0" /></label>
        {isContentDocument && <>
          {[["motivation", label("志望动机", "志望動機", "Motivation")], ["selfPr", "自己PR"], ["gakuchika", "ガクチカ"], ["strengths", label("长处", "長所", "Strengths")], ["weaknesses", label("短处", "短所", "Weaknesses")], ["research", label("研究内容", "研究内容", "Research")]].map(([name, text]) => <label className="wide" key={name}><span>{text}</span><textarea name={name} /></label>)}
          <label className="wide"><span>{label("自定义设问与回答", "カスタム設問と回答", "Custom questions and answers")}</span>
            <input type="hidden" name="customQuestions" value={JSON.stringify(questions)} readOnly />
            <div className="document-question-list">{questions.map((q, index) => <div className="document-question" key={index}><input value={q.question} placeholder={label("问题", "設問", "Question")} onChange={(e) => setQuestions((all) => all.map((x, i) => i === index ? { ...x, question: e.target.value } : x))} /><textarea value={q.answer} placeholder={label("回答内容", "回答内容", "Answer")} onChange={(e) => setQuestions((all) => all.map((x, i) => i === index ? { ...x, answer: e.target.value } : x))} /></div>)}</div>
            <button type="button" className="text-button" onClick={() => setQuestions((all) => [...all, { question: "", answer: "" }])}>＋ {label("添加问题", "設問を追加", "Add question")}</button>
          </label>
        </>}
        <label><span>{label("结果", "結果", "Result")}</span><select name="result" defaultValue="undecided"><option value="undecided">{label("未定", "未定", "Undecided")}</option><option value="passed">{label("通过", "通過", "Passed")}</option><option value="failed">{label("不通过", "不通過", "Failed")}</option></select></label>
        <label><span>{label("结果通知日期", "結果通知日", "Result date")}</span><input name="resultAt" type="date" /></label>
        <label className="wide"><span>{label("修改要点", "修正ポイント", "Revision points")}</span><textarea name="revisionPoints" /></label>
        <label className="wide"><span>{t.notes}</span><textarea name="notes" /></label>
        <details className="wide document-advanced">
          <summary>{label("详细设置（可选）", "詳細設定（任意）", "Advanced settings")}</summary>
          <div className="document-advanced-fields">
            <label>
              <span>{label("优先度", "優先度", "Priority")}</span>
              <select name="priority" defaultValue="medium">
                <option value="low">{label("低", "低", "Low")}</option>
                <option value="medium">{label("中", "中", "Medium")}</option>
                <option value="high">{label("高", "高", "High")}</option>
              </select>
            </label>
            <label>
              <span>{label("标签", "タグ", "Tags")}</span>
              <input name="tags" placeholder={label("用逗号分隔多个标签", "カンマ区切りで入力", "Separate tags with commas")} />
            </label>
          </div>
          <p>{label("可选：优先度和标签用于整理书类，不影响提交状态。", "優先度とタグで書類を整理できます。", "Use priority and tags to organize documents.")}</p>
        </details>
        <Actions t={t} close={close} />
      </form>
    </Modal>
  );
}
function EventForm({
  t,
  companies,
  initial,
  close,
  save,
}: {
  t: any;
  companies: Company[];
  initial?: Event;
  close: () => void;
  save: any;
}) {
  return (
    <Modal title={initial ? t.edit : t.addEvent} close={close}>
      <form className="form-grid" onSubmit={save}>
        <label className="wide">
          <span>{t.fieldTitle}</span>
          <input
            name="title"
            defaultValue={initial?.title}
            required
          />
        </label>
        <label>
          <span>{t.company}</span>
          <select name="company" defaultValue={initial?.companyId}>
            <option value="">—</option>
            {companies.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.language === "言語" ? "種類" : t.language === "Language" ? "Type" : "类型"}</span>
          <select name="type" defaultValue={initial?.type || "interview"}>
            {types.map((x) => (
              <option key={x} value={x}>
                {t[x]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.stage}</span>
          <select name="stage" defaultValue={initial?.stage || "briefing"}>
            {stages.map((x) => (
              <option key={x} value={x}>
                {t[x]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.due}</span>
          <input
            name="startsAt"
            type="datetime-local"
            defaultValue={initial?.startsAt}
            required
          />
        </label>
        <label>
          <span>{t.place}</span>
          <input name="place" defaultValue={initial?.locationOrOnline} />
        </label>
        <label className="wide">
          <span>{t.notes}</span>
          <textarea name="notes" defaultValue={initial?.notes} />
        </label>
        <Actions t={t} close={close} />
      </form>
    </Modal>
  );
}
function InterviewForm({
  t,
  companies,
  initial,
  close,
  save,
}: {
  t: any;
  companies: Company[];
  initial?: InterviewRecord;
  close: () => void;
  save: any;
}) {
  return (
    <Modal title={initial ? t.edit : t.addInterview} close={close}>
      <form className="form-grid" onSubmit={save}>
        <label>
          <span>{t.company}</span>
          <select name="company" defaultValue={initial?.companyId}>
            <option value="">—</option>
            {companies.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.round}</span>
          <input
            name="round"
            defaultValue={initial?.round}
            required
          />
        </label>
        <label>
          <span>{t.interviewAt}</span>
          <input
            name="interviewAt"
            type="datetime-local"
            defaultValue={initial?.interviewAt}
            required
          />
        </label>
        <label>
          <span>{t.format}</span>
          <input name="format" defaultValue={initial?.format} />
        </label>
        <label>
          <span>{t.interviewers}</span>
          <input name="interviewers" defaultValue={initial?.interviewers} />
        </label>
        <label>
          <span>{t.score}</span>
          <select name="score" defaultValue={initial?.score || 3}>
            {[1, 2, 3, 4, 5].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="wide">
          <span>{t.questions}</span>
          <textarea name="questions" defaultValue={initial?.questions} />
        </label>
        <label className="wide">
          <span>{t.answers}</span>
          <textarea name="answers" defaultValue={initial?.answers} />
        </label>
        <label className="wide">
          <span>{t.feeling}</span>
          <textarea name="feeling" defaultValue={initial?.feeling} />
        </label>
        <label>
          <span>{t.result}</span>
          <input name="result" defaultValue={initial?.result} />
        </label>
        <label>
          <span>{t.improvements}</span>
          <input name="improvements" defaultValue={initial?.improvements} />
        </label>
        <label className="wide">
          <span>{t.notes}</span>
          <textarea name="notes" defaultValue={initial?.notes} />
        </label>
        <Actions t={t} close={close} />
      </form>
    </Modal>
  );
}
function PreparationForm({
  t,
  companies,
  initial,
  close,
  save,
}: {
  t: any;
  companies: Company[];
  initial?: Preparation;
  close: () => void;
  save: any;
}) {
  const prepTypes: PrepType[] = [
    "research",
    "es_fix",
    "interview_practice",
    "web_test_prep",
    "documents",
    "clothes",
    "route",
    "other",
  ];
  return (
    <Modal title={initial ? t.edit : t.addPrep} close={close}>
      <form className="form-grid" onSubmit={save}>
        <label className="wide">
          <span>{t.fieldTitle}</span>
          <input
            name="title"
            defaultValue={initial?.title}
            required
          />
        </label>
        <label>
          <span>{t.company}</span>
          <select name="company" defaultValue={initial?.companyId}>
            <option value="">—</option>
            {companies.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.prepType}</span>
          <select name="type" defaultValue={initial?.type || "research"}>
            {prepTypes.map((x) => (
              <option key={x} value={x}>
                {t[x]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.due}</span>
          <input
            name="due"
            type="datetime-local"
            defaultValue={initial?.dueAt}
          />
        </label>
        <label>
          <span>{t.priority}</span>
          <select name="priority" defaultValue={initial?.priority || "medium"}>
            {(["high", "medium", "low"] as Priority[]).map((x) => (
              <option key={x} value={x}>
                {t[x]}
              </option>
            ))}
          </select>
        </label>
        <label className="check-label">
          <input
            name="completed"
            type="checkbox"
            defaultChecked={initial?.completed}
          />
          <span>{t.completed}</span>
        </label>
        <label className="wide">
          <span>{t.notes}</span>
          <textarea name="notes" defaultValue={initial?.notes} />
        </label>
        <Actions t={t} close={close} />
      </form>
    </Modal>
  );
}
function Actions({ t, close }: { t: any; close: () => void }) {
  return (
    <div className="form-actions wide">
      <button type="button" onClick={close}>
        {t.cancel}
      </button>
      <button className="primary">{t.save}</button>
    </div>
  );
}
function Confirm({
  t,
  company,
  close,
  remove,
}: {
  t: any;
  company: Company;
  close: () => void;
  remove: (x: Company, all: boolean) => void;
}) {
  return (
    <Modal title={t.deleteCompany} close={close}>
      <p className="confirm-copy">{t.deleteQuestion}</p>
      <div className="confirm-actions">
        <button className="danger-button" onClick={() => remove(company, true)}>
          {t.deleteAll}
        </button>
        <button onClick={() => remove(company, false)}>{t.deleteOnly}</button>
        <button onClick={close}>{t.cancel}</button>
      </div>
    </Modal>
  );
}
function Toast({
  t,
  toast,
  close,
}: {
  t: any;
  toast: { text: string; undo: () => void };
  close: () => void;
}) {
  return (
    <div className="toast">
      {toast.text}
      <button
        onClick={() => {
          toast.undo();
          close();
        }}
      >
        {t.undo}
      </button>
    </div>
  );
}
function BackupControls({ t, data, theme, locale, setData, download }: any) {
  const [items, setItems] = useState<BackupSnapshot[]>([]);
  const [error, setError] = useState("");
  const [lastExport, setLastExport] = useState<number>(() => Number(localStorage.getItem("careerflow-last-export") || 0));
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => listBackups().then(setItems).catch(() => setError("备份列表读取失败"));
  useEffect(() => { refresh(); }, []);
  const snapshot = (): BackupSnapshot => ({ schemaVersion: data.schemaVersion, createdAt: Date.now(), companies: data.companies, schedules: data.events, resources: data.materials, interviews: data.interviews, preparations: data.preparations, selectionRecords: data.companies.map((x: Company) => ({ id: x.id, stage: x.stage, updatedAt: x.updatedAt })), settings: { theme, locale } });
  const backupNow = async () => { try { await createBackup(snapshot()); await refresh(); } catch { setError("备份创建失败，原数据未改变"); } };
  const restore = async (item: BackupSnapshot) => { try { if (!item || !Array.isArray(item.companies) || !Array.isArray(item.schedules) || !Array.isArray(item.resources) || !Array.isArray(item.interviews) || !Array.isArray(item.preparations)) throw new Error(); await createBackup(snapshot()); setData(normalize({ schemaVersion: 5, companies: item.companies, events: item.schedules, materials: item.resources, interviews: item.interviews, preparations: item.preparations, focusMinutes: data.focusMinutes })); } catch { setError("备份结构无效，原数据未改变"); } };
  const exportCloud = async () => {
    const now = new Date();
    const pad = (x: number) => String(x).padStart(2, "0");
    const name = `careerflow-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
    const contents = JSON.stringify({ ...snapshot(), exportedAt: Date.now() }, null, 2);
    const backupFile = new File([contents], name, { type: "application/json" });
    const userAgent = navigator.userAgent || "";
    // macOS Safari may expose navigator.share, but it is still a desktop
    // browser. Only touch-capable iPadOS using the desktop-style UA qualifies.
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) ||
      (/Macintosh/.test(userAgent) && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    try {
      if (isIOS && navigator.share && navigator.canShare?.({ files: [backupFile] })) {
        await navigator.share({ files: [backupFile], title: "CareerFlow Backup" });
      } else {
        const blobUrl = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = name;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }
      const timestamp = Date.now();
      localStorage.setItem("careerflow-last-export", String(timestamp));
      setLastExport(timestamp);
      setError(locale === "ja" ? (isIOS ? "ファイルに保存を選択してください" : "バックアップファイルを生成しました") : locale === "en" ? "Backup file generated" : "备份文件已生成");
    } catch (e) {
      if ((e as DOMException).name !== "AbortError") setError(locale === "ja" ? "書き出しに失敗しました" : locale === "en" ? "Export failed" : "导出失败");
    }
  };
  const restoreFile = (e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = async () => { try { const x = JSON.parse(String(reader.result)); if (x.schemaVersion !== 5 || !Array.isArray(x.companies) || !Array.isArray(x.schedules) || !Array.isArray(x.resources) || !Array.isArray(x.interviews) || !Array.isArray(x.preparations)) throw new Error(); await createBackup(snapshot()); setData(normalize({ schemaVersion: 5, companies: x.companies, events: x.schedules, materials: x.resources, interviews: x.interviews, preparations: x.preparations, focusMinutes: data.focusMinutes })); setError(`${x.companies.length} 企业、${x.schedules.length} 日程、${x.resources.length} 资料已恢复`); } catch { setError("JSON 结构无效，原数据未改变"); } }; reader.readAsText(file); e.currentTarget.value = ""; };
  const days = lastExport ? Math.floor((Date.now() - lastExport) / 864e5) : null;
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent || "") || (/Macintosh/.test(navigator.userAgent || "") && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const labels = locale === "ja" ? {area:"データとバックアップ", notice:"データは主にこのデバイスに保存されます。定期的に書き出してください。", storage:"このデバイスの保存状況", version:"データベースバージョン", cloud:"クラウドへの書き出しと復元", local:"自動バックアップ", exportCloud:isIOSDevice ? "iCloud Drive に書き出す" : "バックアップファイルをダウンロード", restoreFile:"バックアップファイルから復元", permission:isIOSDevice ? "ファイルに保存を選択して iCloud Drive に保存してください。" : "ダウンロードしたファイルは、Finder から iCloud Drive に移動できます。", last:"前回の書き出し", never:"まだ完全バックアップを書き出していません", now:"今すぐローカルバックアップを作成", restore:"復元", remove:"削除", confirm:"このバックアップを削除しますか？", warning:"前回の書き出しから7日以上経過しています。"} : locale === "en" ? {area:"Data & backups", notice:"Your data is mainly stored on this device. Export a backup regularly.", storage:"Device storage", version:"Database version", cloud:"Cloud export and restore", local:"Automatic backups", exportCloud:isIOSDevice ? "Export to iCloud Drive" : "Download backup file", restoreFile:"Restore from backup file", permission:isIOSDevice ? "Choose Save to Files, then select iCloud Drive." : "After downloading, move the file to iCloud Drive in Finder.", last:"Last export", never:"No complete backup has been exported", now:"Create local backup now", restore:"Restore", remove:"Delete", confirm:"Delete this backup?", warning:"It has been more than 7 days since the last export."} : {area:"数据与备份", notice:"数据主要保存在当前设备，请定期导出完整备份。", storage:"当前设备存储", version:"数据库版本", cloud:"云端导出与恢复", local:"本地自动备份", exportCloud:isIOSDevice ? "导出到 iCloud Drive" : "下载备份文件", restoreFile:"从备份文件恢复", permission:isIOSDevice ? "请选择“存储到文件”，再选择 iCloud Drive。" : "下载后可在 Finder 中将文件移动到 iCloud Drive。", last:"上次导出", never:"尚未导出完整备份", now:"立即创建本地备份", restore:"恢复", remove:"删除", confirm:"确定删除此备份吗？", warning:"距离上次导出已超过 7 天。"};
  return <section className="backup-panel"><section><h3>{labels.storage}</h3><p>{labels.version}: v{data.schemaVersion}</p><div className="backup-meta"><span>{data.companies.length} {locale === "ja" ? "企業" : locale === "en" ? "companies" : "企业"} · {data.events.length} {locale === "ja" ? "日程" : locale === "en" ? "schedules" : "日程"}</span><span>{data.materials.length} {locale === "ja" ? "資料" : locale === "en" ? "resources" : "资料"} · {data.interviews.length} {locale === "ja" ? "面接記録" : locale === "en" ? "interviews" : "面试记录"} · {data.preparations.length} {locale === "ja" ? "準備事項" : locale === "en" ? "preparations" : "准备事项"}</span></div></section><section><h3>{labels.cloud}</h3><div className="backup-cloud-actions"><button className="primary" onClick={exportCloud}>{labels.exportCloud}</button><button onClick={() => fileRef.current?.click()}>{labels.restoreFile}</button></div><p>{labels.permission}</p><p>{lastExport ? `${labels.last}: ${new Date(lastExport).toLocaleDateString()} (${days} ${locale === "ja" ? "日前" : locale === "en" ? "days ago" : "天前"})` : labels.never}</p>{days !== null && days > 7 && <p className="backup-warning">{labels.warning}</p>}</section><section><h3>{labels.local}</h3><div className="backup-meta"><span>{items.length}/5</span><span>{items[0] ? new Date(items[0].createdAt).toLocaleString() : labels.never}</span></div><button className="primary" onClick={backupNow}>{labels.now}</button>{error&&<p className="backup-error">{error}</p>}<input hidden ref={fileRef} type="file" accept="application/json,.json" onChange={restoreFile}/><div className="backup-list">{items.map((x)=><div key={x.createdAt}><span>{new Date(x.createdAt).toLocaleString()}</span><button onClick={()=>restore(x)}>{labels.restore}</button><button onClick={()=>{if(window.confirm(labels.confirm)) deleteBackup(x.createdAt).then(refresh)}}>{labels.remove}</button></div>)}</div></section></section>;
}
function SettingsDrawer({ close, children, title }: { close: () => void; children: ReactNode; title: string }) {
  const [closing, setClosing] = useState(false);
  const startX = useRef<number | null>(null);
  const dismiss = () => { if (closing) return; setClosing(true); window.setTimeout(close, 260); };
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); }; document.addEventListener("keydown", onKey); document.body.classList.add("settings-drawer-open"); return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("settings-drawer-open"); }; }, []);
  return <div className={`settings-drawer-layer ${closing ? "closing" : ""}`}><button className="settings-drawer-backdrop" onClick={dismiss} aria-label="Close settings"/><aside className="settings-drawer-panel" role="dialog" aria-modal="true" aria-label={title} onTouchStart={(e) => { startX.current = e.touches[0].clientX; }} onTouchEnd={(e) => { if (startX.current !== null && e.changedTouches[0].clientX - startX.current > 70) dismiss(); startX.current = null; }}><header><h2>{title}</h2><button className="settings-close-button" onClick={dismiss} aria-label="Close settings"><X /></button></header><div className="settings-drawer-scroll">{children}</div></aside></div>;
}
function SettingsPanel({
  t,
  theme,
  setTheme,
  locale,
  setLocale,
  close,
  data,
  setData,
  icon,
  csv,
  json,
  iconRef,
  importCsv,
  importJson,
  upload,
  download,
}: any) {
  return (
    <SettingsDrawer title={t.settings} close={close}>
      <div className="settings-content">
        <BackupControls t={t} data={data} theme={theme} locale={locale} setData={setData} download={download} />
        <span>{t.appearance}</span>
        <div className="choice-row">
          {(["light", "dark", "system"] as Theme[]).map((x) => (
            <button
              className={theme === x ? "active" : ""}
              onClick={() => setTheme(x)}
              key={x}
            >
              {t[x]}
            </button>
          ))}
        </div>
        <span>{t.language}</span>
        <div className="choice-row">
          {(["zh", "ja", "en"] as Locale[]).map((x) => (
            <button
              className={locale === x ? "active" : ""}
              onClick={() => setLocale(x)}
              key={x}
            >
              {x === "zh" ? "中文" : x === "ja" ? "日本語" : "English"}
            </button>
          ))}
        </div>
        <span>{t.data}</span>
        <div className="settings-actions">
          <button onClick={() => csv.current?.click()}>
            <Upload />
            {t.importCsv}
          </button>
          <button
            onClick={() =>
              download(
                "careerflow-materials.csv",
                Papa.unparse(
                  data.materials.map((x: any) => ({
                    ...x,
                    tags: x.tags.join("|"),
                  })),
                ),
                "text/csv",
              )
            }
          >
            <Download />
            {t.exportCsv}
          </button>
          <button onClick={() => json.current?.click()}>
            <FileJson />
            {t.restore}
          </button>
          <button
            onClick={() =>
              download(
                "careerflow-backup.json",
                JSON.stringify(data, null, 2),
                "application/json",
              )
            }
          >
            <Download />
            {t.backup}
          </button>
          <button
            onClick={() =>
              setData((d: Data) => ({
                ...d,
                companies: d.companies.filter(
                  (x) =>
                    !x.tags.includes("sample") && !demoNames.includes(x.name),
                ),
                materials: d.materials.filter(
                  (x) => !x.tags.includes("sample"),
                ),
                events: d.events.filter((x) => !x.notes.includes("sample")),
                interviews: d.interviews.filter(
                  (x) => !x.notes.includes("sample"),
                ),
                preparations: d.preparations.filter(
                  (x) => !x.notes.includes("sample"),
                ),
              }))
            }
          >
            <Trash2 />
            {t.clearDemo}
          </button>
          <button onClick={() => iconRef.current?.click()}>
            <BriefcaseBusiness />
            {t.icon}
          </button>
        </div>
        <input
          hidden
          ref={csv}
          type="file"
          accept=".csv"
          onChange={importCsv}
        />
        <input
          hidden
          ref={json}
          type="file"
          accept=".json"
          onChange={importJson}
        />
        <input
          hidden
          ref={iconRef}
          type="file"
          accept="image/*"
          onChange={upload}
        />
      </div>
    </SettingsDrawer>
  );
}
