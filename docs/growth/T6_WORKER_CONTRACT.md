# T6 Watermark Worker 契约

Free Mini **不得**把 fal 原始 URL 当交付文件。下载走：

`GET /api/downloads/:id` → 若 Free+watermark 且配置了 worker → **bake** → 302 到 `bakedUrl`。

## 环境变量

```bash
PIKBO_WATERMARK_WORKER_URL=https://YOUR_WORKER/bake
PIKBO_WATERMARK_WORKER_SECRET=optional-bearer
PIKBO_WATERMARK_TEXT=Pikbo Free Mini · pikbo.ai
# 管道验证后才可：
# PIKBO_T6_FILE_BAKE=1
```

## 请求

`POST $PIKBO_WATERMARK_WORKER_URL`

```json
{
  "videoUrl": "https://v3b.fal.media/files/.../video.mp4",
  "text": "Pikbo Free Mini · pikbo.ai",
  "jobId": "job_xxx"
}
```

Headers（可选）: `Authorization: Bearer $PIKBO_WATERMARK_WORKER_SECRET`

## 响应

成功：

```json
{ "ok": true, "bakedUrl": "https://cdn.example/out/watermarked.mp4" }
```

失败：

```json
{ "ok": false, "error": "ffmpeg failed" }
```

`bakedUrl` 必须是 **http(s)** 安全 URL，**禁止**原样返回 free raw（除非已烧录）。

## 实现建议

- 独立容器 / Railway / Fly：装 ffmpeg  
- 示例（示意）：`ffmpeg -i in.mp4 -vf "drawtext=text='Pikbo Free Mini':x=20:y=h-40:fontsize=24:fontcolor=white@0.7" out.mp4`  
- 上传 out 到 S3/R2，返回 public URL  

Vercel serverless **不适合**做长视频转码。

## health

`GET /api/health` → `t6.status`:

- `blocked` — 无 worker  
- `worker_configured` — 有 worker，下载时 bake  
- `ready` — `PIKBO_T6_FILE_BAKE=1` 运维确认  
