---
name: jin-code-motion
description: 用代码（Remotion）做视频时必读并调用：动态图形、宣传片、片头、自我介绍短片、地图动画、踩拍剪辑、扁平插画动画、合成配乐。带 JIN 做过的四条片子的经验（IntroFree、北海宣传片等）、可直接复制的代码库（踩拍曲线、摄像机、横向长卷视差、圆窗转场、地图、插画道具、天色、打字和标题、故障效果、配乐合成器）、起步模板和自检工具。只要 JIN 要“做一条视频／动画／宣传片”且成片由代码渲染（不是 Seedance 等视频模型生成），或提到 Remotion、motion、代码动画，就先读本文件。Read before making any code-rendered (Remotion) video.
---

# 代码动画（Remotion）：经验与代码库

**用法：** 用代码做任何一条视频之前，先读完本文件；按需要再读 `references/` 里对应的一份。能用 `library/` 里现成的，就复制过去用，不要重写。

**分工：** 本 skill 只管“画面和声音由代码生成”的片子。用 Seedance 等视频模型生成的片子，写提示词归 jin-seedance-prompt-logic 和各分支 skill。片子本身做在 JIN 的仓库里（目前是 `weoiquan-art/JIN-motion-`），每条片子的案例记录也在那个仓库的 `docs/cases/`。

**出处标签：** 经验都来自 JIN-motion- 的四条片子（Intro、IntroV2、IntroFree、北海宣传片），每条只做过一次；“北海片”的经验 JIN 还没评价成片。都是做法，不是定律；JIN 当次说的话优先。

## 一、每次的流程

1. **先问清楚。** JIN 的需求常常只有一句，而且 JIN 说过“说话可能抽象，请先问完整意思”。用选择题问三项：做成什么（代码动画成片／AI 视频提示词包／两者结合）、画幅和时长、画面文字的语言。其余（主题、结构、配乐）JIN 说“你定”就自己定，交付时写清楚。
2. **查事实。** 画面里出现的数字、专名、史实，每条都查到来源；查不到就不写数字，或者先问。
3. **建项目。** 新片：`bash <本skill>/tools/new-film.sh <目录>`，然后 `npm i`、`npm run fonts`、`npm run audio`、`npm run lint`。在已有仓库（如 JIN-motion-）里做：把需要的 `library/` 文件复制进 `src/`，照它的 CLAUDE.md 做。
4. **先定时间表。** 一个 `timeline.ts` 放 FPS、节拍网格、所有时间点、所有文字和 `ALL_TEXT`；画面和配乐脚本都读它。BPM 选每拍是整数帧的（30 fps：90、100、112.5）。重点动作从节拍那一帧开始（`whip`）。
5. **做画面。** 先看 [代码目录](references/代码目录.md) 和 `assets/catalog/` 的缩略图，挑现成的组件；新写的照 [动效](references/动效.md)、[动画](references/动画.md) 的做法。先定标题安全区再摆道具。
6. **做声音。** `library/audio/synth.ts`，见 [声音](references/声音.md)。画面每一次跳变，同一帧都要有起音。
7. **自检。** `npm run stills -- <合成> stills 帧,帧,…` → `python3 scripts/contact-sheet.py stills sheet.jpg` 看静帧（每个场景、每个转场中间、开头结尾）→ 改 → `npm run render` → 每 2.5 秒抽一帧再看 → `npm run check`。
8. **交付。** lint、渲染、自检都过了再提交推送，把成片发给 JIN。写清楚：做了哪些决定、哪些事实有来源、哪些没核验（配乐没人听过、整片节奏没人看过）。
9. **记下来。** 在片子所在仓库记一份 `docs/cases/<日期>-<名字>/case.md`；新学到、以后会再用的做法补进本 skill 的 references（标出处），能复用的代码整理进 `library/` 并在起步模板里渲一次确认能用。

## 二、硬规矩

- **动画是帧的纯函数。** 只从 `useCurrentFrame()` 算；不用 `useState`、`Math.random()`、`Date`；随机用 `hash`、`noise1`。运动模糊会传入小数帧，曲线和判断都要对小数帧成立（弹簧用 `springAt` 解析解）。
- **字体只用本地文件。** 云端渲染浏览器连不上 Google 字体。画面上的每个字都要进 `ALL_TEXT`，改了字就重跑 `npm run fonts`。漏写的字会悄悄变成系统字体或方框，不报错。
- **时间只有一个来源。** 所有帧号写在时间表里；被配乐脚本 import 的文件不能依赖 React／Remotion，import 路径带 `.ts`。
- **运动模糊只开在快的地方。** 一帧内移动几百像素时，6–7 次采样是叠影，要 14 次；其余帧 1 次。采样不跨硬切。
- **先定节拍再做画面；先定标题区再摆道具。** 100 px 的中文标题一行不超过 10 个字；一句话要停留到读得完（每秒 4–5 个字）。
- **Claude 听不到也看不到动起来的片子。** 只能量（响度、频谱、`check-av.ts`）和看静帧；交付时如实说。

## 三、环境（claude.ai 云端容器）

- Remotion 4.0.532；渲染用 `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`（起步模板的 `render:cloud` 已写好），不要 `playwright install`。
- Node 22 直接跑 `.ts`：`node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/x.ts`。下载走代理要 `NODE_USE_ENV_PROXY=1`。
- 成片放 `out/`（在 `.gitignore` 里），提交用 `git add -f`；单个文件小于 100 MB。

## 四、文件

- `references/通用.md`：开工前、环境、字体、渲染与查看、文案、交付
- `references/动效.md`：节拍网格、踩拍、虚拟摄像机、横向长卷、甩镜和运动模糊、节奏、声画同步、自检、圆窗
- `references/动画.md`：帧的纯函数、whip、打字、挤压拉伸、像素字、图层拆分、扁平插画、地图
- `references/声音.md`：合成器怎么用、有哪些声音、怎么检查
- `references/代码目录.md`：`library/` 每个文件和组件
- `references/案例.md`：四条片子在哪、用了什么、北海片摘要
- `library/`：代码库；`starter/`：起步模板（含演示片 `Film` 和目录 `Gallery`）；`tools/`：建项目、下载字体、连渲静帧、拼图、声画自检、裁海岸线
- `assets/catalog/`：组件缩略图；`assets/starter-demo.jpg`：演示片每 32 帧一张
