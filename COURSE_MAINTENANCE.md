# 小小探险家：课程维护

## 目标与边界

为小学三年级、刚开始系统学英语的孩子维护一个固定网址的亲子互动课程书架。学习发生在放学后至睡前，时间不固定。每个工作日的课程从北京时间当天零点开放；历史课程保留，未来课程在正常页面中不能进入。公开静态源代码中的未来内容不属于严格保密。

维护 GitHub 仓库 `chanayy123/little-explorer-english` 的 `main` 分支，发布入口是 GitHub Pages，现有网址为 `https://chanayy123.github.io/little-explorer-english/`。不要新建仓库、替换网址、创建新的 Sites 工程或引入账号。这个文件、课程清单和当前仓库内容是持久上下文；不依赖旧聊天或旧本地目录。

## 一次运行

1. 通过已连接的 GitHub 工具读取本文件、`dist/assets/lessons.json`、`scripts/validate_lessons.py` 与必要源文件。先确认当前分支状态；发布使用正常提交并保护预期分支头，不强推。
2. 以 Asia/Shanghai 计算今天和下周一。确保下一完整自然周的周一到周五已有五课。已齐备则不重复修改、生成语音或部署。
3. 若缺课，在现有主题与词汇历史基础上备好缺失课程。保持旧课 ID、日期、内容和本机存储键；不得覆盖既有学习进度。不会推断孩子已学会哪些词，网页的设备进度不上传。
4. 常规周：周一至周四每天一个新的高频实用词和两句适龄短句；周五综合复习，不强加新词。每天约 8～10 分钟，可由妈妈陪学。复习引用早于本课的课程 ID，不重复把已收录的词当作新词。
5. 必要时扩展 SVG 图片符号与选择题插画；不可让图片或例句与词义不匹配。保持现有画风、触摸按钮、六类学习活动及手写画布。优先复用模板，不每天重写页面。
6. 运行课程验证、日期与进度测试、完整课程流程测试。提交后确认对应 GitHub Actions 工作流成功，固定录音清单可用，Pages 发布成功。失败时保留旧版本，定位并修复；有访问或凭据障碍则明确报告，不假装已经发布。
7. 简短发送当天网页入口及主题。正常情况下三四行即可，不再发送长篇纯文字英语课；本周没有新课的日子可以自由复习。仅在维护失败或需家长决策时展开。

## 内容选择

兴趣可用 Minecraft、创意搭建、植物与动物、儿童熟悉的角色，但应穿插校园、家庭、运动、食物和生活，不一直讲游戏名词。不引入不适龄的暴力内容。词义、冠词、不可数名词、拼写和例句必须准确。孩子口语先以愿意开口、理解并用起来为主，不进行不可靠的自动发音评分。

每个新词课包含听音与画面关联、三次图片选择、妈妈确认跟读、两句使用场景、字母搭建和一次手指/纸笔书写。重复字母必须分别提供，例如 tree 的两个 e。复习课可结合听音选图、短句选择、拼写辨认及生活小任务。

手写笔迹只在设备保存。当前没有手指手写自动识别；由妈妈确认。不得把描红轨迹检查或键盘输入核对宣称为手写识别。若未来需识别，优先成熟识别服务；接入前解决服务凭据、费用和适用性，不能把密钥写进公开网页。

## 数据约定

`dist/assets/lessons.json` 是课程与语音的共享内容源。保留顶层 `version: 1`、`timeZone: "Asia/Shanghai"`、`releaseTime: "00:00"`。课程按日期增长，一天最多一课，周末不加新课。

- 所有课程：唯一 `id`、ISO `date`、`type`、`theme`、`title`、`minutes`。
- `word`：`word`（单个小写英文词）、`meaning`、`ipa`、`phonics`、`context`、`art`、`realTask`；两条 `phrases`（`text`、`translation`、`action`）；三个互异 `choices`，含正确词；`reviewOf` 指向以前的课程。
- `review`：`reviewOf`、`writeWord`、`practical`；`questions` 每题含 `kind: picture|text`、`prompt`、`speak`、三项互异 `options` 与 `answer`。
- 最初的 `block` 课保留 `storageKey: little-explorer-block-v1` 和原 `app.js`，其日期是 2026-10-08。
- 图片通过 `dist/assets/lesson-art.svg` 中的 `<symbol id="单词">` 提供。所有图片选择项均须有符号；不要删旧符号。

`scripts/generate_audio.py` 从所有课程抽取固定语音，英语 Jenny / Aria、中文晓晓。需添加新交互提示时同时补充该脚本的共享中文清单。全部录音成功才写入 ready 清单；生成失败不发布。不要硬编码预期 MP3 数量。

## 检查与发布

静态文件仍在 `dist/`，无需构建。GitHub Actions 包含自动验证、完整交互测试、语音缓存、生成并验证录音及 Pages 发布。缓存仅减少重复语音生成，不是永久存储。

本地核心检查：`python scripts/validate_lessons.py`、`node tests/book-core.test.js`、各 JS 的 `node --check`。完整流程测试使用 jsdom 26.1.0：安装测试依赖后运行 `python scripts/generate_audio.py --list-texts > .audio-plan.json` 和 `node tests/course-flow.test.js`。DOM 测试不等同于实际 iPad Safari、触摸与语音验收。

维护时还应验证当天入口、下一周锁定卡片、直接打开未来课被拦截、刷新和返回后课程各自的进度与手写保存。清空一课不得清空全站；没有云端跨设备同步。
