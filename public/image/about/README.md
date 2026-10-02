# 个人主页图片位（About / 关于我）

`/about` 页面的「图片墙」内容来自 `src/app/about/page.tsx` 里的 `GALLERY`。**只有 `src` 填了图的条目才会渲染**，所以有几张图就显示几张，不会留下空的虚线框，也不需要凑数。

## 怎么加图

1. 把图片放进这个目录（`public/image/about/`）。
2. 在 `GALLERY` 里复制一条，把 `src` 换成 `/image/about/文件名.jpg`。

```ts
{
    id: 'A2',
    src: '/image/about/gallery-01.jpg', // ← 只改这一行
    alt: '切片 01',
    className: 'col-span-1 md:col-span-2 aspect-square',
    sizes: '(max-width: 768px) 50vw, 25vw',
}
```

- `className` 决定它在网格里占多宽、多高：`col-span-*` 是占几列（大屏共 4 列），`aspect-[…]` 是格子比例。
- `alt` 是无障碍描述（图片加载失败或读屏时用），顺手写一句。
- 想删掉某张图，把那条删掉或把 `src` 清空即可，不会留下空框。

## 比例与裁切

图片用 `object-cover` 填充格子：**格子比例跟图片比例一致时整张图完整显示，不一致时会被裁掉一部分**。想让图片完整显示，就把 `aspect-[…]` 写成图片本身的比例，例如 2600×1381 的图写成 `aspect-[2600/1381]`。

## 当前槽位

| 编号 | 文件 | 尺寸 | 格子比例 |
| --- | --- | --- | --- |
| A1 | `deepseek-flash-v4.png` | 2600×1381 | `aspect-[2600/1381]` |

> 大屏下这一整块是满宽的，所以图片给得越大越清晰。

## 另外两张已存在的图

首屏的头像与人物立绘直接引用现有文件，想换直接覆盖同名文件即可：

- 头像：`public/image/head2.jpg`（正方形，建议 400×400）
- 人物立绘：`public/image/kp5.png`（建议透明底 PNG，会右下角对齐）
