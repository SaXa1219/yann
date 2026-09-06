import { useEffect, useState } from 'react';

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 挂载后立刻触发进入动画
    const t0 = setTimeout(() => setVisible(true), 30);
    const t1 = setTimeout(() => setFadeOut(true), 1500);
    const t2 = setTimeout(() => onDone(), 1950);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white select-none pointer-events-none"
      style={{ opacity: fadeOut ? 0 : 1, transition: 'opacity 0.4s ease' }}
    >
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.92)',
          transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1)',
        }}
        className="flex flex-col items-center gap-6"
      >
        {/* INS 标志性渐变圆环图标 */}
        <div className="relative">
          {/* 外层渐变光晕 */}
          <div
            className="absolute inset-0 rounded-[28px] scale-110 opacity-20 blur-2xl"
            style={{ background: 'linear-gradient(45deg,#feda77,#f58529,#dd2a7b,#8134af,#515bd4)' }}
          />
          {/* 主图标 */}
          <div
            className="relative w-[90px] h-[90px] rounded-[28px] flex items-center justify-center shadow-xl"
            style={{
              background: 'linear-gradient(135deg,#feda77 0%,#f58529 25%,#dd2a7b 60%,#8134af 85%,#515bd4 100%)',
            }}
          >
            {/* 聊天气泡 icon（白色描边） */}
            <svg viewBox="0 0 24 24" className="w-11 h-11" fill="none"
              stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="8" y1="10" x2="16" y2="10" strokeOpacity="0.85" />
              <line x1="8" y1="14" x2="13" y2="14" strokeOpacity="0.65" />
            </svg>
          </div>
        </div>

        {/* 文字区 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">yann语</h1>
          <p className="mt-1.5 text-[13px] text-gray-400 tracking-widest font-light">
            灵魂的私语 · 温柔相伴
          </p>
        </div>

        {/* INS 风格的细线加载条 */}
        <div className="w-16 h-[2px] rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg,#f58529,#dd2a7b,#8134af)',
              width: visible ? '100%' : '0%',
              transition: 'width 1.3s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
