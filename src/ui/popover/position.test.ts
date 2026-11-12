import { describe, expect, it } from 'vitest';

import { place, placeAtPoint, type PlaceOptions } from './position';

const base: Omit<PlaceOptions, 'anchor' | 'size'> = { viewport: { width: 1000, height: 800 }, side: 'bottom', align: 'start', gap: 4, margin: 8 };
const button = { x: 100, y: 100, width: 80, height: 32 };

describe('place', () => {
  it('空间够时按首选方向和对齐放', () => {
    expect(place({ ...base, anchor: button, size: { width: 200, height: 300 } })).toMatchObject({ left: 100, top: 136, side: 'bottom' });
    // end 对齐左边越界，换回 start
    expect(place({ ...base, anchor: button, align: 'end', size: { width: 200, height: 300 } })).toMatchObject({ left: 100, top: 136 });
    expect(place({ ...base, anchor: { ...button, x: 400 }, align: 'center', size: { width: 200, height: 50 } }).left).toBe(340);
  });

  it('下方放不下、上方更宽敞时翻到上方', () => {
    const anchor = { x: 100, y: 700, width: 80, height: 32 };
    expect(place({ ...base, anchor, size: { width: 200, height: 300 } })).toMatchObject({ side: 'top', top: 700 - 4 - 300 });
  });

  it('两边都放不下时取更宽敞的一边，并限制最大高度', () => {
    const anchor = { x: 100, y: 300, width: 80, height: 32 };
    const p = place({ ...base, anchor, size: { width: 200, height: 1000 } });
    expect(p.side).toBe('bottom');
    expect(p.maxHeight).toBe(800 - 332 - 4 - 8);
    expect(p.top).toBe(336);
  });

  it('右边越界时 start 换成 end 对齐', () => {
    const anchor = { x: 900, y: 100, width: 80, height: 32 };
    expect(place({ ...base, anchor, size: { width: 200, height: 100 } }).left).toBe(980 - 200);
  });

  it('换对齐也放不下时夹在可视区内', () => {
    const anchor = { x: 0, y: 100, width: 1000, height: 32 };
    expect(place({ ...base, anchor, align: 'center', size: { width: 1200, height: 100 } })).toMatchObject({ left: 8, maxWidth: 984 });
  });

  it('右键菜单：鼠标点在右下角时向左上弹出', () => {
    const anchor = { x: 950, y: 750, width: 0, height: 0 };
    expect(place({ ...base, anchor, gap: 0, size: { width: 200, height: 300 } })).toMatchObject({ side: 'top', left: 750, top: 450 });
  });

  it('子菜单：右侧放不下翻到左侧，顶部对齐菜单项', () => {
    const item = { x: 820, y: 200, width: 160, height: 36 };
    expect(place({ ...base, anchor: item, side: 'right', gap: 0, size: { width: 180, height: 200 } })).toMatchObject({ side: 'left', left: 640, top: 200 });
    const low = { x: 100, y: 700, width: 160, height: 36 };
    expect(place({ ...base, anchor: low, side: 'right', gap: 0, size: { width: 180, height: 200 } })).toMatchObject({ side: 'right', left: 260, top: 736 - 200 });
  });
});

describe('placeAtPoint', () => {
  const viewport = { width: 1000, height: 800 };
  it('放得下时左上角就在鼠标位置', () => {
    expect(placeAtPoint({ point: { x: 100, y: 200 }, size: { width: 200, height: 300 }, viewport, margin: 8 })).toMatchObject({ left: 100, top: 200 });
  });

  it('超出右边、下边时贴着边缘往回推，不翻转', () => {
    expect(placeAtPoint({ point: { x: 950, y: 700 }, size: { width: 200, height: 300 }, viewport, margin: 8 })).toMatchObject({ left: 792, top: 492 });
  });

  it('比可视区还高时贴上边，并限制最大高度', () => {
    expect(placeAtPoint({ point: { x: 100, y: 400 }, size: { width: 200, height: 2000 }, viewport, margin: 8 })).toMatchObject({ top: 8, maxHeight: 784 });
  });
});
