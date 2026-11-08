# dsh-wallpaper

给 [DeepSeek Harness](https://github.com/deepseek-ai) 换一张自己的背景壁纸：侧边栏 `deepseek HARNESS` 字标右侧多出一个圆形按钮（深色主题白底黑字、浅色主题黑底白字），点一下选图，壁纸按 **70% 不透明度**铺满整个窗口，滑杆随时可调。

<p align="center"><img src="icon.svg" width="88" height="88" alt="dsh-wallpaper 图标"></p>

## 功能

- **字标旁的圆形按钮**：跟随主题反转——深色主题用 `--dsw-alias-button-primary-fill` 的白底配 `--dsw-alias-label-primary-foreground` 的黑图标，浅色主题反过来（黑底白字），注册在 `shell.overlay` 槽位，贴在侧边栏 `deepseek HARNESS` 字标右侧；侧边栏收起时随品牌行一起隐藏，不占用也不替换任何内置控件
- **选一张本地图片**：点「选择图片」，或直接把图片拖进预览框
- **不透明度 0–100%**：默认 70%，拖动即时生效
- **面板自动半透明**：壁纸存在时，会话区、侧边栏、右栏、底栏一起半透明，让壁纸透出来；点「移除」立刻恢复原来的纯色界面
- **只存在本机**：图片与透明度写进 IndexedDB，不上传，也不发任何网络请求；重开 DSH 自动恢复
- **跟随主题与语言**：浅色/深色各自配色，界面文案跟随 DSH 语言（中文/英文）

## 安装

1. 打开 DSH → **插件** → **添加插件**
2. 填入本仓库地址：

   ```text
   https://github.com/VictorGol/dsh-wallpaper
   ```

3. 确认安装。圆形按钮会出现在字标右侧；如果没出现，重开一次 DSH

需要 DSH 0.2.x 桌面版；插件是纯 JavaScript，没有构建步骤，装完即用。

## 使用

- 点圆形按钮打开面板
- 「选择图片」或拖入图片 → 壁纸立刻生效
- 「不透明度」滑杆调整浓淡（默认 70%）
- 「移除」清掉壁纸，界面恢复原样

## 实现

- **壁纸层**：一个 `position: fixed; inset: 0; z-index: -1` 的图片层插在 `#root` 之前。macOS 桌面端的 frame 本身是透明的，所以这层落在所有面板之下
- **面板半透明**：面板不透明时壁纸是看不见的，所以壁纸存在期间用 `ctx.theme.overrideTokens` 叠加一层 token——`--dsw-alias-bg-base` 改成浅色/深色各自的半透明值，让会话区、侧边栏、右栏、底栏一起透出壁纸；移除壁纸时这一层被 dispose，界面恢复原样
- **按钮定位**：没有槽位分配品牌行右侧的空间，所以按钮按侧边栏实测定位——`[data-sidebar-toggle]` 找到侧边栏与品牌行，品牌 identity 盒子的右沿就是字标末尾，按钮贴在它右侧；窗口缩放、侧边栏拖宽都会重新测
- **本地持久化**：图片以 Blob 存进 IndexedDB，透明度一起保存

## 兼容性

- macOS 桌面版 DSH 0.2.x：实测通过
- Windows 桌面版：按钮位置按侧边栏品牌行计算，不再压住标题栏菜单（未在 Windows 真机验证）
- 浏览器标签页：面板会变半透明，但宿主窗口底色不透明的环境下壁纸可能只在部分区域可见——取决于壳层是否给了透明背景，欢迎 PR

## 卸载

在插件页卸载即可。想连图片一起清掉，先打开面板点「移除」。

## License

MIT · 详见 [LICENSE](LICENSE)

---

## English

A wallpaper picker for DeepSeek Harness: a round button right of the sidebar's `deepseek HARNESS` wordmark (white on dark themes, black on light ones) opens a small panel where you choose a local image, and the image becomes the app wallpaper at **70% opacity** (adjustable 0–100%). It hides with the sidebar.

- **Local only**: the image blob and opacity live in IndexedDB; nothing is uploaded and no network request is made.
- **Translucent surfaces**: while a wallpaper is set, the plugin stacks a `--dsw-alias-bg-base` override through `ctx.theme.overrideTokens` so the frame, conversation, sidebar, right bar and bottom row let the image through. Removing the wallpaper disposes the layer and restores the default surfaces.
- **No build step**: plain JavaScript, installed straight from this repository.

### Install

1. Open DSH → **Plugins** → **Add plugin**
2. Paste `https://github.com/VictorGol/dsh-wallpaper`
3. Confirm. The round button appears right of the `deepseek HARNESS` wordmark; if it does not, reopen DSH.

### Compatibility

Verified on the macOS desktop app (DSH 0.2.x). The button is positioned from the sidebar's brand row, so it also clears the Windows title-bar menu (not verified on a real Windows machine). In a browser tab the panels become translucent, but the wallpaper may only show through where the host window background is transparent.
