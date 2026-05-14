# 和宝宝的温暖小窝

这是一个情侣私密相册和视频小窝，目标是做到三件事：可以从任何地方访问、只允许你们两个人登录、上传后尽量不占本地硬盘。

当前前端已经做成了一个可登录的私密主页，后面要补的是后端鉴权、真实上传和云存储接入。

你已经买好的腾讯云信息如下，后面接入时会直接用到：

- 域名：`pjdizwj.site`
- COS 存储桶：`pjdizwj-1432963319`
- COS 地域：`ap-hongkong`
- COS 访问地址：`https://pjdizwj-1432963319.cos.ap-hongkong.myqcloud.com`

## 你现在先这样做

先不要买云服务器。对你现在这个阶段，最省心的路线是：腾讯云域名 + 腾讯云 COS + Vercel 部署前端。

域名先买 `.com`，网站先放海外节点，等以后你们稳定使用了，再考虑国内部署和备案。

## 第一步：注册腾讯云账号并完成实名认证

先去腾讯云注册账号，完成实名认证。后面买域名、开 COS、绑解析都要用到这个账号。

如果你之后想把网站放到中国大陆并让国内访问更稳，实名认证和备案都会用到同一个账号，所以这一步一定先做。

## 第二步：购买一个域名

优先买一个简单、好记的 `.com` 域名。不要一开始买太复杂的后缀，也不要刻意追求很花哨的名字。

买完以后，先把域名留着，不用急着解析。等 Vercel 部署好以后，再把域名指过去。

推荐做法是：

- 域名买在腾讯云
- 以后网站解析也继续放在腾讯云
- 这样你后面只需要在一个平台里管理 DNS

## 第三步：开通腾讯云 COS

COS 是你们的照片和视频仓库，不要把大文件长期放在前端服务器上。

开通后，新建一个存储桶，区域先选香港或新加坡这类海外区域。这样你现在不用备案，也能先把网站跑起来。

存储桶创建时可以先这样理解：

- 公共访问先不要全开
- 上传功能以后走后端签名链接
- 下载或播放时再按需要生成临时访问地址

这样更安全，也更适合私密内容。

如果你后面把上传改成浏览器直传 COS，记得在 COS 桶里加一条跨域规则，至少允许 `PUT`、`GET`、`HEAD`、`OPTIONS`，并把你的网站域名加入允许来源，否则浏览器会在上传前拦住请求。

如果你现在已经把桶建好了，那下一步就不是再改桶，而是准备把这些信息写进项目环境变量里，后面上传接口会直接读取：

- `NEXT_PUBLIC_SITE_URL=https://pjdizwj.site`
- `NEXT_PUBLIC_COS_BUCKET=pjdizwj-1432963319`
- `NEXT_PUBLIC_COS_REGION=ap-hongkong`
- `COS_SECRET_ID=...`
- `COS_SECRET_KEY=...`
- `APP_LOGIN_USERNAME=pjdizwj`
- `APP_LOGIN_PASSWORD=你们现在的登录密码`
- `APP_SESSION_SECRET=一个够长的随机字符串`

其中 `COS_SECRET_ID` 和 `COS_SECRET_KEY` 先不要写到仓库里，等我下一步带你接上传接口时再放到本地 `.env.local`。
现在登录也已经改成后端会话了，所以 `.env.local` 里还要补上登录用户名、密码和会话密钥。

如果你想把日记和评论从本地 JSON 升级成真正的云数据库，优先推荐 Supabase。你只需要再补这两个值：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

下面是你需要在 Supabase 控制台做的事：

1. 注册 Supabase 账号并创建一个新项目。
2. 记住项目密码，等会建表会用到。
3. 打开 SQL Editor，执行下面这段建表语句：

```sql
create table if not exists warm_nest_entries (
	id bigint primary key,
	date text not null,
	title text not null,
	note text not null,
	media jsonb not null default '[]'::jsonb,
	comments jsonb not null default '[]'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
```

4. 在 Project Settings -> API 里找到项目 URL 和 `service_role` key。
5. 把它们填进本地 `.env.local`。

如果你现在不想接 Supabase，也没关系，项目会继续用本地 JSON 文件。等你把 Supabase 的两个值补上，它会自动切过去。

如果你已经在本地用了几天，想把现有内容一次性搬到 Supabase，直接运行：

```bash
npm run import:supabase
```

这个命令会读取 `.data/warm-nest-entries.json`，然后把里面的条目写入 Supabase 表。

## 第四步：先把网站部署到 Vercel

当前这个 Next.js 项目先部署到 Vercel，原因很简单：

- 不用你自己维护服务器
- Next.js 部署非常顺手
- 前端先上线，后面再接后端和 COS

等 Vercel 上线以后，再把你买的腾讯云域名解析过去。

## 第五步：之后再接真实上传

你现在这个项目里已经有了登录页和主页结构，下一步我们会把“上传图片/视频”做成真实功能。

实际实现时不要直接让浏览器把大视频传给前端服务器，而是这样走：

1. 前端点击上传
2. 后端先生成 COS 的临时上传地址
3. 浏览器直接把文件传到 COS
4. 上传成功后，后端记录这条内容属于哪一天

这个方式最适合大文件，也最省心。

你现在这一步已经准备好了：域名和桶都确定了，下一步就是把上传接口接到 COS 上。

## 第六步：之后再做真正的登录鉴权

现在页面里的登录先作为视觉和交互骨架，后面再接真正的鉴权。

最简单的做法是：

- 一个固定用户名
- 一个固定密码
- 登录成功后发一个会话状态

等你们后面要更安全时，再升级成数据库账号和更完整的访问控制。

## 什么时候才需要备案和大陆部署

如果你现在只想先用起来，不想被流程卡住，就先别做国内部署。

等你确定这个小窝会长期使用，并且你希望国内访问也很稳定的时候，再考虑：

- 备案
- 国内节点
- 国内对象存储

这三样可以放到后面做，不影响你现在先上线。

## 当前项目状态

- 已完成：登录页和主题主页
- 已完成：封面图背景和按年月日的内容骨架
- 下一步：腾讯云 COS 上传
- 再下一步：后端鉴权
- 再下一步：真正的日记页和评论保存

## 本地开发

```bash
npm run dev
```

打开 `http://localhost:3000` 查看效果。

## 上线和多设备使用

你现在这套代码已经适合直接部署到线上，部署完成后，手机、平板、另一台电脑都可以通过同一个网址登录、上传和查看内容。

最省事的路线还是：Vercel + 腾讯云域名 + 腾讯云 COS。

### 第一步：把项目部署到 Vercel

1. 把当前仓库推到 GitHub。
2. 在 Vercel 导入这个仓库。
3. 把下面这些环境变量填到 Vercel 的 Project Settings 里：
	- `APP_LOGIN_USERNAME`
	- `APP_LOGIN_PASSWORD`
	- `APP_SESSION_SECRET`
	- `NEXT_PUBLIC_SITE_URL`
	- `NEXT_PUBLIC_COS_BUCKET`
	- `NEXT_PUBLIC_COS_REGION`
	- `COS_SECRET_ID`
	- `COS_SECRET_KEY`
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
4. 部署完成后，先用 Vercel 分配的临时地址测试登录和上传。

### 第二步：绑定你买好的域名

1. 在 Vercel 的 Domain 页面添加 `pjdizwj.site`。
2. 按 Vercel 提示去腾讯云 DNS 里改解析记录。
3. 等 DNS 生效后，用你的正式域名访问网站。
4. 如果后面想换到别的服务器，也可以继续沿用这个域名，只要把 DNS 指向新的地址就行。

### 第三步：在其他设备上传

部署到线上后，其他设备上传其实不需要额外改代码，直接这样用就行：

1. 打开你绑定好的网址。
2. 输入同一组账号密码登录。
3. 选择图片或视频上传。

因为上传是直接走 COS，文件不会先堆在当前电脑上，所以别的设备也能正常上传。当前这台电脑和其他设备之间不会互相依赖。

### 第四步：视频和图片后续升级

现在的效果已经可以直接播放视频、点击图片放大。后面如果你想更像 YouTube，可以继续做这几项：

1. 视频分片播放，提升大视频的流畅度。
2. 图片左右切换和双击缩放。
3. 全屏观看和更好的手机端播放控制。

如果你愿意，我下一步就可以继续带你做“上线 + 域名 + 其他设备可上传”的实操步骤。