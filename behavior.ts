// 系统固定的概率/数量配置，不在联系人设置中暴露给用户
export const SYSTEM_FIXED = {
  // 聊天
  combineCardChance: 3,
  combineCardMax: 3,
  noReplyChance: 1,
  autoTapChance: 5,
  autoVoiceChance: 5,
  autoCallChance: 5,
  hangupChance: 6,
  transferChance: 10,
  shopGiftChance: 2,
  replyQuoteChance: 20,
  autoEmojiChance: 35,
  // 朋友圈表情包概率
  momentsEmojiChance: 10,
  // 主动回信（每日 0~3 封）
  letterDailyMin: 0,
  letterDailyMax: 3,
  // 朋友圈
  momentsCombineChance: 10,
  momentsCombineMax: 3,
  momentsImageChance: 20,
  momentsDailyMin: 1,
  momentsDailyMax: 3,
  momentsReplyDelayMs: 60000,
  diaryReplyDelayMs: 60000,
} as const;
