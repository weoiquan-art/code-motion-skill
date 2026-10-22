# code-motion-skill（jin-code-motion）

JIN 用代码（Remotion）做视频的 Skill：经验文档＋可复用的代码库＋起步模板＋自检工具。做代码动画、宣传片、片头时调用它，或直接参照里面的代码。

- 经验来自 [JIN-motion-](https://github.com/weoiquan-art/JIN-motion-) 的四条片子：Intro、IntroV2、IntroFree、槟城北海宣传片。
- 入口是 [SKILL.md](SKILL.md)；代码目录见 [references/代码目录.md](references/代码目录.md)，缩略图在 `assets/catalog/`。

## 上传到 claude.ai

把整个文件夹打包成 zip（或用发布的 `.skill` 文件），在 claude.ai 的 Skills 设置里上传。之后改了本仓库，要重新上传一次才生效。

## 在 Claude Code 里用

- 新片：`bash tools/new-film.sh <目录>` → `cd <目录> && npm i && npm run fonts && npm run audio && npm run lint` → `npm run render`。
- 已有仓库：把 `library/` 里需要的文件复制进去。

## 结构

```
SKILL.md            流程、硬规矩、环境、文件索引
references/         通用、动效、动画、声音、代码目录、案例
library/            core camera scene transitions map effects ui fonts audio
starter/            起步模板：演示片 Film（打字 → 地点 → 圆窗 → 两景长卷 → 收回）和目录 Gallery
tools/              new-film.sh、fetch-fonts、render-stills、contact-sheet、check-av、coast-extract
assets/             组件缩略图、演示片联系表
```

## 验证（2026-10-22）

起步模板在云端容器里从零建项目：lint 和类型检查通过；演示片 448 帧渲染约 40 秒；配乐 −14.0 LUFS，`check-av` 全部通过（重点动作的声音误差 ≤ 0.02 帧，没有无声的画面跳变）；合成器 32 种声音逐个试过都能出声；目录 10 页都能渲染。配乐好不好听没有人听过。
