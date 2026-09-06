import HomePage from './pages/HomePage';
import ContactPickerPage from './pages/ContactPickerPage';
import ChatPage from './pages/ChatPage';
import MultiMomentsPage from './pages/MultiMomentsPage';
import SettingsHub from './pages/SettingsHub';
import CardManagePage from './pages/CardManagePage';
import ContactPage from './pages/ContactPage';
import TransferDetailPage from './pages/TransferDetailPage';
import MomentsPage from './pages/MomentsPage';
import VoiceCardPage from './pages/VoiceCardPage';
import ImageCardPage from './pages/ImageCardPage';
import LetterWritePage from './pages/LetterWritePage';
import LetterInboxPage from './pages/LetterInboxPage';
import StatsPage from './pages/StatsPage';
import ContactsPage from './pages/ContactsPage';
import EmojiManagePage from './pages/EmojiManagePage';
import QuestionnairePage from './pages/QuestionnairePage';
import MoodCardPage from './pages/MoodCardPage';
import DaysMatterPage from './pages/DaysMatterPage';
import ChatSettingsPage from './pages/ChatSettingsPage';
import ChatBoxManagePage from './pages/ChatBoxManagePage';
import CompanionSelectPage from './pages/CompanionSelectPage';
import CallSelectPage from './pages/CallSelectPage';
import CompanionSessionPage from './pages/CompanionSessionPage';
import CompanionSummaryPage from './pages/CompanionSummaryPage';
import MiniMaxSettingsPage from './pages/MiniMaxSettingsPage';
import DiaryListPage from './pages/DiaryListPage';
import DiaryDetailPage from './pages/DiaryDetailPage';
import PlayerDiaryPage from './pages/PlayerDiaryPage';
import FeaturesIntroPage from './pages/FeaturesIntroPage';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  { name: '桌面', path: '/', element: <HomePage />, public: true },
  { name: '选择联系人', path: '/contacts/picker', element: <ContactPickerPage />, public: true },
  { name: '微信', path: '/chat', element: <ChatPage />, public: true },
  { name: '多人朋友圈', path: '/multi-moments', element: <MultiMomentsPage />, public: true },
  { name: '设置', path: '/settings', element: <SettingsHub />, public: true },
  { name: '字卡管理', path: '/settings/cards', element: <CardManagePage />, public: true },
  { name: '联系人设置', path: '/settings/contact', element: <ContactPage />, public: true },
  { name: '语音字卡', path: '/settings/voice-cards', element: <VoiceCardPage />, public: true },
  { name: '图片字卡', path: '/settings/image-cards', element: <ImageCardPage />, public: true },
  { name: '表情库', path: '/settings/emoji', element: <EmojiManagePage />, public: true },
  { name: '高频话术', path: '/settings/stats', element: <StatsPage />, public: true },
  { name: '朋友圈', path: '/moments', element: <MomentsPage />, public: true },
  { name: '写信', path: '/letter/write', element: <LetterWritePage />, public: true },
  { name: '收信箱', path: '/letter/inbox', element: <LetterInboxPage />, public: true },
  { name: '转账详情', path: '/transfer/:id', element: <TransferDetailPage />, public: true },
  { name: '联系人管理', path: '/settings/contacts', element: <ContactsPage />, public: true },
  { name: '问卷', path: '/questionnaire', element: <QuestionnairePage />, public: true },
  { name: '心情字卡', path: '/settings/mood-cards', element: <MoodCardPage />, public: true },
  { name: '倒数日', path: '/days', element: <DaysMatterPage />, public: true },
  { name: '聊天设置', path: '/chat/settings', element: <ChatSettingsPage />, public: true },
  { name: '聊天框管理', path: '/settings/chat-boxes', element: <ChatBoxManagePage />, public: true },
  { name: 'MiniMax 语音', path: '/settings/minimax', element: <MiniMaxSettingsPage />, public: true },
  { name: '选择通话对象', path: '/call/select', element: <CallSelectPage />, public: true },
  { name: '陪伴模式选择', path: '/companion/select', element: <CompanionSelectPage />, public: true },
  { name: '陪伴模式', path: '/companion/session', element: <CompanionSessionPage />, public: true },
  { name: '陪伴总结', path: '/companion/summary/:id', element: <CompanionSummaryPage />, public: true },
  { name: '对方日记', path: '/diary', element: <DiaryListPage />, public: true },
  { name: '日记详情', path: '/diary/:id', element: <DiaryDetailPage />, public: true },
  { name: '我的日记', path: '/my-diary', element: <PlayerDiaryPage />, public: true },
  { name: '全部功能介绍', path: '/settings/features', element: <FeaturesIntroPage />, public: true },
];
