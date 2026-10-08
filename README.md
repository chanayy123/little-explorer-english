# 小小探险家 · 英语课程书架

固定网址的三年级亲子英语互动课，按周浏览，工作日每天一课，周五复习。当前课程：2026-10-08 的 block 原课、10-09 方块复习，以及 10-12～10-16 的小花园主题完整五课。

## 使用

从首页进入今日任务，历史课可重玩。课程以 Asia/Shanghai 的当天零点解锁；正常浏览不显示未来课内容，直接打开未来课链接也不能进入。放学后随时学习，不必等到 19:30。日期依赖设备时钟；公开静态源码中的未来数据不属于严格保密。

每课分别保存本机进度与笔迹，最初 block 的存储键保持不变。iPad 可用手指或 Apple Pencil 在画布写，也可选择纸笔，由妈妈确认。**目前没有手指手写自动识别。** 跟读也由妈妈确认，不上传录音或笔迹，不自动评分。换设备或浏览器不同步进度。

声音：固定 MP3，英语 Jenny / Aria、中文晓晓；右上角可试听、切换并保存全站声音偏好。录音失败时回退设备朗读，网页需要由用户点击后播放。

## 内容与维护

课程的唯一内容源：`dist/assets/lessons.json`。固定框架：`index.html` 课程书架、`lesson.html` 课程入口、`book-core.js` 日期/进度、`course-engine.js` 新词与复习互动；原始 block 保留 `app.js`。绘图是自绘 SVG，书写使用 Pointer Events。

后续备课与自动更新说明见 [COURSE_MAINTENANCE.md](COURSE_MAINTENANCE.md)。先读取已有词汇与日期，再追加下一完整周。优先复用框架，只补课程数据和所需图片。

## 发布与校验

GitHub Pages 使用 GitHub Actions，发布 `dist`。工作流先校验课程和日期、运行完整交互流程测试，再生成并核对全部 MP3，成功后发布。语音使用开源 edge-tts，依赖在线服务；服务故障会阻止新版本发布。缓存可减少重复生成。

核心检查：`python scripts/validate_lessons.py`、`node tests/book-core.test.js` 与 JS 语法检查。完整交互测试：安装 jsdom 26.1.0，运行 `python scripts/generate_audio.py --list-texts > .audio-plan.json`，再运行 `node tests/course-flow.test.js`。

真实 iPad Safari 的手指、Apple Pencil 与音频体验需在设备上确认；DOM 流程测试不能替代真机检查。
