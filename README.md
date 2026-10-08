# 方块探险 · 英语第1课

面向三年级儿童与陪学家长的单节互动英语课。唯一目标词为 **block**，包含 “This is a block.” 和 “I have a block.” 两个句子。

## 使用

从「开始探险」进入，依次体验听音、图形选择、亲子跟读、短句使用、字母拼写和描红书写。完成六关领取徽章。iPad 推荐 Safari；所有按钮支持触摸，手写区域支持 Pointer Events（指针事件）。

右上角「换声音」可以选择和试听中英文音色，调整节奏，并在本机保存选择。设备模式使用 Web Speech API（浏览器系统朗读接口），优先匹配可用的增强音色；实际音色取决于设备提供的声音，默认不再固定使用 Samantha。

支持固定 MP3 录音模式：英语 Jenny / Aria 女声，中文晓晓女声。录音生成成功后才启用该模式，文件直接随页面加载，不需要家长或孩子配置 API 密钥。没有生成录音的版本仅显示设备音色设置，录音加载失败会回退到设备朗读。两种模式都需要先由用户点击页面。口语和书写由陪学家长确认。

进度和归一化笔迹保存在 localStorage（浏览器本地存储），无网络采集、不上传录音。新设备或新浏览器的进度相互独立。

## 工程

静态入口：`dist/index.html`。样式：`dist/styles.css`。交互：`dist/app.js`。声音控制：`dist/voice-player.js`。插画为自绘 SVG。

网页无需安装或构建依赖。GitHub Actions 生成固定语音后，将 `dist` 发布到 GitHub Pages。

适当校验：`node --check dist/app.js`，HTML/CSS 解析、资源完整性以及 DOM 环境中的完整闯关流程。设备语音和真实触摸体验仍需要在 iPad Safari 上检查。

## GitHub Pages

建议使用独立公开仓库，分支为 `main`。在仓库的 Settings → Pages → Source 中选择 **GitHub Actions**。工程已包含 `.github/workflows/pages.yml`；它先生成并校验全部 MP3，再发布 `dist`。生成失败会阻止发布，保留已上线版本。

录音使用成熟开源项目 [edge-tts](https://github.com/rany2/edge-tts) 调用在线服务。生成依赖服务的网络可达性和当前可用性；服务故障时需要重试或换为其他录音来源。可先运行 `python scripts/generate_audio.py --plan` 查看清单。

手动生成：安装 `requirements-audio.txt`，然后运行 `python scripts/generate_audio.py`。全部 32 个录音成功后，`dist/assets/audio-catalog.js` 才会被更新为可用状态。

固定录音在 GitHub Actions 发布时生成，不提交到源代码仓库。请在 Actions 中查看录音生成和部署结果。
