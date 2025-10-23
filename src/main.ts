import './style.css';
import './navigation';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getIconGenerator, SYMBOL_CATEGORIES, type IconGenerator } from './p5-sketch/generator';

const MAX_PER_CATEGORY = 6000;
const MIN_PIXEL_SIZE = 8;
const MAX_PIXEL_SIZE = 512;
const PREVIEW_SIZE = 96;

const form = document.getElementById('control-form') as HTMLFormElement | null;
const countInput = document.getElementById('count-input') as HTMLInputElement | null;
const pixelInput = document.getElementById('pixel-input') as HTMLInputElement | null;
const progressArea = document.getElementById('progress') as HTMLTextAreaElement | null;
const generateButton = document.getElementById('generate-btn') as HTMLButtonElement | null;
const cancelButton = document.getElementById('cancel-btn') as HTMLButtonElement | null;
const categoryList = document.getElementById('category-list') as HTMLDivElement | null;
const refreshButton = document.getElementById('refresh-previews') as HTMLButtonElement | null;

if (
  !form ||
  !countInput ||
  !pixelInput ||
  !progressArea ||
  !generateButton ||
  !cancelButton ||
  !categoryList ||
  !refreshButton
) {
  throw new Error('必要なDOM要素が見つかりません。HTML構造を確認してください。');
}

let generator: IconGenerator | null = null;
let initialized = false;
let isGenerating = false;
let cancelRequested = false;

const selectedCategories = new Set<number>();
const previewImages = new Map<number, HTMLImageElement>();

const appendProgress = (message: string, reset = false) => {
  if (reset) {
    progressArea.value = '';
  }

  const timestamp = new Date().toLocaleTimeString('ja-JP', { hour12: false });
  progressArea.value += `[${timestamp}] ${message}\n`;
  progressArea.scrollTop = progressArea.scrollHeight;
};

// Yield control so long-running loops do not freeze the UI thread.
const yieldToBrowser = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const updateUiState = () => {
  const disableInputs = isGenerating;
  generateButton.disabled = disableInputs;
  cancelButton.disabled = !isGenerating;
  countInput.disabled = disableInputs;
  pixelInput.disabled = disableInputs;
  refreshButton.disabled = disableInputs || !initialized;

  categoryList.querySelectorAll('input[type="checkbox"]').forEach((node) => {
    (node as HTMLInputElement).disabled = disableInputs;
  });
};

const createCategoryCard = (categoryId: number, label: string) => {
  if (!generator) {
    return;
  }

  const card = document.createElement('label');
  card.className = 'category-card';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = 'category';
  checkbox.value = String(categoryId);
  checkbox.checked = true;

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      selectedCategories.add(categoryId);
    } else {
      selectedCategories.delete(categoryId);
    }
    updateUiState();
  });

  const preview = document.createElement('img');
  preview.alt = `${label} のプレビュー`;
  preview.width = PREVIEW_SIZE;
  preview.height = PREVIEW_SIZE;
  preview.src = generator.generateIcon(categoryId, PREVIEW_SIZE);

  const caption = document.createElement('span');
  caption.className = 'category-name';
  caption.textContent = `${String(categoryId + 1).padStart(2, '0')} ${label}`;

  card.append(checkbox, preview, caption);
  categoryList.appendChild(card);
  previewImages.set(categoryId, preview);
  selectedCategories.add(categoryId);
};

const renderCategoryGrid = async () => {
  if (!generator) {
    return;
  }

  categoryList.innerHTML = '';
  selectedCategories.clear();
  previewImages.clear();

  for (const category of SYMBOL_CATEGORIES) {
    createCategoryCard(category.id, category.label);
    if ((category.id + 1) % 5 === 0) {
      await yieldToBrowser();
    }
  }

  appendProgress('カテゴリのプレビューを読み込みました。');
  updateUiState();
};

const refreshCategoryPreviews = async () => {
  if (!generator) {
    return;
  }

  let counter = 0;
  for (const [categoryId, image] of previewImages) {
    image.src = generator.generateIcon(categoryId, PREVIEW_SIZE);
    counter += 1;
    if (counter % 5 === 0) {
      await yieldToBrowser();
    }
  }
  appendProgress('カテゴリプレビューを更新しました。');
};

const ensureGenerator = async () => {
  if (generator) {
    return;
  }

  appendProgress('p5.js ジェネレーターを初期化しています...', true);
  generator = await getIconGenerator();
  initialized = true;
  appendProgress('ジェネレーターの初期化が完了しました。');
  await renderCategoryGrid();
  appendProgress('パラメータを設定して生成を開始できます。');
};

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

cancelButton.addEventListener('click', () => {
  if (!isGenerating || cancelRequested) {
    return;
  }
  cancelRequested = true;
  cancelButton.disabled = true;
  appendProgress('生成の中断をリクエストしました。処理終了までお待ちください。');
});

refreshButton.addEventListener('click', async () => {
  if (!initialized || isGenerating) {
    return;
  }
  refreshButton.disabled = true;
  await refreshCategoryPreviews();
  updateUiState();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  await ensureGenerator();
  if (!generator) {
    appendProgress('ジェネレーターの初期化に失敗しました。', false);
    return;
  }

  const parsedCount = Number.parseInt(countInput.value, 10);
  if (Number.isNaN(parsedCount) || parsedCount <= 0) {
    appendProgress('生成枚数を正しく入力してください (1 〜 6000)。');
    return;
  }

  const perCategory = Math.min(MAX_PER_CATEGORY, Math.max(1, parsedCount));
  if (perCategory !== parsedCount) {
    countInput.value = String(perCategory);
  }

  const parsedPixel = Number.parseInt(pixelInput.value, 10);
  if (Number.isNaN(parsedPixel) || parsedPixel < MIN_PIXEL_SIZE) {
    appendProgress(`出力ピクセルサイズを正しく入力してください (${MIN_PIXEL_SIZE} 〜 ${MAX_PIXEL_SIZE})。`);
    return;
  }

  const pixelSize = Math.min(MAX_PIXEL_SIZE, Math.max(MIN_PIXEL_SIZE, parsedPixel));
  if (pixelSize !== parsedPixel) {
    pixelInput.value = String(pixelSize);
  }

  if (selectedCategories.size === 0) {
    appendProgress('生成するカテゴリを少なくとも1つ選択してください。');
    return;
  }

  const activeCategories = SYMBOL_CATEGORIES.filter((category) => selectedCategories.has(category.id));

  const zip = new JSZip();
  cancelRequested = false;
  isGenerating = true;
  updateUiState();

  appendProgress(
    `生成を開始: カテゴリ ${activeCategories.length} 種類 × ${perCategory} 枚 (サイズ ${pixelSize}px)`,
    true,
  );

  try {
    for (const [index, category] of activeCategories.entries()) {
      if (cancelRequested) {
        break;
      }

      appendProgress(`カテゴリ ${category.label} (${index + 1}/${activeCategories.length}) を生成中...`);
      const folderName = `${String(index + 1).padStart(2, '0')}_${slugify(category.key)}`;
      const folder = zip.folder(folderName);
      if (!folder) {
        throw new Error(`ZIPフォルダの作成に失敗しました: ${folderName}`);
      }

      for (let iconIndex = 0; iconIndex < perCategory; iconIndex += 1) {
        if (cancelRequested) {
          break;
        }

        const dataUrl = generator.generateIcon(category.id, pixelSize);
        const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1);
        folder.file(`${String(iconIndex + 1).padStart(4, '0')}.png`, base64Data, { base64: true });

        if ((iconIndex + 1) % 200 === 0 || iconIndex + 1 === perCategory) {
          appendProgress(`カテゴリ ${category.label}: ${iconIndex + 1}/${perCategory} 枚`);
          await yieldToBrowser();
        }
      }
    }

    if (cancelRequested) {
      appendProgress('生成を中断しました。中断までに作成したデータは破棄されました。');
      return;
    }

    appendProgress('ZIPファイルを圧縮しています...');
  const blob = await zip.generateAsync({ type: 'blob' });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  saveAs(blob, `map_symbol_icons_${timestamp}.zip`);
    appendProgress('完了しました。ZIPのダウンロードが開始されました。');

    await refreshCategoryPreviews();
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : '不明なエラーが発生しました。';
    appendProgress(`エラー: ${message}`);
  } finally {
    isGenerating = false;
    cancelRequested = false;
    updateUiState();
  }
});

updateUiState();
void ensureGenerator();