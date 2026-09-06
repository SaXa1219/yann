import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

interface Section {
  title: string;
  items: { name: string; desc: string; how: string }[];
}

const SECTIONS: Section[] = [
  {
    title: '基础与安全',
    items: [
      {
        name: '锁屏',
        desc: '给应用加一道锁屏，支持有密码和无密码两种模式。',
        how: '在「美化 → 锁屏」里打开「启用锁屏」；设置密码后进入需要输入正确密码，留空密码则轻触即可解锁。锁屏壁纸、昵称、文案、时间格式、快捷入口均可自定义。',
      },
      {
        name: '公告',
        desc: '作者 yann 的欢迎与使用须知。',
        how: '首次进入或清除数据后会自动弹出，阅读后点击确认即可关闭，后续不再打扰。',
      },
      {
        name: '主屏幕自定义',
        desc: '把主屏幕打造成你们专属的样子。',
        how: '长按首页图标可进入编辑；在「美化」里可以改壁纸、头像、昵称、签名、聊天气泡预览，以及每个应用入口的名称、图标和跳转目标。',
      },
    ],
  },
  {
    title: '联系人',
    items: [
      {
        name: '联系人管理',
        desc: '添加、编辑、删除聊天的对象，可设置双方头像与昵称。',
        how: '从首页进入「联系人管理」，点击添加即可新建联系人；聊天页顶部点击对方昵称可进入「聊天设置」。',
      },
      {
        name: '选择联系人',
        desc: '聊天、打电话前选择当前想和谁互动。',
        how: '点击首页「聊天」或「电话」入口后进入选择页；顶部会优先显示置顶/最近聊过的联系人，点击即可开始。',
      },
      {
        name: '纪念日',
        desc: '在主屏幕添加你们的重要日子倒计时。',
        how: '长按首页空白处或进入「美化」添加纪念日组件，设置日期、标题后，主屏幕会自动显示倒计时。',
      },
      {
        name: '聊天框管理',
        desc: '为不同联系人切换不同的聊天主题框。',
        how: '在「聊天设置 → 聊天框管理」里新增或切换聊天框，聊天页背景会跟随变化。',
      },
    ],
  },
  {
    title: '聊天',
    items: [
      {
        name: '发送消息',
        desc: '像普通聊天软件一样发送文字、图片、语音、转账、礼物等消息。',
        how: '在聊天页底部输入框打字后点击发送；点「+」号可展开菜单，选择图片、语音、日记、问卷、转账、商店、小本本、检测链接等功能。',
      },
      {
        name: '字卡回复',
        desc: '对面会按照你给 ta 准备的字卡库抽取内容回复你。',
        how: '在「聊天设置 → 字卡管理」里添加字卡；聊天时对方每次回复都会从当前联系人的字卡里抽取。',
      },
      {
        name: '继续聊',
        desc: '如果对面还没回复，可手动让 ta 继续发消息。',
        how: '点击聊天页底部的「继续聊」按钮，对方会立即按字卡规则再回复一次。',
      },
      {
        name: '对方主动发消息',
        desc: '让对面对你主动发消息，模拟真实恋爱的牵挂感。',
        how: '在「聊天设置 → 联系人设置」里设置「主动发消息间隔」，输入大于 0 的分钟数后，对方会按间隔自动发送 1-3 条字卡。',
      },
      {
        name: '拼字卡',
        desc: '把 2-3 张字卡拼接成一条消息，让回复更丰富。',
        how: '在「联系人设置」里开启「拼字卡」开关；开启后对方聊天时会把多张字卡拼成一句话发给你。',
      },
      {
        name: '表情包',
        desc: '对方会发送你上传的表情包。',
        how: '在「聊天设置 → 表情库」里添加表情；聊天时对方会发送。',
      },
      {
        name: '转账 / 礼物',
        desc: '模拟转账和商店礼物互动。',
        how: '在聊天加号菜单里进入「商店」购买礼物，对方互动时会送你礼物；也可直接发送转账。',
      },
      {
        name: '问卷',
        desc: '给对方发送问卷，支持单选、多选和「问问题」三种题型。',
        how: '通过加号菜单发起问卷，可添加题目并设置题型：单选对面随机选一个选项，多选对面随机选多个选项，「问问题」对面会用一个字卡回复。',
      },
      {
        name: '拍一拍',
        desc: '双击对方头像触发拍一拍效果。',
        how: '在聊天页双击对方头像即可，文案可在「联系人设置」里自定义。',
      },
      {
        name: '头像信息小框',
        desc: '点击对方头像会弹出一个小卡片，可快速查看你们的重要信息。',
        how: '在聊天页单击对方头像，小框会显示 ta 的头像、昵称、当前心情、初聊时间、累计打电话时长和纪念日。双击头像则是拍一拍。',
      },
      {
        name: '小本本',
        desc: '给当前联系人记录一些专属备注或悄悄话。',
        how: '通过聊天加号菜单打开「小本本」，可随时编辑只属于你们的备注内容。',
      },
      {
        name: '检测链接',
        desc: '快速检测当前应用状态或网络连接情况。',
        how: '通过聊天加号菜单打开「检测链接」，按提示运行测试即可。',
      },
      {
        name: '提醒对方发朋友圈',
        desc: '在聊天中手动提醒 ta，30 秒后对方会发布一条朋友圈。',
        how: '在聊天页点击「+」菜单，选择「催发朋友圈」即可（也可通过右下角悬浮球）。对方会根据字卡库随机生成内容，约 30 秒后发布一条朋友圈。',
      },
    ],
  },
  {
    title: '语音与电话',
    items: [
      {
        name: '打电话',
        desc: '模拟语音通话，录音后对方按字卡规则回复。',
        how: '从首页进入「电话」，选择联系人后点击麦克风按钮录音；说完后系统自动从字卡库生成 1-6 条回复，逐条浮现展示。',
      },
      {
        name: '电话陪伴模式',
        desc: '通话时让 AI 用语音把浮现的字卡读出来。',
        how: '在通话界面开启陪伴模式；需要先进入「设置 → MiniMax 语音」填写 API Key 并选择音色，模型固定使用 speech-2.8-hd。',
      },
      {
        name: 'MiniMax TTS 语音消息',
        desc: '字卡会以语音消息形式发送。',
        how: '在「设置 → MiniMax 语音」接入 API Key 后，聊天中字卡有机会变成语音消息，点击即可播放。',
      },
    ],
  },
  {
    title: '一起听',
    items: [
      {
        name: '一起听歌',
        desc: '和联系人一起播放音乐，主屏幕和聊天页都会显示悬浮窗。',
        how: '在「联系人设置 → 一起听歌」里开启开关；直接粘贴网易云链接/歌曲 ID/.mp3 直链添加歌曲。添加后打开悬浮窗点击播放即可。',
      },
    ],
  },
  {
    title: '朋友圈',
    items: [
      {
        name: '朋友圈',
        desc: '发布文字/图片动态，对面会来点赞、评论。',
        how: '从首页进入「朋友圈」，点击发布按钮写动态；对方每天会发布 1-3 条动态。对方评论/回复会在你评论后延迟 1 分钟触发，即使退出页面也会提醒。',
      },
      {
        name: '多人朋友圈',
        desc: '所有访问网站的人都能看到的公共朋友圈。',
        how: '进入「多人朋友圈」后自定义一个昵称，即可发布动态、点赞、评论；只能删除自己的内容和评论，每次进入会自动刷新。',
      },
    ],
  },
  {
    title: '日记',
    items: [
      {
        name: '对方日记',
        desc: '查看对面每天发布的日记。',
        how: '在聊天页加号菜单进入「日记」，可看到对方每天发布的一篇日记；点击进入详情，对方会延迟 1 分钟回复。',
      },
      {
        name: '我的日记',
        desc: '记录你自己的日常，每天只能写一篇。',
        how: '从首页进入「我的日记」，在横线纸编辑器里写下内容后点击「落笔保存」；当天已写过会提示。对方会评论你的日记，你也可以回复。',
      },
    ],
  },
  {
    title: '商店与外观',
    items: [
      {
        name: '商店',
        desc: '购买礼物，丰富互动素材。',
        how: '从首页进入「商店」，浏览并点击购买礼物；购买的礼物会加入礼物池，对方有机会在聊天中送你。',
      },
      {
        name: '美化外观',
        desc: '自定义聊天背景、聊天气泡、主题、电话壁纸透明度等。',
        how: '进入「美化」，可上传聊天背景、电话壁纸，调节透明度，选择整体主题和聊天气泡样式。',
      },
      {
        name: '自定义气泡与小尾巴',
        desc: '用 CSS 自定义气泡圆角、阴影、小尾巴大小和位置。',
        how: '在「美化」里选择「尾巴」气泡，然后在「自定义 CSS」中修改变量：--bubble-radius（圆角）、--bubble-tail-width（尾巴宽）、--bubble-tail-height（尾巴高）、--bubble-tail-offset（尾巴偏移）、--bubble-tail-rotate（尾巴旋转）。系统提供温柔奶油风和 iMessage 风示例。',
      },
    ],
  },
  {
    title: '数据与版本',
    items: [
      {
        name: '导出 / 导入备份',
        desc: '把全部数据保存到本地，或从备份恢复。',
        how: '在「设置」里点击「导出备份」下载 JSON；换设备或清数据后用「导入备份」选择该 JSON 恢复。备份导入不会覆盖新版本配置。',
      },
      {
        name: '刷新',
        desc: '清除浏览器缓存并重新加载，确保拿到最新版本。',
        how: '在「设置」里点击「刷新」，会清除 Service Worker 与缓存后重载；不会删除你的聊天记录、字卡、联系人等数据。',
      },
      {
        name: '清除全部数据',
        desc: '一键清空所有本地数据，不可恢复。',
        how: '在「设置」底部点击「清除全部数据」，确认后所有内容会被删除，请谨慎使用。',
      },
    ],
  },
];

export default function FeaturesIntroPage() {
  const navigate = useNavigate();
  const { appearance } = useApp();
  const isDark = appearance.darkMode;

  return (
    <div className={`min-h-dvh ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#FAFAFA]'}`}>
      <header className={`sticky top-0 z-10 backdrop-blur-md border-b h-14 px-4 flex items-center ${isDark ? 'bg-[#1a1a1a]/90 border-gray-800' : 'bg-white/90 border-gray-100'}`}>
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/settings'))} className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className={`ml-3 text-[15px] font-bold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>全部功能介绍</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          这里列出了当前版本的所有功能与用法。如有功能与页面不一致，以实际页面为准。
        </p>

        {SECTIONS.map(section => (
          <div key={section.title} className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
            <p className={`text-[11px] font-semibold px-4 pt-3 pb-1.5 uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{section.title}</p>
            <div className="divide-y divide-dashed divide-gray-100/10">
              {section.items.map(item => (
                <div key={item.name} className="px-4 py-3.5">
                  <h3 className={`text-[15px] font-semibold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{item.name}</h3>
                  <p className={`text-[13px] leading-relaxed mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.desc}</p>
                  <p className={`text-[12px] leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    <span className="font-medium" style={{ color: 'var(--accent-color)' }}>怎么用：</span>
                    {item.how}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
