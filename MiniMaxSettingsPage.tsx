import { useEffect, useState } from 'react';
import { ArrowLeft, Mic, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import SimpleSwitch from '@/components/SimpleSwitch';
import { useApp } from '@/contexts/AppContext';
import { generateSpeech } from '@/services/tts';
import { toast } from 'sonner';

export default function MiniMaxSettingsPage() {
  const navigate = useNavigate();
  const { miniMaxSettings, updateMiniMaxSettings } = useApp();
  const [enabled, setEnabled] = useState(miniMaxSettings.enabled);
  const [voiceId, setVoiceId] = useState(miniMaxSettings.voiceId);
  const [apiKey, setApiKey] = useState(miniMaxSettings.apiKey);
  const [groupId, setGroupId] = useState(miniMaxSettings.groupId);
  const [speed, setSpeed] = useState<number>(miniMaxSettings.speed ?? 1);
  const [testText, setTestText] = useState('你好，我是你的专属陪伴语音。');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setEnabled(miniMaxSettings.enabled);
    setVoiceId(miniMaxSettings.voiceId);
    setApiKey(miniMaxSettings.apiKey);
    setGroupId(miniMaxSettings.groupId);
    setSpeed(miniMaxSettings.speed ?? 1);
  }, [miniMaxSettings]);

  const handleSave = () => {
    updateMiniMaxSettings({ enabled, voiceId, apiKey, groupId, speed });
    toast.success('MiniMax 设置已保存');
  };

  const handleTest = async () => {
    if (!enabled) {
      toast.info('请先开启 MiniMax 语音');
      return;
    }
    const text = testText.trim();
    if (!text) {
      toast.error('请输入测试短语');
      return;
    }
    setTesting(true);
    try {
      const { audioUrl } = await generateSpeech({ text, voiceId, apiKey, groupId, speed });
      const audio = new Audio(audioUrl);
      audio.onended = () => setTesting(false);
      audio.onerror = () => {
        setTesting(false);
        toast.error('试听播放失败');
      };
      await audio.play();
    } catch (err) {
      setTesting(false);
      toast.error(err instanceof Error ? err.message : '试听失败');
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="返回">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">MiniMax 语音接入</h1>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="w-5 h-5 text-primary" />
              语音合成开关
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">启用 MiniMax 语音</p>
                <p className="text-sm text-muted-foreground">未开启时不会影响当前聊天与电话模式</p>
              </div>
              <SimpleSwitch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">MiniMax API Key</label>
              <Input
                type="password"
                placeholder="使用自定义/克隆音色时填写"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                disabled={!enabled}
              />
              <p className="text-xs text-muted-foreground">使用系统音色无需填写；若使用自定义/克隆音色，需填写你自己账号的 API Key 与 Group ID</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Group ID</label>
              <Input
                type="password"
                placeholder="使用自定义/克隆音色时填写"
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                disabled={!enabled}
              />
              <p className="text-xs text-muted-foreground">MiniMax 控制台「账户管理」中的 Group ID，使用系统音色时留空即可</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">音色 / Voice ID</label>
              <Input
                placeholder="例如：Chinese (Mandarin)_Lyrical_Voice"
                value={voiceId}
                onChange={e => setVoiceId(e.target.value)}
                disabled={!enabled}
              />
              <p className="text-xs text-muted-foreground">可使用 MiniMax 官方系统音色或自定义/克隆音色 ID</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">语速 (Speed)</label>
                <span className="text-sm text-muted-foreground">{speed.toFixed(2)}</span>
              </div>
              <Slider
                min={0.25}
                max={2}
                step={0.05}
                value={[speed]}
                onValueChange={([v]) => setSpeed(v)}
                disabled={!enabled}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>慢</span>
                <span>快</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">测试短语</label>
              <Input
                placeholder="输入要试听的句子…"
                value={testText}
                onChange={e => setTestText(e.target.value)}
                disabled={!enabled}
              />
            </div>

            <Button variant="outline" className="w-full" onClick={handleTest} disabled={testing || !enabled}>
              <Volume2 className="w-4 h-4 mr-2" />
              {testing ? '试听中...' : '试听'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              模型强制使用 speech-2.8-hd，语音由 MiniMax TTS 提供。原始音频为 CDN 链接，24 小时内有效。
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>取消</Button>
          <Button className="flex-1" onClick={handleSave}>保存</Button>
        </div>
      </div>
    </div>
  );
}
