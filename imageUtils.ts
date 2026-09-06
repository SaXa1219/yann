/**
 * 用 canvas 压缩图片，防止 base64 超出 localStorage 限额
 * @param file    原始图片文件
 * @param maxW    最大宽度（px）
 * @param maxH    最大高度（px）
 * @param quality JPEG 压缩质量 0~1（PNG 时忽略）
 * @returns       压缩后的 base64 data URL
 */
export function compressImage(
  file: File,
  maxW = 400,
  maxH = 400,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = ev => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // 等比缩放，不超过 maxW × maxH
        let { width, height } = img;
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas context unavailable')); return; }
        // 高质量图像平滑
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // PNG 保留透明通道，先填充白色背景避免黑底
        const isPng = file.type === 'image/png';
        if (!isPng) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        // PNG 图片保持 PNG 输出，避免 JPEG 压缩导致的雾蒙蒙/失真
        if (isPng) {
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
