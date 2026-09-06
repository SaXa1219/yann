// 消息类型
export type MessageType = 'text' | 'voice' | 'image' | 'emoji' | 'tap' | 'recalled' | 'call' | 'transfer' | 'questionnaire' | 'music_invite' | 'gift' | 'question';

// 问卷单题
export interface Question {
  id: string;
  text: string;
  options: string[];
  /** 题目类型：choice 单选 / multi 多选 / text 开放式（对方用一个字卡回答） */
  type?: 'choice' | 'multi' | 'text';
}

// 问卷回答
export interface QuestionnaireAnswer {
  questionId: string;
  optionIndex?: number | number[];
  /** 开放式「问问题」模式下，对方用字卡回复的内容 */
  text?: string;
}

// 聊天消息类型
export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  sender: 'user' | 'system';
  timestamp: number;
  duration?: number;
  quotedId?: string;
  recalled?: boolean;
  // 群聊时显示发送者昵称
  senderName?: string;
  // 转账专用字段
  transferAmount?: number;
  transferNote?: string;
  transferStatus?: 'pending' | 'accepted' | 'rejected';
  // 礼物专用字段
  giftName?: string;
  giftIcon?: string;
  giftImage?: string;
  giftStatus?: 'pending' | 'accepted' | 'rejected';
  // 字卡消息（居中带边框的卡片样式）
  giftCard?: boolean;
  // 问卷专用字段（JSON 序列化）
  meta?: string;
  // 已读状态（仅用户发送的消息，对方查看后标记）
  read?: boolean;
}

// 字卡类型
export interface CardItem {
  id: string;
  content: string;
  createdAt: number;
  category?: string; // 字卡分类
  blocked?: boolean; // 是否屏蔽（屏蔽后对方不会随机到）
}

// MiniMax TTS 设置
export interface MiniMaxSettings {
  enabled: boolean;
  voiceId: string;
  apiKey: string;
  groupId: string; // 使用自定义/克隆音色时所需的 Group ID
  speed: number;
}

// 商店礼物
export interface Gift {
  id: string;
  name: string;
  icon: string; // emoji 或字符
  image?: string; // 礼物图片（可选）
  createdAt: number;
}

// 图片字卡（对方发朋友圈时随机抽取）
export interface ImageCard {
  id: string;
  data: string;   // base64 image
  createdAt: number;
}

// 语音字卡
export interface VoiceCard {
  id: string;
  name: string;
  data: string;   // base64 audio
  duration: number;
  createdAt: number;
  transcript?: string; // 语音转文字结果
}

// 写信
export interface Letter {
  id: string;
  fromUser: boolean;   // true=我写的, false=对方回的
  content: string;     // 正文（不含 to: 头）
  timestamp: number;
  replyId?: string;    // 对方回信时关联的我的信id
}

// 外观设置类型
export interface AppearanceSettings {
  backgroundType: 'color' | 'image';
  backgroundColor: string;
  backgroundImage: string;
  backgroundOpacity: number; // 聊天背景透明度 0-1
  userBubbleColor: string;
  userBubbleTextColor: string;
  systemBubbleColor: string;
  systemBubbleTextColor: string;
  fontFamily: string;
  borderRadius: number;
  bubbleFontSize: number;   // 气泡字体大小 px，默认 14
  bubblePadding: number;    // 气泡内边距 px，默认 10
  shadowEnabled: boolean;
  shadowDepth: number;
  // 气泡样式：rounded 圆润 / tail 小尾巴 / flat 扁平 / border 描边
  bubbleStyle?: 'rounded' | 'tail' | 'flat' | 'border';
  customCss: string;
  // 转账卡片颜色
  transferColor: string;
  // 转账卡片文字颜色
  transferTextColor?: string;
  // 转账卡片说明/底部文字颜色
  transferSubTextColor?: string;
  // 转账卡片图标颜色
  transferIconColor?: string;
  // 转账卡片圆角
  transferBorderRadius?: number;
  // 已读标记位置：inside=气泡内右下角，outside=气泡左侧
  readReceiptPosition?: 'inside' | 'outside';
  // 已读标记颜色
  readReceiptColor?: string;
  // 聊天输入框背景色
  chatInputBg?: string;
  // 聊天输入框文字颜色
  chatInputTextColor?: string;
  // 时间标签颜色
  timeLabelColor?: string;
  // 群聊昵称颜色
  nicknameColor?: string;
  // 来电背景图
  callBg?: string;
  // 来电背景图透明度
  callBgOpacity: number;
  // 夜间模式
  darkMode: boolean;
  // 表情包大小 px
  emojiSize: number;
  // 按键/强调色
  buttonColor: string;
  // 消息弹窗通知开关
  enableMessageNotifications: boolean;
  // 联系人/资料页背景
  contactBackgroundType: 'color' | 'image';
  contactBackgroundColor: string;
  contactBackgroundImage: string;
  contactBackgroundOpacity: number;
  // PWA / 浏览器标签页图标（data URL）
  appIcon?: string;
}

// 聊天框
export interface ChatBox {
  id: string;
  name: string;
  createdAt: number;
}

// 联系人设置
export interface CompanionTheme {
  backgroundColor: string;  // 页面背景色
  backgroundOpacity: number; // 背景色/壁纸透明度 0-1
  wallpaper: string;        // 壁纸图片（留空则用背景色）
  textColor: string;        // 主文字颜色
  accentColor: string;      // 呼吸灯/强调色
  micColor: string;         // 麦克风按钮色
  micActiveColor: string;   // 倾听时麦克风按钮色
}

export interface ContactSettings {
  id: string;
  myAvatar: string;
  theirAvatar: string;
  nickname: string;
  myName: string;
  tapMessage: string;
  tapMessageMe: string;
  tapMessageThem: string;
  // 拍一拍随机文案池
  tapMessages: string[];
  // 商店礼物
  gifts?: Gift[];
  // 陪伴模式累计秒数
  companionSeconds?: number;
  // 陪伴模式主题
  companionTheme: CompanionTheme;
  replyDelaySec: number;
  noReplyChance: number;
  autoTapChance: number;
  autoVoiceChance: number;
  autoCallChance: number;
  hangupChance: number;
  momentsPostTimes: string[];
  momentsReplyDelay: number;
  momentsBio: string;
  momentsBg: string;
  myBio: string;
  letterReplyDelaySec: number;
  letterProactiveChance: number;
  letterProactiveIntervalDays: number; // 主动来信最小间隔天数
  proactiveMsgIntervalMinutes: number; // 主动发消息间隔分钟数（0=关闭）
  // 每条消息最少/最多几句字卡（默认1/1）
  sysMinSentences: number;
  sysMaxSentences: number;
  // 拼字卡：多张字卡拼成一句话的概率（0=关闭）和最多拼几张
  combineCardChance: number;
  combineCardMax: number;
  // 转账：对方转账概率，以及我预设的金额列表（逗号分隔）
  transferChance: number;
  transferAmounts: string;
  // 朋友圈发图片概率
  momentsImageChance: number;
  // 朋友圈拼字卡概率
  momentsCombineChance: number;
  // 朋友圈拼字卡最多拼几张
  momentsCombineMax: number;
  // NPC 自动点赞/评论朋友圈概率
  momentsNpcLikeChance: number;
  momentsNpcCommentChance: number;
  // 我评论/回复朋友圈后，NPC 不回复的概率（10% = 90% 会回复）
  momentsCommentNoReplyChance: number;
  // 后台推送通知开关
  pushEnabled: boolean;
  // 自动备份间隔（小时，0=关闭）
  autoBackupIntervalHours: number;
  // 自动备份文件名前缀
  autoBackupFileName: string;
  // 引用回复概率（随机引用我的话并回答）
  replyQuoteChance: number;
  // 对方主动发表情包概率
  autoEmojiChance: number;
  // 一起听歌：歌单
  musicPlaylist: Song[];
  // 一起听歌开关
  musicEnabled: boolean;
  // 联系人选择页标语
  pickerTagline: string;
  // 是否置顶
  pinned: boolean;
  // 废弃字段，保留兼容
  neteaseLink?: string;
  // 是否是群聊
  isGroup: boolean;
  // 群聊成员联系人ID列表
  groupMemberIds: string[];
  // 纪念日（YYYY-MM-DD 格式，可修改）
  anniversary: string;
  // 倒数日/正数日事件列表（纪念日、生日等）
  daysMatterEvents: DaysMatterEvent[];
  // 聊天框（每个联系人可多个，默认一个主聊天框）
  chatBoxes: ChatBox[];
  currentChatBoxId: string;
  // 后台保活：开启后请求 WakeLock + 播放静音音频 + 弹窗引导
  enableBackgroundKeepAlive: boolean;
}

export interface DaysMatterEvent {
  id: string;
  label: string;     // 事件名称，如：纪念日、生日
  date: string;      // YYYY-MM-DD
  mode: 'countup' | 'countdown'; // countup=正数日，countdown=倒数日
}

// 表情包
export interface EmojiPack {
  id: string;
  name: string;
  url: string;
}

// 朋友圈动态
export interface MomentPost {
  id: string;
  content: string;
  images: string[];
  timestamp: number;
  comments: MomentComment[];
  liked?: boolean;           // 我（user）是否点赞
  likedBySystem?: boolean;   // 对方（system）是否点赞（旧字段保留兼容）
  fromUser?: boolean;        // true=我发的, false=对方发的(默认)
  emojiImage?: string;       // 表情包动态图片（优先展示）
  // NPC 持久化互动数据
  npcLikers?: string[];      // 已点赞的 NPC 名字列表
  npcComments?: { id: string; name: string; content: string; emoji?: string }[]; // NPC 评论
}

export interface MomentComment {
  id: string;
  sender: 'user' | 'system';
  content: string;
  timestamp: number;
  emoji?: string; // 评论中使用的表情包图片
  replyToId?: string;
  replyToName?: string;
}

// 主页设置
export interface HomeSettings {
  backgroundImage: string;  // 主屏幕背景图
  topBannerImage: string;   // 卡片顶部横幅背景图
  avatar: string;           // 主屏幕头像（圆形）
  theirAvatar: string;       // 主屏幕对方头像（圆形），独立于联系人
  relationName: string;     // 主屏幕对方昵称/关系名，独立于联系人
  displayName: string;      // 昵称
  handle: string;           // @用户名
  birthDate: string;        // 日期/生日
  location: string;         // 位置
  signature: string;        // 个性签名
  polaroidImage: string;    // 拍立得照片1
  polaroidImage2: string;   // 拍立得照片2
  chatPreview1: string;     // 对话预览1（对方）
  chatPreview2: string;     // 对话预览2（自己）
  darkMode: boolean;        // 主屏幕暗色模式
  cardOpacity?: number;     // 主屏幕白色卡片透明度（0-1）
  // 4个Dock图标自定义（名字+图标图片）
  dockIcons: { id: string; name: string; iconImage: string; path: string; }[];
  // 锁屏自定义
  lockScreenBg: string;
  lockScreenName: string;
  lockScreenMessage: string;
  lockScreenTimeFormat: '12h' | '24h';
  lockScreenShortcuts: boolean;
  // 锁屏开关：开启后才显示锁屏
  lockScreenEnabled: boolean;
  // 锁屏密码：空字符串表示无密码，轻触即可解锁
  lockScreenPassword: string;
  // 自定义主屏幕（右侧屏幕）字段
  customBackgroundImage: string;   // 自定义主屏幕背景图
  customAvatar: string;           // 自定义主屏幕头像
  customDisplayName: string;      // 自定义主屏幕昵称
  customLocation: string;         // 自定义主屏幕位置
  customPolaroidImage: string;    // 自定义主屏幕拍立得照片
  customCardTitle: string;        // 自定义主屏幕信息卡标题
  customCardSubtitle: string;     // 自定义主屏幕信息卡副标题
  customCardBody: string;         // 自定义主屏幕信息卡正文
  customCardDate: string;         // 自定义主屏幕信息卡日期
  customWidgetText: string;       // 自定义主屏幕双头像组件下方文案
  customWidgetBubbleLeft: string; // 自定义主屏幕左侧对话框文案
  customWidgetBubbleRight: string;// 自定义主屏幕右侧对话框文案
  customWidgetAvatarLeft: string; // 自定义主屏幕左侧头像
  customWidgetAvatarRight: string;// 自定义主屏幕右侧头像
  customScreenPattern: 'dots' | 'solid' | 'image'; // 自定义屏幕背景样式
  // 4个自定义主屏幕应用图标
  customApps: { id: string; name: string; iconImage: string; path: string; }[];
}

export const DEFAULT_HOME: HomeSettings = {
  backgroundImage: '',
  topBannerImage: '',
  avatar: '',
  theirAvatar: '',
  relationName: '',
  displayName: '',
  handle: '',
  birthDate: '',
  location: '',
  signature: '',
  polaroidImage: '',
  polaroidImage2: '',
  chatPreview1: '',
  chatPreview2: '',
  darkMode: false,
  cardOpacity: 1,
  dockIcons: [
    { id: 'chat', name: '微信', iconImage: '', path: '/contacts/picker' },
    { id: 'moments', name: '朋友圈', iconImage: '', path: '/moments' },
    { id: 'days', name: '倒数日', iconImage: '', path: '/days' },
    { id: 'beauty', name: '美化', iconImage: '', path: '__beauty__' },
    { id: 'settings', name: '设置', iconImage: '', path: '/settings' },
  ],
  lockScreenBg: '',
  lockScreenName: '',
  lockScreenMessage: '',
  lockScreenTimeFormat: '24h',
  lockScreenShortcuts: false,
  lockScreenEnabled: false,
  lockScreenPassword: '',
  customBackgroundImage: '',
  customAvatar: '',
  customDisplayName: '',
  customLocation: '',
  customPolaroidImage: '',
  customCardTitle: '',
  customCardSubtitle: '',
  customCardBody: '',
  customCardDate: '',
  customWidgetText: '',
  customWidgetBubbleLeft: '',
  customWidgetBubbleRight: '',
  customWidgetAvatarLeft: '',
  customWidgetAvatarRight: '',
  customScreenPattern: 'dots',
  customApps: [
    { id: 'companion', name: '陪伴模式', iconImage: '', path: '/companion/select' },
    { id: 'mailbox', name: '信箱', iconImage: '', path: '/letter/inbox' },
    { id: 'beauty', name: '美化', iconImage: '', path: '__beauty__' },
    { id: 'settings', name: '设置', iconImage: '', path: '/settings' },
    { id: 'mydiary', name: '日记', iconImage: '', path: '/my-diary' },
    { id: 'moments', name: '朋友圈', iconImage: '', path: '/moments' },
  ],
};

// 歌曲
type Song = { id: string; name: string; artist?: string; url: string };
export type { Song };

// 陪伴场景
export const COMPANION_SCENES = ['学习', '工作', '休息', '运动'] as const;
export type CompanionScene = typeof COMPANION_SCENES[number];

// 陪伴实时配置（默认使用，不可自定义）
export interface CompanionConfig {
  baseHeartbeat: number;
  baseTemperature: number;
  baseDistance: number;
  heartbeatRange: number;
  tempRange: number;
  distanceRange: number;
  updateInterval: number;
}

export const DEFAULT_COMPANION_CONFIG: CompanionConfig = {
  baseHeartbeat: 72,
  baseTemperature: 36.5,
  baseDistance: 1.2,
  heartbeatRange: 15,
  tempRange: 0.4,
  distanceRange: 0.5,
  updateInterval: 1500,
};

// 陪伴背景预设
export const COMPANION_BACKGROUNDS = [
  { id: 'aurora', name: '极光', value: 'linear-gradient(135deg, #2d1b36 0%, #4a2c55 50%, #2d1b36 100%)' },
  { id: 'ocean', name: '深海', value: 'linear-gradient(135deg, #0f1b2d 0%, #1a3a52 50%, #0f1b2d 100%)' },
  { id: 'sunset', name: '日落', value: 'linear-gradient(135deg, #3d1f1f 0%, #6b3a2a 50%, #3d1f1f 100%)' },
  { id: 'forest', name: '森林', value: 'linear-gradient(135deg, #142d1f 0%, #2a523a 50%, #142d1f 100%)' },
  { id: 'night', name: '深夜', value: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a33 50%, #0d0d1a 100%)' },
  { id: 'rose', name: '玫瑰', value: 'linear-gradient(135deg, #3d1f2d 0%, #6b2a4a 50%, #3d1f2d 100%)' },
] as const;

export type CompanionBackground = typeof COMPANION_BACKGROUNDS[number];

// 陪伴记录
export interface CompanionSession {
  id: string;
  contactId: string;
  scene: CompanionScene;
  activity?: string;
  background?: string; // 渐变值或图片 URL
  startTime: number;
  endTime: number;
  duration: number;
  config: CompanionConfig;
  heartbeat: number[];
  temperature: number[];
  direction: string[];
  distance: number[];
  log: { time: number; text: string; sender?: 'user' | 'system' }[];
}

// 默认外观设置
export const DEFAULT_APPEARANCE: AppearanceSettings = {
  backgroundType: 'color',
  backgroundColor: '#FFFFFF',
  backgroundImage: '',
  backgroundOpacity: 1,
  userBubbleColor: '#F2F2F2',
  userBubbleTextColor: '#333333',
  systemBubbleColor: '#F2F2F2',
  systemBubbleTextColor: '#333333',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  borderRadius: 18,
  bubbleFontSize: 14,
  bubblePadding: 10,
  shadowEnabled: false,
  shadowDepth: 0,
  bubbleStyle: 'rounded',
  customCss: '',
  transferColor: '#F2A2A2',
  transferTextColor: '#FFFFFF',
  transferSubTextColor: 'rgba(255,255,255,0.7)',
  transferIconColor: '#FFFFFF',
  transferBorderRadius: 16,
  readReceiptPosition: 'outside',
  readReceiptColor: '',
  chatInputBg: '',
  chatInputTextColor: '',
  timeLabelColor: '',
  nicknameColor: '',
  callBgOpacity: 1,
  darkMode: false,
  emojiSize: 64,
  buttonColor: '#F2A2A2',
  enableMessageNotifications: true,
  contactBackgroundType: 'color',
  contactBackgroundColor: '#FAFAFA',
  contactBackgroundImage: '',
  contactBackgroundOpacity: 1,
  appIcon: '',
};

// 默认联系人设置
export const DEFAULT_MINIMAX_SETTINGS: MiniMaxSettings = {
  enabled: false,
  voiceId: 'male-qn-qingse',
  apiKey: '',
  groupId: '',
  speed: 1,
};

export const DEFAULT_CONTACT: ContactSettings = {
  id: 'default',
  myAvatar: '',
  theirAvatar: '',
  nickname: '',
  myName: '',
  tapMessage: '',
  tapMessageMe: '',
  tapMessageThem: '',
  tapMessages: [],
  companionTheme: {
    backgroundColor: '#FAF9F6',
    backgroundOpacity: 1,
    wallpaper: '',
    textColor: '#2F2F2F',
    accentColor: '#F2A2A2',
    micColor: '#A7D7C5',
    micActiveColor: '#E88C8C',
  },
  replyDelaySec: 2,
  noReplyChance: 1,
  autoTapChance: 5,
  autoVoiceChance: 5,
  autoCallChance: 5,
  hangupChance: 6,
  momentsPostTimes: [],
  momentsReplyDelay: 30000,
  momentsBio: '',
  momentsBg: '',
  myBio: '',
  letterReplyDelaySec: 5,
  letterProactiveChance: 20,
  letterProactiveIntervalDays: 1,
  proactiveMsgIntervalMinutes: 0,
  sysMinSentences: 1,
  sysMaxSentences: 1,
  combineCardChance: 0,
  combineCardMax: 3,
  transferChance: 10,
  transferAmounts: '520,1314,66.6,188,888',
  momentsImageChance: 20,
  momentsCombineChance: 10,
  momentsCombineMax: 3,
  momentsNpcLikeChance: 100,
  momentsNpcCommentChance: 0,
  momentsCommentNoReplyChance: 0,
  pushEnabled: false,
  autoBackupIntervalHours: 0,
  autoBackupFileName: 'soulcard_backup',
  replyQuoteChance: 20,
  autoEmojiChance: 35,
  // 后台保活：开启后请求 WakeLock + 播放静音音频 + 弹窗引导
  enableBackgroundKeepAlive: false,
  musicPlaylist: [],
  musicEnabled: false,
  gifts: [],
  companionSeconds: 0,
  pickerTagline: '',
  pinned: false,
  isGroup: false,
  groupMemberIds: [],
  anniversary: '',
  daysMatterEvents: [],
  chatBoxes: [{ id: 'main', name: '主聊天框', createdAt: Date.now() }],
  currentChatBoxId: 'main',
};

// 问卷
export interface QuestionnaireItem {
  id: string;
  title: string;           // 问卷标题（如"测一测"）
  questions: Question[];   // 多题，每题多个选项
  answers?: QuestionnaireAnswer[]; // 对方的回答
  sentAt: number;          // 发送时间
  answeredAt?: number;     // 回答时间
}

// 日记
export interface DiaryComment {
  id: string;
  author: 'player' | 'system';
  authorName: string;
  content: string;
  replyToId?: string;
  replyToName?: string;
  createdAt: number;
}

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  createdAt: number;     // 发布时间（NPC 为生成时间，玩家为保存时间）
  author: 'player' | 'system'; // 作者类型
  contactId?: string;    // NPC 日记所属联系人
  mood?: string;         // 心情标签
  weather?: string;      // 天气标签
  privacy?: string;      // 可见范围（如公开 / 仅自己）
  comments?: DiaryComment[];
}

// 唯美引言库
export const QUOTES = [
  '灵魂的共鸣，无需言语',
  '你是我灵魂深处的那道光',
  '在宇宙的尽头，我们终将相遇',
  '每一次心跳，都是对你的思念',
  '双生火焰，永不分离',
  '你的存在，是我最美的奇迹',
  '灵魂的契约，跨越时空',
  '在梦的彼岸，我听见你的呼唤',
  '爱是宇宙最温柔的语言',
  '我们之间，有一条看不见的线',
  '你是我灵魂的另一半',
  '在星光下，我们的灵魂共舞',
  '每一次呼吸，都与你相连',
  '宇宙安排了我们的相遇',
  '你的名字，刻在我的灵魂里',
  '灵魂伴侣，是宇宙最深的秘密',
  '在时间的河流里，我们终将重逢',
  '你是我心中最柔软的角落',
  '灵魂的频率，只有你能听见',
  '在爱的维度里，我们永远在一起',
];

// 多人朋友圈
export interface PublicMoment {
  id: string;
  nickname: string;
  content: string;
  images: string[];
  created_at: string;
  likes_count: number;
  comments_count: number;
  delete_token?: string;
  comments?: PublicMomentComment[];
  liked?: boolean;
}

export interface PublicMomentComment {
  id: string;
  moment_id: string;
  nickname: string;
  content: string;
  created_at: string;
  delete_token?: string;
  parent_id?: string;
  reply_to_nickname?: string;
}