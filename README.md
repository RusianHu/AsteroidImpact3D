# 希克苏鲁伯陨石撞击模拟 (Chicxulub Impactor Simulation)

## 项目简介

这是一个基于Vue.js 3 + Vite的3D动画网站，模拟了约6600万年前希克苏鲁伯陨石撞击地球的场景。该撞击被认为是导致恐龙灭绝的主要原因之一。

本项目使用Three.js进行3D渲染，Cannon.js进行物理模拟，Element Plus提供UI组件，展示了陨石撞击地球的整个过程，包括大气层效果、碰撞物理效果和爆炸效果。

## 功能特点

- **地球3D模型**：逼真的地球模型，包含纹理和自转效果
- **陨石模型**：随机变形的陨石模型，带有尾迹效果
- **大气层效果**：半透明的大气层效果
- **碰撞物理效果**：基于物理引擎的碰撞模拟
- **爆炸效果**：包含爆炸、冲击波和碎片飞散效果
- **相机控制**：可自由控制视角
- **模拟控制**：可开始、停止、重置模拟，并调整模拟速度
- **移动端适配**：响应式设计，适配不同屏幕尺寸

## 技术栈

- Vue.js 3
- TypeScript
- Vite
- Three.js
- Cannon.js
- Element Plus
- GSAP (动画库)

## 安装与运行

### 前提条件

- Node.js (v14.0.0+)
- npm (v6.0.0+)

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/RusianHu/AsteroidImpact3D.git
cd AsteroidImpact3D
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 构建生产版本
```bash
npm run build
```

## 使用说明

1. **开始模拟**：点击“开始模拟”按钮，陨石将开始向地球移动
2. **停止模拟**：点击“停止模拟”按钮，暂停模拟过程
3. **重置模拟**：点击“重置模拟”按钮，将陨石重置到初始位置
4. **调整速度**：使用速度滑块调整模拟速度
5. **相机控制**：
   - 旋转视角：按住鼠标左键并拖动
   - 缩放：使用鼠标滚轮
   - 平移：按住鼠标右键并拖动

## 科学背景

希克苏鲁伯撞击体是一颗约6600万年前撞击地球的小行星，直径10-15公里，形成了位于现在墨西哥尤卡坦半岛的希克苏鲁伯陨石坑（直径约180公里）。

这次撞击释放了相当于100万亿吨TNT的能量，引发了全球性的环境变化，包括大规模火灾、海啸和长期的气候变化。这被认为是导致恐龙和地球上约75%的物种灭绝的主要原因。

## 未来计划

- 添加更真实的地球模型（法线贴图、高光贴图等）
- 添加云层动画效果
- 添加大气散射效果
- 使用GLTF模型替代简单几何体
- 添加更多科学信息和数据可视化

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](./LICENSE) 文件了解详情

## 作者

[RusianHu](https://github.com/RusianHu)

## 致谢

- [Three.js](https://threejs.org/)
- [Cannon.js](https://schteppe.github.io/cannon.js/)
- [Vue.js](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [Solar System Scope](https://www.solarsystemscope.com/) (地球纹理)
