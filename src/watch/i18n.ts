const ja = {
  title: "企業ウォッチ", updates: "企業アップデート", add: "監視URLを追加", source: "監視先", url: "URL", label: "表示名（任意）", cancel: "キャンセル", save: "追加", edit: "編集",
  mynavi: "マイナビ", official: "公式採用ページ", other: "その他", active: "監視中", checking: "確認中…", error: "確認できませんでした", paused: "停止中", lastCheck: "最終確認",
  empty: "採用情報ページを登録すると、エントリー開始などの更新を定期的に確認できます。", unavailable: "監視サービスはまだ設定されていません。設定後にURLを登録できます。",
  auth: "監視サービスに接続", code: "アクセスコード", connect: "接続", retry: "再試行", pause: "監視を停止", resume: "監視を再開", remove: "削除", open: "元ページを開く",
  before: "変更前", after: "変更後", detected: "検出", all: "すべて見る", duplicate: "同じURLはすでに登録されています。", invalid: "公開されている http / https URLを入力してください。"
} as const;
const zh: { [K in keyof typeof ja]: string } = {
  title: "企业监控", updates: "企业更新", add: "添加监控网址", source: "监控来源", url: "网址", label: "显示名称（可选）", cancel: "取消", save: "添加", edit: "编辑",
  mynavi: "Mynavi", official: "官方招聘页面", other: "其他", active: "监控中", checking: "检查中…", error: "无法检查", paused: "已暂停", lastCheck: "最后检查",
  empty: "登记招聘信息页面后，可定期检查报名开始等更新。", unavailable: "监控服务尚未配置，配置完成后才能登记网址。",
  auth: "连接监控服务", code: "访问码", connect: "连接", retry: "重试", pause: "暂停监控", resume: "恢复监控", remove: "删除", open: "打开来源页面",
  before: "变更前", after: "变更后", detected: "检测时间", all: "查看全部", duplicate: "该公司已登记相同网址。", invalid: "请输入公开可访问的 http / https 网址。"
};
export const watchText = { ja, zh } as const;
