# CocoStudio iOS App

把 side chat 里的网页版「CocoStudio」包成 iOS App（IPA），侧载装到 iPhone 上用。
编辑器本身是我们自己重写的网页版（背景 1 张 + 浮动图最多 3 层、位置/大小/旋转/
不透明度关键帧、锁屏/解锁/睡眠三态、锚点、晃动/回弹、导出 .tendies），
没有搬 CAPlayground 的代码（它是 CC BY-NC-SA，只许非商业）。

## 基本信息

- App 名：CocoStudio
- 包名（Bundle ID）：`com.coco.cocovideo`（没撞 CocoWall 的 `com.coco.cocowall`）
- 版本：1.0.4（build 5）
- 最低系统：iOS 17.0（跟 CocoWall 一致）
- 封装：Capacitor 7.6.10（WebView 壳 + 两个官方插件）
- 签名：未签名 IPA，拿 Apple ID 侧载（id 签），不需要付费开发者账号

## 目录结构

```
mobile-editor-ios/
├── www/                        网页版编辑器（要改编辑器就改这里）
│   ├── index.html              从 artifact shou-ji-bian-ji-qi 导出的最新版
│   └── capacitor-bridge.js     iOS 桥接：只接管 .tendies 导出，见下
├── capacitor.config.json       appId / appName / webDir
├── package.json                Capacitor 依赖（已 npm install 过，含 lock）
├── ios/App/                    Capacitor 生成的 Xcode 工程（App scheme）
│   ├── App/Info.plist          已加照片图库权限说明
│   └── App/Assets.xcassets/    图标：深色底 + 橙色星星（沿用编辑器示例星星）
├── .github/workflows/
│   └── build-ipa.yml           云端出包流程（GitHub Actions，macos-26）
└── README.md                   本文件
```

## 关键点：导出 .tendies 怎么在 App 里出来

编辑器网页版导出是「建 blob → `<a download>` 点一下触发浏览器下载」，
iOS 的 WKWebView 里点下去什么都不会发生（没有下载管理器）。

`www/capacitor-bridge.js` 只做这一件事（不改编辑器任何代码）：

1. 检测到 Capacitor 环境时，拦截 `download` 以 `.tendies` 结尾、且 `href`
   是 `blob:` 的锚点点击；
2. 用 `@capacitor/filesystem` 把包写到 App 缓存目录；
3. 用 `@capacitor/share` 弹出系统分享单，用户点「存储到文件」或直接点
   CocoWall，就能把 `.tendies` 拿走、进 CocoWall 导入刷入。

在普通浏览器里这个桥接不生效，网页版导出行为一点没变。换编辑器新版时，
直接替换 `www/index.html` 即可，桥接文件继续有效。

照片选择用的是编辑器自带的 `<input type=file accept=image/*>`，
WKWebView 里会弹系统照片选择器，`Info.plist` 已加
`NSPhotoLibraryUsageDescription`。

## 出包流程（本机出不了，必须走云端）

这台 Linux VM 没有 macOS/Xcode，本地只能搭工程、验不来编译。
出包走 GitHub Actions，跟 CocoWall 的 `ci/build-ipa.yml` 同一套路：

1. Sage 在 GitHub 新建一个空仓库（比如 `cocovideo`，Public 即可；
   cc 推不上去，GitHub 403，跟 CocoWall 当时一样，得 Sage 手动建仓）；
2. 把本目录全部内容推到该仓库根目录（`node_modules/`、`build/` 不用推，
   已在 `.gitignore` 里）；
3. 仓库里点 Actions → Build CocoStudio IPA → Run workflow；
4. 跑完在 Artifacts 里下载 `MobileEditor-iOS-IPA`，得到
   `CocoStudio-unsigned.ipa`（未签名）。

跑 workflow 前不用做任何改动：`npm ci` → `npx cap sync ios`
（在 macOS 上跑 `pod install`，装 Filesystem/Share 原生代码）
→ `xcodebuild` 未签名编译 → 打包 Payload。

## Sage 拿到 IPA 后怎么装（id 签侧载）

1. iPhone 装 SideStore 或 AltStore（任一即可），用自己的 Apple ID 登录；
2. 把未签名 IPA 传到手机（隔空投送 / 文件 App / 电脑传都行）；
3. 在 SideStore/AltStore 里打开 IPA 安装，第一次装完去
   设置 → 通用 → VPN 与设备管理，信任自己的 Apple ID 证书；
4. 打开「CocoStudio」就能用；免费 Apple ID 签的 App 7 天过期，
   到期前在 SideStore 里点刷新续签即可（跟 CocoWall 的侧载方式一样）。

## 真机上还要验的（还没验过，等 Sage 拿真机走一遍）

1. 导出 .tendies 后分享单能不能弹出来，点「存储到文件」能不能存；
2. 分享单里点 CocoWall 能不能直接打开导入（CocoWall 认 .tendies）；
3. 选背景/浮动图时照片选择器能不能正常弹；
4. 三态切换、锚点、晃动/回弹在 App 里表现跟网页版一致。

## 卡点（实话）

- 本机没有 IPA 文件：Linux VM 无 macOS/Xcode，`xcodebuild` 不存在，
  本地编译这一步做不了；上面云端流程跑通后才有第一个 IPA。
- 需要 Sage 做的：新建 GitHub 仓库并推代码、跑 workflow、下载 IPA、
  真机侧载验证上面 4 条。
- 不需要：付费 Apple 开发者账号（未签名 + id 签侧载即可）、
  改 CocoWall 主工程（完全没动）。
