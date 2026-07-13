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
import { createBackup, type BackupSnapshot } from "./backups";
import { getWeather, getWeatherByCoordinates, type WeatherResult } from "./weather";
import prefectureData from "./data/japan-prefectures.json";
import municipalityData from "./data/japan-municipalities.json";

import {
  Database,
  DatabaseArrowDown,
  DatabaseArrowUp,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock3,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudSun,
  ExternalLink,
  FileJson,
  Globe,
  Home,
  MoreHorizontal,
  Menu,
  Monitor,
  Moon,
  Palette,
  Plus,
  Settings,
  Info,
  Search,
  Sun,
  SlidersHorizontal,
  Target,
  Timer,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type View = "dashboard" | "companies" | "schedule" | "materials";
type Theme = "light" | "dark" | "system";
type Locale = "zh" | "ja";
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
  category?: "material";
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
  documentType?: "es" | "resume" | "other_document" | "open_es" | "transcript" | "graduation" | "recommendation" | "other";
  submissionStatus?: "not_started" | "drafting" | "submitted" | "review" | "returned";
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
  question?: string;
  answer?: string;
  saveMode?: "upload" | "text";
  attachmentId?: string;
  mimeType?: string;
  fileSize?: number;
};
type Event = {
  id: string;
  companyId?: string;
  title: string;
  type: ItemType;
  stage: Stage;
  startsAt: string;
  locationOrOnline: string;
  eventMode?: "offline" | "online" | "undecided";
  isOnline?: boolean;
  location?: string;
  onlinePlatform?: string;
  meetingUrl?: string;
  attendanceMode?: "offline" | "online" | "undecided";
  prefecture?: string;
  city?: string;
  municipality?: string;
  municipalityCode?: string;
  detailLocation?: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  notes: string;
  createdAt: number;
};
type InterviewRecord = {
  category?: "interview";
  roundCode?: string;
  id: string;
  companyId?: string;
  round: string;
  interviewAt: string;
  format: string;
  participationMode?: string;
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
  category?: "preparation";
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

function makeBackupSnapshot(data: Data, theme: Theme, locale: Locale): BackupSnapshot {
  return {
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
}

function parseBackupPayload(value: unknown): { data: ReturnType<typeof normalize>; counts: { companies: number; schedules: number; materials: number; interviews: number; preparations: number } } {
  if (!value || typeof value !== "object") throw new Error("backup must be an object");
  const x = value as Record<string, unknown>;
  const version = x.schemaVersion;
  if (!(version === 5 || version === "5" || version === "v5")) throw new Error("schemaVersion must be 5");
  const array = (names: string[], required = false): unknown[] => {
    const found = names.find((name) => Array.isArray(x[name]));
    if (!found && required) throw new Error(`missing ${names.join(" or ")}`);
    return found ? x[found] as unknown[] : [];
  };
  const companies = array(["companies"], true);
  const events = array(["events", "schedules"]);
  const materials = array(["materials", "resources", "documents"]);
  const interviews = array(["interviews", "interviewRecords"]);
  const preparations = array(["preparations", "preparationItems"]);
  const data = normalize({ schemaVersion: 5, companies, events, materials, interviews, preparations, focusMinutes: 0 });
  return { data, counts: { companies: companies.length, schedules: events.length, materials: materials.length, interviews: interviews.length, preparations: preparations.length } };
}
const KEY = "career-flow-data-v5",
  OLD = "career-flow-data-v4",
  BACKUP = "career-flow-pre-v5-backup",
  CLEAN = "career-flow-demo-cleaned-v1",
  THEME = "careerflow-theme",
  LOCALE = "careerflow-locale",
  ICON = "careerflow-custom-icon";
const demoNames = ["Rakuten Group", "三菱UFJ银行", "CyberAgent"];
const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const ATTACHMENT_DB = "careerflow-attachments";
const ATTACHMENT_STORE = "files";
function attachmentDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ATTACHMENT_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(ATTACHMENT_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveAttachment(key: string, file: File) {
  const db = await attachmentDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE, "readwrite");
    tx.objectStore(ATTACHMENT_STORE).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function deleteAttachment(key?: string) {
  if (!key) return;
  const db = await attachmentDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE, "readwrite");
    tx.objectStore(ATTACHMENT_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
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
const prefectures = prefectureData as string[];
const cityOptions = Object.fromEntries(Object.entries(municipalityData).map(([prefecture, municipalities]) => [prefecture, (municipalities as { name: string }[]).map((x) => x.name)])) as Record<string, string[]>;
const locationCoordinates: Record<string, [number, number]> = { "東京都渋谷区": [35.6618, 139.7041], "東京都新宿区": [35.6938, 139.7034], "東京都豊島区": [35.7263, 139.7169], "東京都千代田区": [35.6938, 139.7532], "東京都港区": [35.6581, 139.7516], "大阪府大阪市": [34.6937, 135.5023], "神奈川県横浜市": [35.4437, 139.638], "埼玉県さいたま市": [35.8617, 139.6455], "千葉県千葉市": [35.6073, 140.1063] };
const funnelStages: FunnelStage[] = ["funnelInterested", "funnelDocuments", "funnelAptitude", "funnelInterview", "funnelFinal", "funnelOffer"];
type FunnelStage = "funnelInterested" | "funnelDocuments" | "funnelAptitude" | "funnelInterview" | "funnelFinal" | "funnelOffer";
function funnelStageFor(stage: Company["stage"]): FunnelStage | null {
  const value = String(stage).trim().toLowerCase();
  if (["offer", "内定", "offer received"].includes(value)) return "funnelOffer";
  if (["final_interview", "final selection", "final interview", "最终选考", "最終選考"].includes(value)) return "funnelFinal";
  if (["first_interview", "second_interview", "third_interview", "group_interview", "interview", "面试", "一次面试", "二次面试", "三次面试", "小组面试", "面谈", "面接中", "面接", "interviewing"].includes(value)) return "funnelInterview";
  if (["web_test", "spi", "玉手箱", "cab", "gab", "aptitude test", "适性検査", "适性检査", "web / aptitude test", "web・适性测试", "web・適性検査"].includes(value)) return "funnelAptitude";
  if (["es_draft", "es_submitted", "resume", "document screening", "书类选考", "書類選考", "材料选考", "document_screening", "es"].includes(value)) return "funnelDocuments";
  if (["saved", "briefing", "interested", "关注中", "気になる"].includes(value)) return "funnelInterested";
  return null;
}
const tr = {
  zh: {
    dashboard: "主页",
    companies: "企业",
    schedule: "日程",
    materials: "ES・面试",
    selectionRecords: "选考记录",
    addRecord: "添加记录",
    addTest: "添加 Web・适性测试",
    addBriefing: "添加说明会",
    addOtherRecord: "添加其他记录",
    materialCategory: "材料",
    interviewCategory: "面试记录",
    preparationCategory: "准备事项",
    recruitmentPage: "招聘页面",
    displayColor: "显示色",
    settings: "设置",
    new: "新建",
    title: "就活摘要",
    fieldTitle: "标题",
    subtitle: "日本就活进度与材料管理",
    addCompany: "新增企业",
    addEvent: "新增日程",
    addMaterial: "添加材料",
    addInterview: "新增面试记录",
    addPrep: "新增准备事项",
    deleteEventTitle: "删除此日程？",
    deleteEventDescription: "删除后无法恢复。",
    deleteAction: "删除",
    deleteEventAction: "删除日程",
    untitledSchedule: "未命名日程",
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
    funnelInterested: "关注中",
    funnelDocuments: "材料选考",
    funnelAptitude: "Web・适性测试",
    funnelInterview: "面试中",
    funnelFinal: "最终选考",
    funnelOffer: "内定",
    company: "企业",
    industry: "行业",
    position: "职位",
    interest: "志望度",
    stage: "当前选考阶段",
    event: "下一项日程",
    place: "地点或线上方式",
    url: "招聘页面",
    notes: "备注",
    saved: "关注中",
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
    backup: "导出备份",
    restore: "恢复备份",
    data: "数据管理",
    icon: "自定义图标",
    online: "线上",
    noData: "暂无事项",
    noSchedule: "暂无日程",
    deleteCompany: "删除企业",
    deleteQuestion: "是否同时删除该企业关联的日程、资料和选考记录？",
    deleteAll: "同时删除关联数据",
    deleteOnly: "仅删除企业",
    undo: "撤销",
    materialsSub: "材料、面试记录与准备事项",
    scheduleSub: "说明会、笔试、面试与截止时间",
  },
  ja: {
    dashboard: "ホーム",
    companies: "企業",
    schedule: "日程",
    materials: "ES・面接",
    selectionRecords: "選考記録",
    addRecord: "記録を追加",
    addTest: "Web・適性検査を追加",
    addBriefing: "説明会を追加",
    addOtherRecord: "その他の記録を追加",
    materialCategory: "書類",
    interviewCategory: "面接記録",
    preparationCategory: "準備事項",
    recruitmentPage: "採用ページ",
    displayColor: "表示色",
    settings: "設定",
    new: "新規作成",
    title: "就活サマリー",
    fieldTitle: "タイトル",
    subtitle: "日本就活進捗・書類管理",
    addCompany: "企業を追加",
    addEvent: "日程を追加",
    addMaterial: "書類を追加",
    addInterview: "面接記録を追加",
    addPrep: "準備事項を追加",
    deleteEventTitle: "この日程を削除しますか？",
    deleteEventDescription: "削除すると元に戻せません。",
    deleteAction: "削除",
    deleteEventAction: "日程を削除",
    untitledSchedule: "無題の日程",
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
    funnelInterested: "気になる",
    funnelDocuments: "書類選考",
    funnelAptitude: "Web・適性検査",
    funnelInterview: "面接中",
    funnelFinal: "最終選考",
    funnelOffer: "内定",
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
    backup: "バックアップを書き出す",
    restore: "バックアップを復元",
    data: "データ",
    icon: "アイコン",
    online: "オンライン",
    noData: "予定なし",
    noSchedule: "日程なし",
    deleteCompany: "企業を削除",
    deleteQuestion: "関連する日程、資料、選考記録も削除しますか？",
    deleteAll: "関連データも削除",
    deleteOnly: "企業のみ削除",
    undo: "元に戻す",
    materialsSub: "書類・面接記録・準備事項",
    scheduleSub: "説明会・筆記・面接・締切",
  },
  en: {
    dashboard: "Home",
    companies: "Companies",
    schedule: "Schedule",
    materials: "ES · Interview",
    selectionRecords: "Selection Records",
    addRecord: "Add Record",
    addTest: "Add Web / Aptitude Test",
    addBriefing: "Add briefing",
    addOtherRecord: "Add other record",
    materialCategory: "Documents",
    interviewCategory: "Interview records",
    preparationCategory: "Preparations",
    recruitmentPage: "Recruitment Page",
    displayColor: "Display Color",
    settings: "Settings",
    new: "New",
    title: "Career summary",
    fieldTitle: "Title",
    subtitle: "Japan job search progress and materials",
    addCompany: "Add company",
    addEvent: "Add event",
    addMaterial: "Add document",
    addInterview: "Add interview record",
    addPrep: "Add preparation",
    deleteEventTitle: "Delete this schedule?",
    deleteEventDescription: "This cannot be undone.",
    deleteAction: "Delete",
    deleteEventAction: "Delete schedule",
    untitledSchedule: "Untitled schedule",
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
    funnelInterested: "Interested",
    funnelDocuments: "Document Screening",
    funnelAptitude: "Web / Aptitude Test",
    funnelInterview: "Interviewing",
    funnelFinal: "Final Selection",
    funnelOffer: "Offer",
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
    backup: "Export complete backup",
    restore: "Restore from backup",
    data: "Data",
    icon: "Custom icon",
    online: "Online",
    noData: "Nothing here",
    noSchedule: "No schedule",
    deleteCompany: "Delete company",
    deleteQuestion:
      "Also delete related events, materials and application records?",
    deleteAll: "Delete related data",
    deleteOnly: "Delete company only",
    undo: "Undo",
    materialsSub: "Documents, interview records and preparations",
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
    materials: (x.materials || []).map((m: Material) => ({
      ...m,
      category: "material",
      submissionStatus:
        m.submissionStatus === "review" || m.submissionStatus === "returned"
          ? "drafting"
          : m.submissionStatus,
      documentType: ["open_es", "transcript", "graduation", "recommendation", "other"].includes(m.documentType || "")
        ? "other_document"
        : m.documentType,
    })),
    events: (x.events || []).map((event: Event) => {
      const legacy = String(event.locationOrOnline || "");
      const mode = event.eventMode || (event.isOnline === true ? "online" : event.isOnline === false && (event.location || legacy) ? "offline" : event.location ? "offline" : event.meetingUrl || event.onlinePlatform || /zoom|teams|meet|online|オンライン|线上|https?:\/\//i.test(legacy) ? "online" : "undecided");
      const locationLabel = event.locationLabel || event.location || legacy;
      const prefecture = event.prefecture || prefectures.find((value) => locationLabel.includes(value));
      const city = event.city || (prefecture && cityOptions[prefecture]?.find((value) => locationLabel.includes(value)));
      const coords = event.latitude && event.longitude ? [event.latitude, event.longitude] : locationCoordinates[`${prefecture || ""}${city || ""}`];
      return { ...event, eventMode: mode, attendanceMode: event.attendanceMode || mode, prefecture, city, municipality: event.municipality || city, municipalityCode: event.municipalityCode, detailLocation: event.detailLocation || (city ? locationLabel.replace(prefecture || "", "").replace(city, "").replace(/^・/, "") : ""), location: event.location || legacy, locationLabel, latitude: coords?.[0], longitude: coords?.[1], onlinePlatform: event.onlinePlatform || (mode === "online" ? legacy : ""), meetingUrl: event.meetingUrl || (/https?:\/\//i.test(legacy) ? legacy : "") };
    }),
    interviews: (x.interviews || []).map((v: InterviewRecord) => ({ ...v, category: "interview" })),
    preparations: (x.preparations || []).map((v: Preparation) => ({ ...v, category: "preparation" })),
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
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export default function App() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [data, setData] = useState<Data>(load);
  const [view, setView] = useState<View>("dashboard"),
    [theme, setTheme] = useState<Theme>(
      () => (localStorage.getItem(THEME) as Theme) || "system",
    ),
    [locale, setLocale] = useState<Locale>(() => {
      const saved = localStorage.getItem(LOCALE);
      return saved === "ja" ? "ja" : "zh";
    }),
    [menu, setMenu] = useState(false),
    [desktopMenu, setDesktopMenu] = useState(false),
    [settings, setSettings] = useState(false),
    [mobileSettingsPage, setMobileSettingsPage] = useState<string | null>(null),
    [selectedDrawerItem, setSelectedDrawerItem] = useState<string | null>(null),
    [form, setForm] = useState<CreateType | null>(null),
    [editCompany, setEditCompany] = useState<Company>(),
    [editEvent, setEditEvent] = useState<Event>(),
    [editInterview, setEditInterview] = useState<InterviewRecord>(),
    [editPrep, setEditPrep] = useState<Preparation>(),
    [selected, setSelected] = useState<string>(),
    [companiesCollapsed, setCompaniesCollapsed] = useState(() => localStorage.getItem("careerflow-companies-collapsed") === "true"),
    [confirm, setConfirm] = useState<Company>(),
    [deleteEvent, setDeleteEvent] = useState<Event>(),
    [filter, setFilter] = useState("all"),
    [toast, setToast] = useState<{ text: string; undo: () => void }>(),
    [icon, setIcon] = useState(() => localStorage.getItem(ICON) || "");
  const json = useRef<HTMLInputElement>(null),
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
    createBackup(snapshot).catch(() => setToast({ text: locale === "ja" ? "自動バックアップに失敗しました" : "自动备份失败", undo: () => undefined }));
  }, [data, locale, theme]);
  useEffect(() => localStorage.setItem(LOCALE, locale), [locale]);
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme:dark)");
    const f = () =>
      document.documentElement.dataset.theme = theme === "dark" || (theme === "system" && m.matches) ? "dark" : "light";
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
      title: scheduleDisplayTitle(x.title, x.type, t),
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
    deleteAttachment(x.attachmentId).catch(() => undefined);
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
  const confirmRemoveEvent = () => {
    if (!deleteEvent) return;
    removeEvent(deleteEvent);
    setDeleteEvent(undefined);
    setForm(null);
    setEditEvent(undefined);
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
  const saveMaterial = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      file = f.get("attachment") instanceof File && (f.get("attachment") as File).size ? f.get("attachment") as File : undefined,
      attachmentId = file ? id() : undefined,
      v: Material = {
        category: "material",
        id: id(),
        title: String(f.get("versionName") || file?.name || (f.get("documentType") === "other_document" ? f.get("otherType") : f.get("documentType")) || "材料"),
        companyId: String(f.get("company") || "") || undefined,
        type: "es",
        dueAt: String(f.get("due") || "") || undefined,
        priority: (f.get("priority") || "medium") as Priority,
        tags: String(f.get("tags") || "")
          .split(/[，,\n]+/)
          .map((tag) => tag.trim())
          .filter(Boolean),
        notes: String(f.get("notes") || ""),
        completed: false,
        isWeeklyFocus: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        documentType: (f.get("documentType") === "other_document" ? f.get("otherType") : f.get("documentType")) as Material["documentType"],
        submissionStatus: f.get("submissionStatus") as Material["submissionStatus"],
        submittedAt: String(f.get("submittedAt") || "") || undefined,
        versionName: String(f.get("versionName") || "") || undefined,
        fileName: file?.name || String(f.get("fileName") || "") || undefined,
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
        question: String(f.get("question") || "") || undefined,
        answer: String(f.get("answer") || "") || undefined,
        saveMode: String(f.get("saveMode") || "text") as Material["saveMode"],
        attachmentId,
        mimeType: file?.type,
        fileSize: file?.size,
      };
    if (file && attachmentId) await saveAttachment(attachmentId, file);
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
        title: String(f.get("type")),
        type: f.get("type") as ItemType,
        stage: f.get("stage") as Stage,
        startsAt: String(f.get("startsAt")),
        locationOrOnline: String(f.get("location") || f.get("onlinePlatform") || base?.locationOrOnline || ""),
        eventMode: String(f.get("eventMode") || base?.eventMode || "undecided") as Event["eventMode"],
        location: String(f.get("location") || base?.location || ""),
        onlinePlatform: String(f.get("onlinePlatform") || base?.onlinePlatform || ""),
        meetingUrl: String(f.get("meetingUrl") || base?.meetingUrl || ""),
        attendanceMode: String(f.get("eventMode") || base?.eventMode || "undecided") as Event["attendanceMode"],
        prefecture: String(f.get("prefecture") || base?.prefecture || "") || undefined,
        city: String(f.get("city") || base?.city || "") || undefined,
        municipality: String(f.get("city") || base?.municipality || base?.city || "") || undefined,
        municipalityCode: String(f.get("city") || base?.municipalityCode || "") || undefined,
        detailLocation: String(f.get("detailLocation") || base?.detailLocation || ""),
        locationLabel: String(f.get("manualLocation") || "") || [String(f.get("prefecture") || base?.prefecture || ""), String(f.get("city") || base?.city || ""), String(f.get("detailLocation") || base?.detailLocation || "")].filter(Boolean).join(" "),
        latitude: locationCoordinates[`${String(f.get("prefecture") || base?.prefecture || "")}${String(f.get("city") || base?.city || "")}`]?.[0],
        longitude: locationCoordinates[`${String(f.get("prefecture") || base?.prefecture || "")}${String(f.get("city") || base?.city || "")}`]?.[1],
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
        category: "interview",
        id: base?.id || id(),
        companyId: String(f.get("company") || "") || undefined,
        round: String(f.get("round")),
        roundCode: String(f.get("roundCode") || "other"),
        interviewAt: String(f.get("interviewAt")),
        format: String(f.get("format")),
        participationMode: String(f.get("participationMode") || "undecided"),
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
        category: "preparation",
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
    const input = e.currentTarget;
    const f = e.target.files?.[0];
    if (!f) return;
    const confirmed = window.confirm(locale === "ja" ? "バックアップを復元すると、このデバイスの現在のデータが上書きされます。続行しますか？" : "恢复备份将覆盖当前设备中的数据，是否继续？");
    if (!confirmed) { input.value = ""; return; }
    const r = new FileReader();
    r.onload = async () => {
      try {
        const x = JSON.parse(String(r.result));
        const parsed = parseBackupPayload(x);
        await createBackup(makeBackupSnapshot(data, theme, locale));
        setData(parsed.data);
        setSettings(false);
        setMobileSettingsPage(null);
        setToast({ text: locale === "ja" ? "復元しました" : "恢复成功", undo: () => undefined });
      } catch (error) {
        console.error("[backup] restore validation failed", error);
        setToast({ text: locale === "ja" ? "バックアップの形式が無効です" : "备份格式无效，原数据未改变", undo: () => undefined });
      }
      input.value = "";
    };
    r.onerror = () => { setToast({ text: locale === "ja" ? "バックアップを読み込めませんでした" : "无法读取备份文件", undo: () => undefined }); input.value = ""; };
    r.readAsText(f);
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
      <div className={`student-app career-app ${settings ? "mobile-menu-open" : ""}`}>
        <aside className="sidebar panel">
          <Brand icon={icon} showIcon={false} />
          <StableNav view={view} setView={setView} t={t} />
          <DesktopCreate
            t={t}
            open={open}
            active={desktopMenu}
            setActive={setDesktopMenu}
          />
          <div className={`course-nav ${companiesCollapsed ? "collapsed" : ""}`}>
            <div className="course-nav-heading" onClick={() => { const next = !companiesCollapsed; setCompaniesCollapsed(next); localStorage.setItem("careerflow-companies-collapsed", String(next)); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const next = !companiesCollapsed; setCompaniesCollapsed(next); localStorage.setItem("careerflow-companies-collapsed", String(next)); } }}>
              <span>{t.companies} <b>{data.companies.length}</b></span>
              <span className="course-nav-heading-actions">
                {companiesCollapsed ? <ChevronDown className="collapse-chevron" /> : <ChevronUp className="collapse-chevron" />}
                <button onClick={(e) => { e.stopPropagation(); open("company"); }} aria-label={t.addCompany}>
                  <Plus />
                </button>
              </span>
            </div>
            {!companiesCollapsed && data.companies.map((x) => (
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
          <button className="mobile-menu-button" onClick={() => setSettings(true)} aria-label={t.settings}>
            <Menu />
          </button>
          <strong className="mobile-header-title">CareerFlow</strong>
          <span className="mobile-header-action-slot" aria-hidden="true" />
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
                setView,
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
          setView={(next) => { setSelectedDrawerItem(null); setView(next); }}
          t={t}
          menu={menu}
          onAdd={() => (menu ? setMenu(false) : setMenu(true))}
        />
        {isMobile && menu && (
          <ActionMenu
            t={t}
            view={view}
            close={() => setMenu(false)}
            open={open}
          />
        )}{" "}
        {isMobile && settings && (
          <MobileSettingsDrawer
            t={t}
            setView={setView}
            view={view}
            page={mobileSettingsPage}
            setPage={setMobileSettingsPage}
            selectedItem={selectedDrawerItem}
            setSelectedItem={setSelectedDrawerItem}
            close={() => { setSettings(false); setMobileSettingsPage(null); }}
            theme={theme}
            setTheme={setTheme}
            locale={locale}
            setLocale={setLocale}
            data={data}
            setData={setData}
            icon={icon}
            json={json}
            iconRef={iconRef}
            importJson={importJson}
            upload={upload}
            download={download}
          />
        )}
        {!isMobile && settings && (
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
            json={json}
            iconRef={iconRef}
            importJson={importJson}
            upload={upload}
            download={download}
          />
        )}{" "}
        <input hidden ref={json} type="file" accept=".json,application/json" onChange={importJson} />
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
            remove={setDeleteEvent}
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
        {deleteEvent && (
          <DeleteEventConfirm
            t={t}
            close={() => setDeleteEvent(undefined)}
            remove={confirmRemoveEvent}
          />
        )}{" "}
        {toast && (
          <Toast t={t} toast={toast} close={() => setToast(undefined)} />
        )}
      </div>
    </div>
  );
}
function Brand({ icon, showIcon = true }: { icon: string; showIcon?: boolean }) {
  return (
    <div className="brand">
      {showIcon && <div className="brand-mark">
        {icon ? <img src={icon} alt="" /> : <img src={`${import.meta.env.BASE_URL}favicon-v4.svg`} alt="" />}
      </div>}
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
  useEffect(() => setActiveSection(view), [view]);
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
          onClick={() => {
            setActiveSection(v);
            requestAnimationFrame(() => {
              setView(v);
            });
          }}
          aria-current={view === v ? "page" : undefined}
          onPointerDown={(e) => { e.currentTarget.dataset.pressed = "true"; }}
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
function PrimaryActionButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" className={`primary-action ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}
function Empty({ t, kind = "general", open }: { t: any; kind?: "company" | "schedule" | "materials" | "general"; open?: () => void }) {
  const copy: Record<string, [string, string, string]> = t.language === "言語" ? { company: ["企業がまだ登録されていません", "応募先企業を追加して、選考状況や締切をまとめて管理できます。", t.addCompany], schedule: ["日程がまだありません", "説明会や面接の予定を登録すると、次の行動が見やすくなります。", t.addEvent], materials: ["資料・面接記録がまだありません", "ESや面接記録を登録して、就活の準備を整理しましょう。", t.addRecord], general: [t.noData, "ここから就活の記録を追加できます。", t.new] } : t.language === "Language" ? { company: ["No companies yet", "Add companies to keep applications, stages, and deadlines together.", t.addCompany], schedule: ["No schedule yet", "Add briefings and interviews to make your next action clear.", t.addEvent], materials: ["No materials or interview records yet", "Add ES, resumes, and interview notes to organize your search.", t.addRecord], general: [t.noData, "Start by adding your first career record.", t.new] } : { company: ["还没有企业", "添加应聘企业，集中管理选考进度和截止时间。", t.addCompany], schedule: ["还没有日程", "添加说明会或面试安排，让下一步更清晰。", t.addEvent], materials: ["还没有资料或面试记录", "添加 ES、履历书或面试记录，整理你的就活准备。", t.addRecord], general: [t.noData, "从这里开始添加你的就活记录。", t.new] };
  if (t.language === "言語") copy.schedule[1] = "説明会、筆記試験、面接などの予定を追加して、選考スケジュールを管理しましょう。";
  const [title, description, action] = copy[kind];
  return (
    <div className="empty-small">
      <BriefcaseBusiness aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
      {open && <PrimaryActionButton onClick={open} className="empty-action"><Plus />{action}</PrimaryActionButton>}
    </div>
  );
}
function CreateRecordPicker({
  t,
  close,
  choose,
}: {
  t: any;
  close: () => void;
  choose: (kind: CreateType) => void;
}) {
  return (
    <Modal title={t.addRecord} close={close}>
      <div className="create-record-picker" role="menu" aria-label={t.addRecord}>
        <button type="button" onClick={() => choose("es")} role="menuitem"><FileJson />{t.addMaterial}</button>
        <button type="button" onClick={() => choose("interview")} role="menuitem"><BriefcaseBusiness />{t.addInterview}</button>
        <button type="button" onClick={() => choose("preparation")} role="menuitem"><Target />{t.addPrep}</button>
        <button type="button" className="picker-cancel" onClick={close}>{t.cancel}</button>
      </div>
    </Modal>
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
  setView,
}: any) {
  const openFunnel = (stage: FunnelStage) => {
    localStorage.setItem("careerflow-company-stage-filter", stage);
    setView("companies");
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="dashboard-date">
            {new Intl.DateTimeFormat(undefined, {
              month: "long",
              day: "numeric",
              weekday: "long",
            }).format(new Date())}
          </h1>
        </div>
        <PrimaryActionButton onClick={() => open("company")}>
          <Plus />
          {t.addCompany}
        </PrimaryActionButton>
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
                  <h3>{next.title || next.company?.name || t.untitledSchedule}</h3>
                  <p>
                    {t[next.type]} · {when(next.at)}
                  </p>
                  <span>
                    {getEventModeLabel(next.event, t.language === "言語" ? "ja" : "zh")}{next.event?.eventMode === "offline" && formatScheduleLocation(next.event) ? ` · ${formatScheduleLocation(next.event)}` : next.event?.eventMode === "online" && next.event.onlinePlatform ? ` · ${next.event.onlinePlatform}` : ""} ·{" "}
                    {relative(next.at, t)}
                  </span>
                  <WeatherLine location={next.event?.eventMode === "offline" ? formatScheduleLocation(next.event) : undefined} latitude={next.event?.latitude} longitude={next.event?.longitude} date={next.at} locale={t.language === "言語" ? "ja" : "zh"} />
                </div>
              </div>
            ) : (
            <Empty t={t} kind="schedule" open={() => open("schedule")} />
            )}
          </section>
          {due.length > 0 && <section>
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
          </section>}
        </div>
        <aside className="dashboard-sidebar">
          <section className="entity-card">
            <Title>{t.funnel}</Title>
            <div className="funnel">
              {([
                "funnelInterested",
                "funnelDocuments",
                "funnelAptitude",
                "funnelInterview",
                "funnelFinal",
                "funnelOffer",
              ] as FunnelStage[]).map((s) => (
                <button type="button" className="funnel-row" key={s} onClick={() => openFunnel(s)} aria-label={`${t[s]}: ${data.companies.filter((x: Company) => funnelStageFor(x.stage) === s).length}`}>
                  <span>{t[s]}</span>
                  {(() => {
                    const count = data.companies.filter((x: Company) => funnelStageFor(x.stage) === s).length;
                    return <b className={count > 0 ? "has-count" : undefined}>{count}</b>;
                  })()}
                  <ChevronRight aria-hidden="true" />
                </button>
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
function WeatherLine({ location, date, latitude, longitude, locale = "zh" }: { location?: string; date?: string; latitude?: number; longitude?: number; locale?: "zh" | "ja" }) {
  const [weather, setWeather] = useState<WeatherResult>();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "out_of_range" | "unavailable" | "error">("idle");
  useEffect(() => {
    const place = location?.trim() || localStorage.getItem("careerflow-home-region")?.trim();
    setWeather(undefined);
    if (!place || !date || /オンライン|online|webテスト|web test|オンライン面接/i.test(place)) { setStatus("unavailable"); return; }
    const target = new Date(`${date.slice(0, 10)}T00:00:00+09:00`).getTime();
    if (target < Date.now() - 86400000 || target > Date.now() + 7 * 86400000) { setStatus("out_of_range"); return; }
    setStatus("loading");
    const scheduleHour = `${date.slice(0, 13)}:00`;
    console.info("[weather] schedule time", { raw: date, timezone: "Asia/Tokyo", selectedHour: scheduleHour, latitude, longitude });
    const request = latitude && longitude ? getWeatherByCoordinates(latitude, longitude, scheduleHour) : getWeather(place, scheduleHour);
    request.then((value) => { setWeather(value); setStatus(value ? "success" : "unavailable"); }).catch((error) => { console.warn("[weather] request failed", error); setStatus("error"); });
  }, [location, date, latitude, longitude]);
  const place = location?.trim() || localStorage.getItem("careerflow-home-region")?.trim();
  if (!place || !date || /オンライン|online|webテスト|web test|オンライン面接/i.test(place)) return null;
  const target = new Date(`${date.slice(0, 10)}T00:00:00+09:00`).getTime();
  if (target < Date.now() - 86400000 || target > Date.now() + 7 * 86400000 || status !== "success" || !weather) return null;
  const Icon = weather.code >= 71 && weather.code <= 86 ? CloudSnow : weather.code >= 51 || weather.code >= 80 ? CloudRain : weather.code >= 1 ? CloudSun : Cloud;
  const description = weather.code === 0 ? (locale === "ja" ? "晴れ" : "晴") : weather.code <= 3 ? (locale === "ja" ? "曇り" : "多云") : weather.code >= 51 ? (locale === "ja" ? "雨の可能性" : "有降雨可能") : (locale === "ja" ? "天気の変化" : "天气变化");
  return <span className="weather-line"><Icon aria-hidden="true" />{weather.forecastTime.slice(11, 13)}{locale === "ja" ? "時ごろ" : "时左右"} · {description}</span>;
}
function eventModeText(event: Event | undefined, ja: boolean) {
  if (event?.eventMode === "offline") return `${ja ? "対面" : "线下"}${formatScheduleLocation(event) ? ` · ${formatScheduleLocation(event)}` : ""}`;
  if (event?.eventMode === "online") return `${ja ? "オンライン" : "线上"}${event.onlinePlatform ? ` · ${event.onlinePlatform}` : ""}`;
  return ja ? "形式未定" : "形式未确定";
}
function formatScheduleLocation(event: Event | undefined) {
  if (!event) return "";
  if (event.prefecture || event.municipality || event.city) {
    const base = `${event.prefecture || ""}${event.municipality || event.city || ""}`;
    return event.detailLocation ? `${base}・${event.detailLocation}` : base;
  }
  return event.locationLabel || event.location || "";
}
function getEventModeLabel(event: Event | undefined, locale: "zh" | "ja") {
  return event?.eventMode === "offline" ? (locale === "ja" ? "対面" : "线下") : event?.eventMode === "online" ? (locale === "ja" ? "オンライン" : "线上") : (locale === "ja" ? "未定" : "未确定");
}
function scheduleDisplayTitle(title: string | undefined, type: string | undefined, t: any) {
  if (type === "general") return title?.trim() || t.general;
  return (type && t[type]) || t.untitledSchedule;
}
function stageDisplayLabel(stage: string | undefined, t: any) {
  const value = String(stage || "").trim().toLowerCase();
  if (value === "favorite" || value === "收藏" || value === "saved") return t.saved;
  return t[stage as keyof typeof t] || t.saved;
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
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState(() => localStorage.getItem("careerflow-company-stage-filter") || "all");
  const [sortBy, setSortBy] = useState("updated");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [draftStageFilter, setDraftStageFilter] = useState("all");
  const [draftSortBy, setDraftSortBy] = useState("updated");
  const [recordMenu, setRecordMenu] = useState(false);
  useEffect(() => {
    if (!filterSheetOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [filterSheetOpen]);
  useEffect(() => { localStorage.setItem("careerflow-company-stage-filter", stageFilter); }, [stageFilter]);
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
            <h2>{stageDisplayLabel(co.stage, t)}</h2>
            <p>{co.notes || t.noData}</p>
            {co.careersUrl && (
              <a className="recruitment-link" href={co.careersUrl} target="_blank" rel="noopener noreferrer" title={co.careersUrl}>
                {t.recruitmentPage} <ExternalLink aria-hidden="true" />
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
            <Title action={<div className="record-action-wrap">
              <button className="primary" onClick={() => setRecordMenu(!recordMenu)}><Plus />{t.addRecord}</button>
              {recordMenu && <div className="record-action-menu">
                <button onClick={() => { setRecordMenu(false); open("es"); }}>{t.addMaterial}</button>
                <button onClick={() => { setRecordMenu(false); open("interview"); }}>{t.addInterview}</button>
                <button onClick={() => { setRecordMenu(false); open("schedule"); }}>{t.addTest}</button>
                <button onClick={() => { setRecordMenu(false); open("schedule"); }}>{t.addBriefing}</button>
                <button onClick={() => { setRecordMenu(false); open("schedule"); }}>{t.addOtherRecord}</button>
              </div>}
            </div>}>
              {t.selectionRecords}
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
              {!materials.length && !interviews.length && !preps.length && <div className="selection-empty">
                <BriefcaseBusiness aria-hidden="true" />
                <strong>{t.language === "言語" ? "選考記録がまだありません" : t.language === "Language" ? "No selection records yet" : "还没有选考记录"}</strong>
                <p>{t.language === "言語" ? "書類、テスト、説明会、面接から記録を始めましょう。" : t.language === "Language" ? "Start with a document, test, briefing, or interview." : "从材料、测试、说明会或面试开始记录。"}</p>
              </div>}
            </div>
          </section>
        </div>
      </>
    );
  }
  const filteredCompanies = data.companies
    .filter((x: Company) => !query.trim() || x.name.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((x: Company) => stageFilter === "all" || (stageFilter.startsWith("funnel") ? funnelStageFor(x.stage) === stageFilter : x.stage === stageFilter))
    .sort((a: Company, b: Company) => {
      if (sortBy === "interest") return b.interestLevel - a.interestLevel;
      if (sortBy === "event") return (a.nextEventAt || "9999").localeCompare(b.nextEventAt || "9999");
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return b.updatedAt - a.updatedAt;
    });
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t.companies}</h1>
          <p>{t.subtitle}</p>
        </div>
        {data.companies.length > 0 && <PrimaryActionButton onClick={() => open("company")}>
          <Plus />
          {t.addCompany}
        </PrimaryActionButton>}
      </div>
      {data.companies.length > 0 && <div className="company-toolbar">
        <div className="company-search-field"><Search aria-hidden="true" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.language === "言語" ? "企業を検索" : t.language === "Language" ? "Search companies" : "搜索企业"} aria-label={t.language === "言語" ? "企業を検索" : t.language === "Language" ? "Search companies" : "搜索企业"} /></div>
        <button type="button" className={`company-filter-trigger${stageFilter !== "all" || sortBy !== "updated" ? " has-filter" : ""}`} aria-label={t.language === "言語" ? "絞り込みと並び替え" : "筛选与排序"} onClick={() => { setDraftStageFilter(stageFilter); setDraftSortBy(sortBy); setFilterSheetOpen(true); }}><SlidersHorizontal /></button>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} aria-label={t.stage}>
          <option value="all">{t.all}</option>
          {funnelStages.map((stage) => <option key={stage} value={stage}>{t[stage]}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label={t.language === "言語" ? "並び替え" : t.language === "Language" ? "Sort" : "排序"}>
          <option value="updated">{t.language === "言語" ? "最近更新" : t.language === "Language" ? "Recently updated" : "最近更新"}</option>
          <option value="interest">{t.interest}</option>
          <option value="event">{t.event}</option>
        </select>
      </div>}
      {filterSheetOpen && <div className="company-filter-sheet-layer">
        <button type="button" className="company-filter-sheet-backdrop" aria-label={t.cancel} onClick={() => setFilterSheetOpen(false)} />
        <section className="company-filter-sheet" role="dialog" aria-modal="true" aria-label={t.language === "言語" ? "絞り込みと並び替え" : "筛选与排序"}>
          <header className="company-filter-sheet-header"><h2>{t.language === "言語" ? "絞り込みと並び替え" : "筛选与排序"}</h2><button type="button" className="company-filter-sheet-close" onClick={() => setFilterSheetOpen(false)} aria-label={t.cancel}><X aria-hidden="true" /></button></header>
          <div className="company-filter-sheet-content"><fieldset><legend>{t.stage}</legend><div className="company-filter-options">
            {["all", ...funnelStages].map((stage) => <label key={stage} className={draftStageFilter === stage ? "selected" : ""}><input type="radio" name="company-stage" checked={draftStageFilter === stage} onChange={() => setDraftStageFilter(stage)} /><span>{stage === "all" ? t.all : t[stage]}</span><Check /></label>)}
          </div></fieldset><fieldset><legend>{t.language === "言語" ? "並び替え" : "排序方式"}</legend><div className="company-filter-options">
            {["updated", "event", "interest", "name"].map((sort) => <label key={sort} className={draftSortBy === sort ? "selected" : ""}><input type="radio" name="company-sort" checked={draftSortBy === sort} onChange={() => setDraftSortBy(sort)} /><span>{sort === "updated" ? (t.language === "言語" ? "最近更新" : "最近更新") : sort === "event" ? t.event : sort === "interest" ? (t.language === "言語" ? "志望度の高い順" : "志望度从高到低") : (t.language === "言語" ? "企業名" : "企业名称")}</span><Check /></label>)}
          </div></fieldset></div><footer className="company-filter-sheet-actions"><button type="button" onClick={() => { setDraftStageFilter("all"); setDraftSortBy("updated"); }}>{t.language === "言語" ? "リセット" : "重置"}</button><button type="button" className="primary" onClick={() => { setStageFilter(draftStageFilter); setSortBy(draftSortBy); setFilterSheetOpen(false); }}>{t.language === "言語" ? "適用" : "应用"}</button></footer>
        </section>
      </div>}
      <div className="company-grid">
        {filteredCompanies.length ? (
          filteredCompanies.map((x: Company) => (
            <button
              className="company-card entity-card"
              onClick={() => setSelected(x.id)}
              key={x.id}
            >
              <i style={{ background: x.color }} />
              <div className="company-card-body">
                <h3 title={x.name}>{x.name}</h3>
                <p>{x.industry || x.position || t.general}</p>
                <span>{stageDisplayLabel(x.stage, t)} · {t.interest} {"★".repeat(x.interestLevel)}{"☆".repeat(5 - x.interestLevel)}</span>
                <span>{x.nextEventAt ? `${t.event} · ${when(x.nextEventAt)} · ${relative(x.nextEventAt, t)}` : t.noSchedule}</span>
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
        {schedules.length > 0 && <PrimaryActionButton onClick={() => setForm("schedule")}>
          <Plus />
          {t.addEvent}
        </PrimaryActionButton>}
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
                  <strong>{scheduleDisplayTitle(x.title, x.type, t)}</strong>
                  <span>
                    {x.company?.name || t.general} · {t[x.type]}
                  </span>
                  {x.kind === "event" && <><span>{eventModeText(x.event, t.language === "言語")}</span><WeatherLine location={x.event.eventMode === "offline" ? formatScheduleLocation(x.event) : undefined} latitude={x.event.latitude} longitude={x.event.longitude} date={x.at} locale={t.language === "言語" ? "ja" : "zh"} />{x.event.meetingUrl && <a className="meeting-link" href={x.event.meetingUrl} target="_blank" rel="noopener noreferrer">{t.language === "言語" ? "会議リンクを開く" : "打开会议链接"}</a>}</>}
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
  const matchesStatus = (completed: boolean) => filter !== "incomplete" && filter !== "completed" || filter === "completed" === completed;
  const materials = data.materials.filter((x: Material) => (filter === "all" || filter === "material" || filter === "incomplete" || filter === "completed") && (filter !== "material" || x.category === "material") && matchesStatus(!!x.completed));
  const interviews = data.interviews.filter((x: InterviewRecord) => (filter === "all" || filter === "interview" || filter === "incomplete" || filter === "completed") && (filter !== "interview" || x.category === "interview") && matchesStatus(!!x.result));
  const preps = data.preparations.filter((x: Preparation) => (filter === "all" || filter === "preparation" || filter === "incomplete" || filter === "completed") && (filter !== "preparation" || x.category === "preparation") && matchesStatus(x.completed));
  const [createPickerOpen, setCreatePickerOpen] = useState(false);
  const openCreateRecordPicker = () => setCreatePickerOpen(true);
  const chooseCreateRecord = (kind: CreateType) => {
    setCreatePickerOpen(false);
    open(kind);
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t.materials}</h1>
          <p>{t.materialsSub}</p>
        </div>
        {(materials.length > 0 || interviews.length > 0 || preps.length > 0) && <PrimaryActionButton onClick={openCreateRecordPicker}><Plus />{t.addRecord}</PrimaryActionButton>}
      </div>
      <div className="filter-bar entity-card">
        {[
          "all",
          "incomplete",
          "completed",
          "material",
          "interview",
          "preparation",
        ].map((x) => (
          <button
            className={filter === x ? "active" : ""}
            onClick={() => setFilter(x)}
            key={x}
          >
            {x === "material" ? t.materialCategory : x === "interview" ? t.interviewCategory : x === "preparation" ? t.preparationCategory : t[x]}
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
        {!materials.length && !interviews.length && !preps.length && <>
          <Empty t={t} kind="materials" open={openCreateRecordPicker} />
        </>}
      </div>
      {createPickerOpen && <CreateRecordPicker t={t} close={() => setCreatePickerOpen(false)} choose={chooseCreateRecord} />}
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
          <CloseButton onClick={close} />
        </header>
        {children}
      </section>
    </div>
  );
}

function CloseButton({
  onClick,
  label = "Close",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button type="button" className="close-button" onClick={onClick} aria-label={label}>
      <X aria-hidden="true" />
    </button>
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
  const [interest, setInterest] = useState(Math.min(5, Math.max(1, initial?.interestLevel || 3)));
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
        <label className="interest-field">
          <span>{t.interest}</span>
          <input type="hidden" name="interest" value={interest} readOnly />
          <div className="interest-stars" role="radiogroup" aria-label={t.interest}>
            {[1, 2, 3, 4, 5].map((x) => <button key={x} type="button" role="radio" aria-checked={interest === x} tabIndex={interest === x ? 0 : -1} className={x <= interest ? "selected" : ""} onClick={() => setInterest(x)} onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setInterest(Math.min(5, interest + 1)); } if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setInterest(Math.max(1, interest - 1)); } }}>{x <= interest ? "★" : "☆"}</button>)}
            <span>{interest} / 5</span>
          </div>
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
          <span>{t.url}</span>
          <input name="url" type="url" defaultValue={initial?.careersUrl} />
        </label>
        <label>
          <span>{t.displayColor}</span>
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
  const [otherType, setOtherType] = useState("open_es");
  const [saveMode, setSaveMode] = useState<"upload" | "text">("text");
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState("");
  useEffect(() => {
    if (!file) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const label = (zh: string, jp: string, eng: string) => ja ? jp : en ? eng : zh;
  const otherTypes = [
    ["open_es", "OpenES"],
    ["transcript", label("成绩证明书", "成績証明書", "Academic transcript")],
    ["graduation", label("预计毕业证明书", "卒業見込証明書", "Expected graduation certificate")],
    ["recommendation", label("推荐信", "推薦状", "Recommendation letter")],
    ["other", label("其他", "その他", "Other")],
  ];
  const statuses = [["not_started", label("未着手", "未着手", "Not started")], ["drafting", label("作成中", "作成中", "Drafting")], ["submitted", label("已提交", "提出済み", "Submitted")]];
  const isOtherDocument = documentType === "other_document";
  const chooseDocumentType = (value: string) => {
    setDocumentType(value);
    setSaveMode(value === "es" || value === "other_document" ? "text" : "upload");
    setFile(undefined);
  };
  const onFile = (next?: File) => {
    if (!next) return;
    const valid = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg"];
    if (!valid.includes(next.type) || next.size > 10 * 1024 * 1024) {
      window.alert(label("请选择 PDF、Word、PNG 或 JPG，且文件不超过 10 MB。", "PDF、Word、PNG、JPGの10MB以下のファイルを選択してください。", "Choose a PDF, Word, PNG, or JPG file up to 10 MB."));
      return;
    }
    setFile(next);
  };
  return (
    <Modal title={label("添加材料", "書類を追加", "Add document")} close={close}>
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
          <span>{label("材料类型", "書類の種類", "Document type")} *</span>
          <select name="documentType" value={documentType} onChange={(e) => chooseDocumentType(e.target.value)} required>
            <option value="es">ES</option>
            <option value="resume">履歴書</option>
            <option value="other_document">{label("其他材料", "その他の書類", "Other documents")}</option>
          </select>
        </label>
        <fieldset className="save-mode-field wide">
          <legend>{label("保存方式", "保存方法", "Save method")} *</legend>
          <div className="segmented-control">
            <label><input type="radio" name="saveMode" value="upload" checked={saveMode === "upload"} onChange={() => setSaveMode("upload")} /><span>{label("上传文件", "ファイルをアップロード", "Upload file")}</span></label>
            <label><input type="radio" name="saveMode" value="text" checked={saveMode === "text"} onChange={() => setSaveMode("text")} /><span>{label("直接填写", "直接入力", "Enter text")}</span></label>
          </div>
        </fieldset>
        {saveMode === "upload" && <div className="attachment-field wide">
          <label className="attachment-dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
            <Upload aria-hidden="true" />
            <strong>{label("拖拽文件到这里，或点击选择文件", "ファイルをここにドロップするか、クリックして選択", "Drop a file here or click to choose")}</strong>
            <span>{label("支持 PDF、Word、PNG、JPG，最大 10 MB", "PDF、Word、PNG、JPG、最大10MB", "PDF, Word, PNG, JPG, up to 10 MB")}</span>
            <input name="attachment" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {file && <div className="attachment-card"><FileJson /><div><strong title={file.name}>{file.name}</strong><span>{file.type.split("/").pop()?.toUpperCase()} · {Math.ceil(file.size / 1024)} KB</span></div><a href={previewUrl} target="_blank" rel="noopener noreferrer">{file.type === "application/pdf" || file.type.startsWith("image/") ? label("预览", "プレビュー", "Preview") : label("下载查看", "ダウンロード", "Download")}</a><button type="button" onClick={() => setFile(undefined)} aria-label={label("删除附件", "添付ファイルを削除", "Remove attachment")}><Trash2 /></button></div>}
        </div>}
        {isOtherDocument && <label>
          <span>{label("具体材料类型", "書類の種類", "Specific document type")} *</span>
          <select name="otherType" value={otherType} onChange={(e) => setOtherType(e.target.value)} required>
            {otherTypes.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </label>}
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
        {saveMode === "text" && documentType === "es" && <>
          <label className="wide"><span>{label("题目", "設問", "Question")}</span><input name="question" /></label>
          <label className="wide"><span>{label("回答", "回答", "Answer")}</span><textarea name="answer" /></label>
          <label><span>{label("文字数限制", "文字数制限", "Character limit")}</span><input name="characterLimit" type="number" min="0" /></label>
        </>}
        {saveMode === "text" && documentType === "resume" && <>
          <label><span>{label("版本名", "バージョン名", "Version name")}</span><input name="versionName" /></label>
          <label><span>{label("文件名", "ファイル名", "File name")}</span><input name="fileName" /></label>
          <label><span>{label("使用语言", "使用言語", "Language")}</span><input name="language" placeholder="日本語 / 中文 / English" /></label>
        </>}
        {isOtherDocument && <label><span>{label("文件名", "ファイル名", "File name")}</span><input name="fileName" /></label>}
        <Actions t={t} close={close} primaryLabel={saveMode === "upload" ? label("上传并保存", "アップロードして保存", "Upload and save") : undefined} />
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
  remove,
}: {
  t: any;
  companies: Company[];
  initial?: Event;
  close: () => void;
  save: any;
  remove: (event: Event) => void;
}) {
  const [mode, setMode] = useState<Event["eventMode"]>(initial?.eventMode || "undecided");
  const [prefecture, setPrefecture] = useState(initial?.prefecture || "");
  const [city, setCity] = useState(initial?.city || "");
  const ja = t.language === "言語";
  return (
    <Modal title={initial ? t.edit : t.addEvent} close={close}>
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
        <fieldset className="wide event-mode-field"><legend>{ja ? "開催形式" : "举办形式"}</legend><div className="mode-options">
          {(["offline", "online", "undecided"] as const).map((value) => { const inputId = `event-mode-${value}`; return <label key={value} htmlFor={inputId} className={mode === value ? "selected" : ""}><input id={inputId} type="radio" name="eventMode" value={value} checked={mode === value} onChange={() => setMode(value)} /><span>{value === "offline" ? (ja ? "対面" : "线下") : value === "online" ? (ja ? "オンライン" : "线上") : (ja ? "未定" : "未确定")}</span></label>; })}
        </div></fieldset>
        {mode === "offline" && <><label><span>{ja ? "都道府県" : "都道府县"}</span><select name="prefecture" value={prefecture} onChange={(e) => { setPrefecture(e.target.value); setCity(""); }}><option value="">{ja ? "選択してください" : "请选择"}</option>{prefectures.map((value) => <option key={value} value={value}>{value}</option>)}<option value="__other">{ja ? "その他／手入力" : "其他／手动输入"}</option></select></label>{prefecture === "__other" ? <label className="wide"><span>{ja ? "住所" : "完整地址"}</span><input name="manualLocation" defaultValue={initial?.locationLabel || initial?.location} /></label> : <><label><span>{ja ? "市区町村／主要エリア" : "市区町村／主要区域"}</span><select name="city" value={city} onChange={(e) => setCity(e.target.value)}><option value="">{ja ? "選択してください" : "请选择"}</option>{(cityOptions[prefecture] || []).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="wide"><span>{ja ? "詳細な場所" : "详细地点"}</span><input name="detailLocation" defaultValue={initial?.detailLocation} placeholder={ja ? "渋谷駅、○○ビル 3F" : "渋谷站、○○大楼 3F"} /></label></>}</>}
        {mode === "online" && <><label><span>{ja ? "オンラインプラットフォーム" : "线上平台"}</span><select name="onlinePlatform" defaultValue={initial?.onlinePlatform || ""}><option value="">—</option>{["Zoom", "Microsoft Teams", "Google Meet", ja ? "企業専用システム" : "企业专用系统", ja ? "電話" : "电话", ja ? "その他" : "其他"].map((x) => <option key={x} value={x}>{x}</option>)}</select></label><label><span>{ja ? "会議リンク" : "会议链接"}</span><input name="meetingUrl" type="url" defaultValue={initial?.meetingUrl || ""} /></label></>}
        <label className="wide">
          <span>{t.notes}</span>
          <textarea name="notes" defaultValue={initial?.notes} />
        </label>
        <Actions t={t} close={close} remove={initial ? () => remove(initial) : undefined} />
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
  const ja = t.language === "言語";
  const en = t.language === "Language";
  const label = (zh: string, jp: string, eng: string) => ja ? jp : en ? eng : zh;
  const roundOptions = [["first", label("一次面试", "一次面接", "First Interview")], ["second", label("二次面试", "二次面接", "Second Interview")], ["third", label("三次面试", "三次面接", "Third Interview")], ["final", label("最终面试", "最終面接", "Final Interview")], ["group", label("集团面试", "集団面接", "Group Interview")], ["meeting", label("面谈", "面談", "Meeting")], ["other", label("其他", "その他", "Other")]];
  const formatOptions = [["individual", label("个人面试", "個人面接", "Individual interview")], ["group", label("集团面试", "集団面接", "Group interview")], ["discussion", label("小组讨论", "グループディスカッション", "Group discussion")], ["hr", label("人事面谈", "人事面談", "HR meeting")], ["other", label("其他", "その他", "Other")]];
  const modeOptions = [["online", label("线上", "オンライン", "Online")], ["in_person", label("现场", "対面", "In person")], ["hybrid", label("混合", "ハイブリッド", "Hybrid")], ["undecided", label("未确定", "未定", "Undecided")]];
  const resultOptions = [["waiting", label("等待结果", "結果待ち", "Waiting")], ["passed", label("通过", "通過", "Passed")], ["failed", label("未通过", "不合格", "Not passed")], ["withdrawn", label("辞退", "辞退", "Withdrawn")], ["undecided", label("未确定", "未定", "Undecided")]];
  const initialRound = initial?.roundCode || roundOptions.find(([code, text]) => text === initial?.round)?.[0] || "other";
  const [roundCode, setRoundCode] = useState(initialRound);
  const [score, setScore] = useState(Math.min(5, Math.max(1, initial?.score || 3)));
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
        <label><span>{t.round}</span><select name="roundCode" value={roundCode} onChange={(e) => setRoundCode(e.target.value)}>{roundOptions.map(([code, text]) => <option key={code} value={code}>{text}</option>)}</select></label>
        {roundCode === "other" && <label><span>{label("自定义轮次", "面接回数（自由入力）", "Custom round")}</span><input name="round" defaultValue={initial?.roundCode === "other" ? initial.round : ""} required /></label>}
        {roundCode !== "other" && <input type="hidden" name="round" value={roundOptions.find(([code]) => code === roundCode)?.[1] || ""} readOnly />}
        <label><span>{t.format}</span><select name="format" defaultValue={initial?.format || "individual"}>{formatOptions.map(([code, text]) => <option key={code} value={text}>{text}</option>)}</select></label>
        <label><span>{label("参加方式", "参加方法", "Attendance mode")}</span><select name="participationMode" defaultValue={initial?.participationMode || "undecided"}>{modeOptions.map(([code, text]) => <option key={code} value={code}>{text}</option>)}</select></label>
        <label><span>{t.interviewAt}</span><input name="interviewAt" type="datetime-local" defaultValue={initial?.interviewAt} required /></label>
        <label>
          <span>{t.interviewers}</span>
          <input name="interviewers" defaultValue={initial?.interviewers} />
        </label>
        <label className="interest-field"><span>{t.score}</span><input type="hidden" name="score" value={score} readOnly /><div className="interest-stars" role="radiogroup" aria-label={t.score}>{[1,2,3,4,5].map((x) => <button key={x} type="button" role="radio" aria-checked={score === x} tabIndex={score === x ? 0 : -1} className={x <= score ? "selected" : ""} onClick={() => setScore(x)} onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setScore(Math.min(5, score + 1)); } if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setScore(Math.max(1, score - 1)); } }}>{x <= score ? "★" : "☆"}</button>)}<span>{score} / 5</span></div></label>
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
        <label><span>{t.result}</span><select name="result" defaultValue={initial?.result || "undecided"}>{resultOptions.map(([code, text]) => <option key={code} value={text}>{text}</option>)}</select></label>
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
function Actions({ t, close, remove, primaryLabel }: { t: any; close: () => void; remove?: () => void; primaryLabel?: string }) {
  return (
    <>
      {remove && <button type="button" className="delete-event-button wide" onClick={remove}>
        <Trash2 />
        {t.deleteEventAction}
      </button>}
      <div className="form-actions wide">
      <button type="button" onClick={close}>
        {t.cancel}
      </button>
      <button className="primary">{primaryLabel || t.save}</button>
      </div>
    </>
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
function DeleteEventConfirm({
  t,
  close,
  remove,
}: {
  t: any;
  close: () => void;
  remove: () => void;
}) {
  return (
    <Modal title={t.deleteEventTitle} close={close}>
      <p className="confirm-copy">{t.deleteEventDescription}</p>
      <div className="confirm-actions">
        <button onClick={close}>{t.cancel}</button>
        <button className="danger-solid" onClick={remove}>{t.deleteAction}</button>
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
function BackupControls({ data, theme, locale, setData }: any) {
  const [error, setError] = useState("");
  const [lastExport, setLastExport] = useState<number>(() => Number(localStorage.getItem("careerflow-last-export") || 0));
  const fileRef = useRef<HTMLInputElement>(null);
  const snapshot = (): BackupSnapshot => makeBackupSnapshot(data, theme, locale);
  const exportBackup = async () => {
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
  const restoreFile = (e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = async () => { try { const parsed = parseBackupPayload(JSON.parse(String(reader.result))); await createBackup(snapshot()); setData(parsed.data); setError(`${parsed.counts.companies} 企业、${parsed.counts.schedules} 日程、${parsed.counts.materials} 资料已恢复`); } catch (error) { console.error("[backup] restore validation failed", error); setError("JSON 结构无效，原数据未改变"); } }; reader.readAsText(file); e.currentTarget.value = ""; };
  const labels = locale === "ja" ? { exportBackup:"バックアップを書き出す", restoreFile:"バックアップを復元", exportNote:"バックアップファイルはブラウザの既定のダウンロード先に保存されます。", restoreNote:"以前に書き出したバックアップファイルを選択してください。", notesTitle:"バックアップについて", notesData:"企業、日程、書類、面接記録、アプリ設定が含まれます。", notesDevice:"バックアップファイルはユーザーのデバイスにのみ保存されます。", format:"ファイル形式：JSON", last:"前回の書き出し", never:"まだバックアップを書き出していません" } : { exportBackup:"导出备份", restoreFile:"恢复备份", exportNote:"备份文件将下载到浏览器的默认下载位置。", restoreNote:"请选择此前导出的备份文件。", notesTitle:"备份说明", notesData:"备份包含企业、日程、材料、面试记录及应用设置。", notesDevice:"备份文件仅保存在用户设备中。", format:"文件格式：JSON", last:"上次导出", never:"尚未导出备份" };
  return <section className="backup-panel"><section><div className="backup-cloud-actions"><button className="primary" onClick={exportBackup}>{labels.exportBackup}</button><button onClick={() => fileRef.current?.click()}>{labels.restoreFile}</button></div><p>{labels.exportNote}</p><p>{labels.restoreNote}</p><div className="backup-notes"><strong>{labels.notesTitle}</strong><span>{labels.notesData}</span><span>{labels.notesDevice}</span><span>{labels.format}</span></div><p>{lastExport ? `${labels.last}: ${new Date(lastExport).toLocaleDateString()}` : labels.never}</p>{error && <p className="backup-error">{error}</p>}<input hidden ref={fileRef} type="file" accept="application/json,.json" onChange={restoreFile} /></section></section>;
}
function MobileSettingsDrawer({
  t, page, setPage, close, setView, view, selectedItem, setSelectedItem, theme, setTheme, locale, setLocale, data, setData, json, download,
}: any) {
  const label = "CareerFlow";
  const about = locale === "ja"
    ? { title: "CareerFlowについて", version: "CareerFlow バージョン 1.0", db: `データベースバージョン：v${data.schemaVersion}`, privacy: "プライバシー：データは主にこのデバイスに保存されます。", license: "オープンソースライセンス：MIT License" }
    : locale === "en"
      ? { title: "About CareerFlow", version: "CareerFlow version 1.0", db: `Database version: v${data.schemaVersion}`, privacy: "Privacy: Data is mainly stored on this device.", license: "Open-source license: MIT License" }
      : { title: "关于 CareerFlow", version: "CareerFlow 版本 1.0", db: `数据库版本：v${data.schemaVersion}`, privacy: "隐私说明：数据主要保存在当前设备。", license: "开源许可：MIT License" };
  const go = (next: string) => setPage(next);
  const touchStart = useRef<number | null>(null);
  useEffect(() => {
    const y = window.scrollY;
    document.documentElement.classList.add("drawer-open");
    document.body.classList.add("drawer-open");
    document.body.style.setProperty("--saved-scroll-y", `${y}px`);
    document.body.style.top = `-${y}px`;
    return () => {
      document.documentElement.classList.remove("drawer-open");
      document.body.classList.remove("drawer-open");
      document.body.style.removeProperty("--saved-scroll-y");
      document.body.style.removeProperty("top");
      window.scrollTo(0, y);
    };
  }, []);
  return <div className="mobile-settings-layer">
    <button className="mobile-settings-backdrop" onClick={close} aria-label="Close" />
    <aside className="mobile-settings-drawer drawer-shell" role="dialog" aria-modal="true" aria-label={label} onTouchStart={(e) => { touchStart.current = e.touches[0].clientX; }} onTouchEnd={(e) => { const start = touchStart.current; const delta = start === null ? 0 : e.changedTouches[0].clientX - start; if (page && start !== null && start <= 24 && delta > 72) setPage(null); else if (!page && delta < -70) close(); touchStart.current = null; }}>
      <header className="mobile-settings-header drawer-header">
        <span /><div className="mobile-settings-brand"><strong>CareerFlow</strong><small>日本就活管理</small></div><span />
      </header>
      <div className="drawer-main drawer-scroll"><nav className="mobile-settings-nav">
        <button className={selectedItem === "home" ? "active" : ""} onClick={() => { setSelectedItem("home"); setPage(null); close(); setView("dashboard"); }}><Home /><span>{t.dashboard}</span></button>
        <button className={`${page === "data" ? "expanded " : ""}${selectedItem === "data" ? "selected-setting" : ""}`} onClick={() => { setSelectedItem("data"); setPage(page === "data" ? null : "data"); }}><Database /><span>{t.data}</span><ChevronRight /></button>
        {page === "data" && <div className="drawer-accordion-panel"><button type="button" onClick={() => download("careerflow-backup.json", JSON.stringify(makeBackupSnapshot(data, theme, locale), null, 2), "application/json")}><DatabaseArrowUp /><span>{t.backup}</span></button><button type="button" onClick={() => json.current?.click()}><DatabaseArrowDown /><span>{t.restore}</span></button></div>}
        <button className={`${page === "appearance" ? "expanded " : ""}${selectedItem === "appearance" ? "selected-setting" : ""}`} onClick={() => { setSelectedItem("appearance"); setPage(page === "appearance" ? null : "appearance"); }}><Palette /><span>{t.appearance}</span><ChevronRight /></button>
        {page === "appearance" && <div className="drawer-accordion-panel">{(["light", "dark", "system"] as Theme[]).map((x) => { const Icon = x === "light" ? Sun : x === "dark" ? Moon : Monitor; return <button className={theme === x ? "selected" : ""} onClick={() => setTheme(x)} key={x}><Icon aria-hidden="true" /><span>{t[x]}</span>{theme === x && <Check />}</button>; })}</div>}
        <button className={`${page === "language" ? "expanded " : ""}${selectedItem === "language" ? "selected-setting" : ""}`} onClick={() => { setSelectedItem("language"); setPage(page === "language" ? null : "language"); }}><Globe /><span>{t.language}</span><ChevronRight /></button>
        {page === "language" && <div className="drawer-accordion-panel">{(["zh", "ja"] as Locale[]).map((x) => <button type="button" className={locale === x ? "selected" : ""} onClick={() => setLocale(x)} key={x}><span>{x === "zh" ? "中文" : "日本語"}</span>{locale === x && <Check />}</button>)}</div>}
        <button className={`${page === "about" ? "expanded " : ""}${selectedItem === "about" ? "selected-setting" : ""}`} onClick={() => { setSelectedItem("about"); setPage(page === "about" ? null : "about"); }}><Info /><span>{about.title}</span><ChevronRight /></button>
        {page === "about" && <div className="drawer-accordion-panel mobile-about"><p>{about.title}</p><p>{about.version}</p><p>{about.db}</p><p>{about.privacy}</p><p>{about.license}</p></div>}
      </nav></div>
    </aside>
  </div>;
}
function SettingsDrawer({ close, children, title }: { close: () => void; children: ReactNode; title: string }) {
  const [closing, setClosing] = useState(false);
  const startX = useRef<number | null>(null);
  const dismiss = () => { if (closing) return; setClosing(true); window.setTimeout(close, 260); };
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); }; document.addEventListener("keydown", onKey); document.body.classList.add("settings-drawer-open"); return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("settings-drawer-open"); }; }, []);
  return <div className={`settings-drawer-layer ${closing ? "closing" : ""}`}><button className="settings-drawer-backdrop" onClick={dismiss} aria-label="Close settings"/><aside className="settings-drawer-panel" role="dialog" aria-modal="true" aria-label={title} onTouchStart={(e) => { startX.current = e.touches[0].clientX; }} onTouchEnd={(e) => { if (startX.current !== null && e.changedTouches[0].clientX - startX.current > 70) dismiss(); startX.current = null; }}><header><h2>{title}</h2><CloseButton onClick={dismiss} label="Close settings" /></header><div className="settings-drawer-scroll">{children}</div></aside></div>;
}
function SettingsPanel({ t, theme, setTheme, locale, setLocale, close, data, setData, iconRef, json, upload, importJson, download }: any) {
  const [tab, setTab] = useState("general");
  const [homeRegion, setHomeRegion] = useState(() => localStorage.getItem("careerflow-home-region") || "");
  const ja = locale === "ja";
  const ui = locale === "ja" ? { general:"一般", appearance:"表示", language:"言語", data:"データとバックアップ", about:"CareerFlowについて", storage:"このデバイスの保存状況", backup:"バックアップ", aboutTitle:"CareerFlowについて", version:"CareerFlow バージョン 1.0", db:"データベースバージョン", pwa:"PWA ステータス: standalone 対応", icon:"アイコン: CareerFlow ブランドアイコン", privacy:"プライバシー: データは主にこのデバイスに保存されます。", license:"オープンソースライセンス: MIT License" } : locale === "en" ? { general:"General", appearance:"Appearance", language:"Language", data:"Data & backups", about:"About CareerFlow", storage:"Device storage", backup:"Backup", aboutTitle:"About CareerFlow", version:"CareerFlow version 1.0", db:"Database version", pwa:"PWA status: standalone supported", icon:"Icon: CareerFlow brand icon", privacy:"Privacy: Data is mainly stored on this device.", license:"Open-source license: MIT License" } : { general:"常规", appearance:"外观", language:"语言", data:"数据与备份", about:"关于 CareerFlow", storage:"当前设备存储", backup:"备份", aboutTitle:"关于 CareerFlow", version:"CareerFlow 版本 1.0", db:"数据库版本", pwa:"PWA 状态：支持 standalone", icon:"图标：CareerFlow 品牌图标", privacy:"隐私：数据主要保存在当前设备。", license:"开源许可：MIT License" };
  const tabs = [["general", ui.general, Settings], ["appearance", ui.appearance, Palette], ["language", ui.language, Globe], ["data", ui.data, Database], ["about", ui.about, Info]] as const;
  return <SettingsDrawer title={t.settings} close={close}><div className="desktop-settings-layout"><nav className="desktop-settings-nav settings-sidebar"><div className="settings-nav-list">{tabs.map(([key, text, Icon]) => <SettingsNavItem key={key} label={text} icon={Icon} active={tab === key} onClick={() => setTab(key)} />)}</div></nav><div className="desktop-settings-content">
    {tab === "general" && <section className="settings-section"><h3>{ui.storage}</h3><div className="settings-stats">{[[ja ? "企業数" : locale === "en" ? "Companies" : "企业数", data.companies.length], [ja ? "日程数" : locale === "en" ? "Schedules" : "日程数", data.events.length], [ja ? "資料数" : locale === "en" ? "Resources" : "资料数", data.materials.length], [ja ? "面接記録数" : locale === "en" ? "Interviews" : "面试记录数", data.interviews.length], [ja ? "準備事項数" : locale === "en" ? "Preparations" : "准备事项数", data.preparations.length], [ui.db, "v" + data.schemaVersion]].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="home-region-setting"><label>{ja ? "常駐就活地域" : "常驻就活地区"}<select value={homeRegion} onChange={(e) => { setHomeRegion(e.target.value); localStorage.setItem("careerflow-home-region", e.target.value); }}><option value="">{ja ? "未設定" : "未设置"}</option>{["東京都", "大阪府", "愛知県", "福岡県", "北海道", "宮城県", "広島県", "京都府"].map((region) => <option key={region} value={region}>{region}</option>)}</select></label><p>{ja ? "日程に詳しい場所がない場合、地域の天気と移動の目安に使用します。" : "当日程没有填写详细地点时，用于显示当地天气和出行提醒。"}</p></div></section>}
    {tab === "appearance" && <section className="settings-section"><h3>{ui.appearance}</h3><div className="settings-segmented">{(["light", "dark", "system"] as Theme[]).map((x) => { const Icon = x === "light" ? Sun : x === "dark" ? Moon : Monitor; return <button aria-pressed={theme === x} className={theme === x ? "active" : ""} onClick={() => setTheme(x)} key={x}><Icon aria-hidden="true" />{t[x]}</button>; })}</div></section>}
    {tab === "language" && <section className="settings-section"><h3>{ui.language}</h3><div className="settings-segmented">{(["zh", "ja"] as Locale[]).map((x) => <button type="button" aria-pressed={locale === x} className={locale === x ? "active" : ""} onClick={() => setLocale(x)} key={x}>{x === "zh" ? "中文" : "日本語"}</button>)}</div></section>}
    {tab === "data" && <section className="settings-section settings-data-section"><h3>{ui.backup}</h3><BackupControls data={data} theme={theme} locale={locale} setData={setData} /></section>}
    {tab === "about" && <section className="settings-section"><h3>{ui.aboutTitle}</h3><div className="settings-about-list"><p>{ui.version}</p><p>{ui.db}: v{data.schemaVersion}</p><p>{ui.pwa}</p><p>{ui.icon}</p><p>{ui.privacy}</p><p>{ui.license}</p></div></section>}
  </div></div><input hidden ref={iconRef} type="file" accept="image/*" onChange={upload} /></SettingsDrawer>;
}
function SettingsNavItem({ label, icon: Icon, active, onClick }: { label: string; icon: React.ComponentType<any>; active: boolean; onClick: () => void }) {
  return <button type="button" className={`settings-nav-item ${active ? "active" : ""}`} aria-selected={active} onClick={onClick}><Icon size={19} aria-hidden="true" /><span className="settings-nav-label">{label}</span></button>;
}
