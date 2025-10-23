import p5 from 'p5';

// NOTE: このファイルには各カテゴリの地図記号を描くロジックがあります。
// 自分で形状を調整できるよう、処理の意図や調整ポイントをコメントで記載しています。
// ------------------------------------------------------------
// 記号の共通仕様:
//   - size 引数はキャンバスのピクセル数 (デフォルト 28px)
//   - 中心は size / 2 付近
//   - g は p5.Graphics (オフスクリーン描画用)
//   - 角度とスケールにランダム性が入り、毎回少し異なる形を描きます
// ------------------------------------------------------------

export interface IconGenerator {
  generateIcon: (categoryId: number, size?: number) => string;
}

// アイコンカテゴリの情報 (ID, ZIP出力時のキー, UI表示ラベル)
export interface SymbolCategory {
  id: number;
  key: string;
  label: string;
}

const DEFAULT_CANVAS_SIZE = 28;

// カテゴリ一覧。id 順が UI の並びや draw 関数配列と一致します。
export const SYMBOL_CATEGORIES: SymbolCategory[] = [
  { id: 0, key: 'city-hall', label: '市役所/役所' },
  { id: 1, key: 'police-box', label: '交番' },
  { id: 2, key: 'high-school', label: '高等学校' },
  { id: 3, key: 'post-office', label: '郵便局' },
  { id: 4, key: 'hospital', label: '病院' },
  { id: 5, key: 'shrine', label: '神社' },
  { id: 6, key: 'temple', label: '寺院' },
  { id: 7, key: 'museum', label: '博物館' },
  { id: 8, key: 'factory', label: '工場' },
  { id: 9, key: 'castle-ruins', label: '城跡' },
//   { id: 10, key: 'hot-spring', label: '温泉' },
//   { id: 11, key: 'fishing-port', label: '漁港' },
//   { id: 12, key: 'orchard', label: '果樹園' },
//   { id: 13, key: 'broadleaf-forest', label: '広葉樹林' },
//   { id: 14, key: 'coniferous-forest', label: '針葉樹林' },
//   { id: 15, key: 'library', label: '図書館' },
//   { id: 16, key: 'windmill', label: '風車' },
];

type SymbolDrawer = (p: p5, g: p5.Graphics, size: number) => void;

let generatorPromise: Promise<IconGenerator> | null = null;

// p5.js を一度だけ初期化して、そのインスタンスを使い回す
const createGenerator = (): Promise<IconGenerator> =>
  new Promise((resolve) => {
    const sketch = (p: p5) => {
      p.setup = () => {
        p.noCanvas();
        resolve({
          generateIcon: (categoryId: number, size: number = DEFAULT_CANVAS_SIZE) =>
            createIconForCategory(categoryId, size, p),
        });
      };
    };

    new p5(sketch);
  });

export const getIconGenerator = (): Promise<IconGenerator> => {
  if (!generatorPromise) {
    generatorPromise = createGenerator();
  }

  return generatorPromise;
};

const ensureCanvasElement = (g: p5.Graphics): HTMLCanvasElement => {
  const candidate =
    (g as unknown as { elt?: HTMLCanvasElement }).elt ??
    (g as unknown as { canvas?: HTMLCanvasElement }).canvas ??
    g.drawingContext.canvas;

  if (!(candidate instanceof HTMLCanvasElement)) {
    throw new Error('Failed to access the offscreen canvas element.');
  }

  return candidate;
};

const createIconForCategory = (categoryId: number, size: number, p: p5): string => {
  if (!Number.isInteger(categoryId) || categoryId < 0 || categoryId >= SYMBOL_CATEGORIES.length) {
    throw new Error(`Unknown category: ${categoryId}`);
  }

  const canvasSize = Math.max(8, Math.floor(size));
  const g = p.createGraphics(canvasSize, canvasSize);
  g.pixelDensity(1);
  g.background(255);
  g.stroke(0);
  g.fill(0);
  g.strokeCap(p.SQUARE);
  g.strokeJoin(p.MITER);
  g.drawingContext.imageSmoothingEnabled = false;

  // applySymbolTransform 内でランダム回転/スケールが適用されます。
  // DRAWERS の個別関数では「真っ直ぐ描く」ことを意識すると編集が簡単です。
  applySymbolTransform(p, g, canvasSize, () => {
    DRAWERS[categoryId](p, g, canvasSize);
  });

  const canvas = ensureCanvasElement(g);
  const dataUrl = canvas.toDataURL('image/png');
  g.remove();

  return dataUrl;
};

// 0.0〜1.0 の値をキャンバスサイズに合わせたピクセルへ変換
const toPx = (value: number, size: number) => value * size;
// amount を増やすほど座標がぶれる範囲が広がります
const jitter = (p: p5, size: number, amount = 0.005) => p.random(-size * amount, size * amount);
let currentScale = 1;
// stroke の太さはアイコン全体のスケール変化後でも一定厚みに保つため scale を考慮
const stroke = (size: number, factor = 0.06) => Math.max(1, (size * factor) / currentScale);
// vary は値を ±ratio の範囲でランダムに拡大縮小
const vary = (p: p5, value: number, ratio = 0.1) => value * p.random(1 - ratio, 1 + ratio);

// 外部でも利用できるように helper をまとめて公開 (使用しない場合は無視してOK)
export const DRAWING_HELPERS = { toPx, jitter, stroke, vary } as const;
// 回転/スケールのランダム化をまとめて適用する。draw() 内では通常通り描画してOK。
const applySymbolTransform = (p: p5, g: p5.Graphics, size: number, draw: () => void) => {
  g.push();
  const center = size / 2;
  const rotation = p.radians(p.random(-20, 20));
  currentScale = p.random(0.5, 1);
  g.translate(center, center);
  g.rotate(rotation);
  g.scale(currentScale);
  g.translate(size * p.random(-0.05, 0.05), size * p.random(-0.05, 0.05));
  try {
    draw();
  } finally {
    g.pop();
    currentScale = 1;
  }
};

// 市役所: 五角形をベースにした星形シルエット。
// radius を大きくすると輪郭が大きく広がります。
const drawCityHall: SymbolDrawer = (p, g, size) => {
    g.push();
    g.noFill();
    g.strokeWeight(size * p.random(0.05, 0.08));
    g.circle(0, 0, size * p.random(0.7, 0.8));
    g.strokeWeight(size * p.random(0.04, 0.06));
    g.circle(0, 0, size * p.random(0.5, 0.6));
    g.pop();
};

// 交番: 中央の円と十字状の伸びる線。radius/lineLength/gap でバランス調整。
const drawPoliceBox: SymbolDrawer = (p, g, size) => {
    g.push();
    g.strokeWeight(size * p.random(0.07, 0.1));
    g.line(-size*0.3, -size*0.3, size*0.3, size*0.3);
    g.line(-size*0.3, size*0.3, size*0.3, -size*0.3);
    g.pop();
};

// 高等学校: 外枠の大きな四角と 4 つの小窓。positions や innerSize で配置変更可能。
const drawHighSchool: SymbolDrawer = (p, g, size) => {
    const r = size * p.random(0.3, 0.4);

    g.push();
    g.noFill();
    g.strokeWeight(size * p.random(0.07, 0.1));
    g.circle(0, 0, size * p.random(0.7, 0.8));

    g.line(0, -r, 0, -r*0.35);
    g.line(-r*0.95, -r * 0.35, r*0.95, -r * 0.35);
    g.line(-r * 0.6, -r * 0.35, r * 0.6, r * 0.9);
    g.line(r * 0.6, -r * 0.35, -r * 0.6, r * 0.9);
    g.pop();
};

// 郵便局: 角を持つ枠と中央の縦棒・横棒。verticalTop/verticalBottom/barY を調整すると線位置が変わる。
const drawPostOffice: SymbolDrawer = (p, g, size) => {
    const r = size * p.random(0.3, 0.4);

    g.push();
    g.noFill();
    g.strokeWeight(size * p.random(0.07, 0.1));
    g.circle(0, 0, size * p.random(0.7, 0.8));

    g.line(-r * 0.95, -r * 0.15, r * 0.95, -r * 0.15);
    g.line(-r * 0.95, -r * 0.55, r * 0.95, -r * 0.55);
    g.line(0, -r * 0.15,0, r * 0.95);
    g.pop();
};

// 病院: 縦長の枠に十字。crossHalf は十字サイズ。
const drawHospital: SymbolDrawer = (p, g, size) => {
    const r = size * p.random(0.3, 0.4);

    g.push();
    g.noFill();
    g.strokeWeight(size * p.random(0.07, 0.1));

    g.beginShape();
    g.vertex(-r * 0.8, -r * 0.8);
    g.vertex(-r * 0.8, r*0.35);
    g.vertex(0, r*0.8);
    g.vertex(r * 0.8, r * 0.35);
    g.vertex(r * 0.8, -r * 0.8);
    g.endShape(p.CLOSE);
    
    g.line(-r * 0.6, 0, r * 0.6, 0);
    g.line(0, -r * 0.6, 0, r * 0.6);
    g.pop();
};

// 神社: 2 本の柱と上部の笠木。pillarWidth/pillarHeight/capW などでプロポーション調整。
const drawShrine: SymbolDrawer = (p, g, size) => {
    g.push();
    g.strokeWeight(size * p.random(0.07, 0.1));
    g.line(-size*0.3, size*0.4, -size*0.3, -size*0.4);
    g.line(size*0.3, size*0.4, size*0.3, -size*0.4);
    g.line(-size*0.5, -size*0.4, size*0.5, -size*0.4);
    g.line(-size*0.3, -size*0.1, size*0.3, -size*0.1);
    g.pop();
};

// 寺院: 下段の台座・中央の本殿・上部の屋根の 3 パーツ。
// platformWidth や roofSpan を変えるとシルエットが変化します。
const drawTemple: SymbolDrawer = (p, g, size) => {
    g.push();
    g.noFill();
    g.strokeWeight(size * p.random(0.07, 0.1));

    const l = p.random(0.2, 0.3) * size;
    for(let i = 0; i < 4; i ++){
        const angle = i * p.PI / 2;

        g.push();
        g.rotate(angle);
        g.beginShape();
        g.vertex(-l, -l);
        g.vertex(0, -l);
        g.vertex(0, 0);
        g.endShape();
        g.pop();
    }
    g.pop();
};

// 博物館: 台形の建物と上部の 3 つの円窓。dotY/dotRadius の調整で窓位置が変えられます。
const drawMuseum: SymbolDrawer = (p, g, size) => {
    const y1 = -size * p.random(0.3, 0.4);
    const y2 = size * p.random(-0.1, 0.1);
    const y3 = size * p.random(0.3, 0.4);

    const x0 = -size * p.random(0.45, 0.5);
    const x1 = -size * p.random(0.35, 0.45);
    const x2 = -size * p.random(0.15, 0.25);
    const x3 = p.abs(x2);
    const x4 = p.abs(x1);
    const x5 = p.abs(x0);

    g.push();
    g.strokeWeight(size * p.random(0.07, 0.1));
    g.line(0, y1, x1, y2);
    g.line(0, y1, x4, y2);
    g.line(x0, y2, x5, y2);
    g.line(x1, y2, x1, y3);
    g.line(x2, y2, x2, y3);
    g.line(x3, y2, x3, y3);
    g.line(x4, y2, x4, y3);
    g.line(x0, y3, x5, y3);

    g.pop();
};

// 工場: 四角い建屋と煙突。squareSize/cheminyHeight で厚みや高さを調整。
const drawFactory: SymbolDrawer = (p, g, size) => {
    const r = size * p.random(0.2, 0.3);
    g.push();
    g.noFill();
    g.strokeWeight(size * p.random(0.07, 0.1));
    g.circle(0, 0, r*2);
    for(let i = 0; i < 8; i ++){
        const angle = i * p.PI / 4;

        g.push();
        g.rotate(angle);
        g.line(r, 0, r*1.8, 0);
        g.pop();
    }
    g.pop();
};

// 城跡: 円に 2 本の縦線マーカー。spacing を調整するとマーカー間隔が変わる。
const drawCastleRuins: SymbolDrawer = (p, g, size) => {
    const x1 = -size * p.random(0.4, 0.5);
    const x2 = -size * p.random(0.15, 0.25);
    const x3 = p.abs(x2);
    const x4 = p.abs(x1);

    const y1 = -size * p.random(0.4, 0.5);
    const y2 = -size * p.random(0.05, 0.15);
    const y3 = size * p.random(0.4, 0.5);
    g.push();
    g.noFill();
    g.strokeWeight(size * p.random(0.07, 0.1));
    g.beginShape();
    g.vertex(x1, y3);
    g.vertex(x1, y2);
    g.vertex(x2, y2);
    g.vertex(x2, y1);
    g.vertex(x3, y1);
    g.vertex(x3, y2);
    g.vertex(x4, y2);
    g.vertex(x4, y3);
    g.endShape();
    g.pop();
};

// ============== ここから下は未実装のカテゴリ ==============

// 温泉: 下部の湯船円と 3 本の湯気。steamHeight や wave 係数で湯気の動きが変化。
const drawHotSpring: SymbolDrawer = (_p, g, _size) => {
    g.push();
    g.pop();
};

// 漁港: 旗竿の縦線、上部の小円、下部の円弧、防波堤の腕。
// bottomRadius/armLength で海側の広がりが調整できます。
const drawFishingPort: SymbolDrawer = (_p, g, _size) => {
    g.push();
    g.pop();
};

// 果樹園: 一つの大きな円と垂直支柱 3 本。spacing や lineBottom で支柱の配置を制御。
const drawOrchard: SymbolDrawer = (_p, g, _size) => {
    g.push();
    g.pop();
};

// 広葉樹林: 大きな円冠と幹。trunkTop/trunkBottom を変えて幹の長さを微調整。
const drawBroadleafForest: SymbolDrawer = (_p, g, _size) => {
    g.push();
    g.pop();
};

// 針葉樹林: 三角形の樹冠と幹。baseWidth を変えると樹冠の広がりが変わります。
const drawConiferousForest: SymbolDrawer = (_p, g, _size) => {
    g.push();
    g.pop();
};

// 図書館: 正方形に近い外枠と 2 本の横線。rectW/rectH で書棚の形を変えられます。
const drawLibrary: SymbolDrawer = (_p, g, _size) => {
    g.push();
    g.pop();
};

// 風車: 縦の塔と 2 枚の羽。towerHeight や angleOffset を調整すると羽の開きが変わる。
const drawWindmill: SymbolDrawer = (_p, g, _size) => {
    g.push();
    g.pop();
};

// キーと対応する描画関数をまとめておき、SYMBOL_CATEGORIES の内容に合わせて配列化します。
const DRAWERS_BY_KEY: Record<string, SymbolDrawer> = {
  'city-hall': drawCityHall,
  'police-box': drawPoliceBox,
  'high-school': drawHighSchool,
  'post-office': drawPostOffice,
  'hospital': drawHospital,
  'shrine': drawShrine,
  'temple': drawTemple,
  'museum': drawMuseum,
  'factory': drawFactory,
  'castle-ruins': drawCastleRuins,
  'hot-spring': drawHotSpring,
  'fishing-port': drawFishingPort,
  'orchard': drawOrchard,
  'broadleaf-forest': drawBroadleafForest,
  'coniferous-forest': drawConiferousForest,
  'library': drawLibrary,
  'windmill': drawWindmill,
};

// SYMBOL_CATEGORIES の並び順に合わせて描画関数を配列化。未定義キーがあれば即座に例外を投げます。
const DRAWERS: SymbolDrawer[] = SYMBOL_CATEGORIES.map(({ key }) => {
  const drawer = DRAWERS_BY_KEY[key];
  if (!drawer) {
    throw new Error(`Drawer not found for category key: ${key}`);
  }
  return drawer;
});
