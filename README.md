# Notion-like Tiptap Editor (Vue 2)

## 專案簡介
這是一個基於 **Vue 2** 和 **Tiptap v2** 框架構建的富文本編輯器專案。其核心目標是高度復刻 **Notion** 的編輯體驗，實現了區塊化編輯 (Block-based editing)、直覺的拖曳排序功能，以及懸浮的功能選單。

## 技術堆疊
*   **前端框架**: Vue.js 2.x
*   **編輯器核心**: Tiptap v2 (基於 ProseMirror)
*   **樣式預處理**: SCSS
*   **語法高亮**: Lowlight (整合於 Code Block)

## 主要功能特色

### 1. 區塊化編輯與拖曳 (Block Drag & Drop)
*   **Notion 風格把手**: 每一行內容（段落、標題、列表、表格）左側皆有懸浮的「六點」拖曳把手。
*   **全類型支援**: 支援拖曳段落、標題、清單項目 (List Item)，甚至是複雜的表格 (Table)。
*   **穩健的拖曳邏輯**: 
    *   解決了 ProseMirror 在拖曳複雜結構（如表格、巢狀清單）時可能只複製內容而遺失結構的問題。
    *   採用 `copyMove` 策略搭配 `onDragEnd` 的延遲刪除機制，確保跨區塊移動的穩定性。

### 2. 區塊功能選單 (Block Menu)
*   點擊拖曳把手可喚起功能選單。
*   **類型轉換**: 可將當前區塊轉換為：
    *   一般文字 (Paragraph)
    *   標題 (Heading 1-3)
    *   項目符號清單 (Bullet List)
    *   編號清單 (Ordered List)
*   **操作**: 支援刪除區塊、插入表格。

### 3. 豐富的內容格式
*   **表格 (Table)**: 支援欄寬調整 (Resizable)、表頭列。
*   **程式碼區塊 (Code Block)**: 
    *   整合 `CodeBlockComponent.vue`。
    *   支援語言選擇下拉選單。
    *   VS Code 風格的深色主題語法高亮。
*   **待辦事項 (Task List)**: 支援巢狀結構。

### 4. 斜線指令 (Slash Commands)
*   支援輸入 `/` 喚起指令選單 (基礎架構已建立於 `slash-commands-extension.js`)。

## 專案結構說明

```text
src/
├── components/
│   ├── tiptopView.vue           # [核心] 編輯器主容器，負責初始化 Editor 實例與全域樣式
│   ├── RowWrapper.vue           # [核心] 自定義 Node View，實作拖曳把手與區塊選單邏輯
│   ├── editor-extensions.js     # Tiptap 擴充套件設定，將 Node View 綁定至各節點
│   ├── CodeBlockComponent.vue   # 自定義程式碼區塊組件
│   ├── slash-commands-extension.js # Slash Command 擴充套件封裝
│   └── ...
```

## 核心實作細節解析

### RowWrapper.vue (拖曳與選單核心)
這是本專案最關鍵的組件，它作為 Tiptap 的 `Node View` 包裹了實際內容。

*   **拖曳機制 (`onDragStart`, `onDragEnd`)**:
    *   為了避開瀏覽器與 ProseMirror 對於複雜節點拖曳的限制，本專案採用了「**HTML 拖曳 + 後續刪除**」的策略。
    *   **Start**: 將節點內容序列化為 HTML 放入 `dataTransfer`，並設定 `effectAllowed = 'copyMove'`。
    *   **End**: 偵測 `dropEffect`。若為移動操作，則在 `setTimeout` (確保 Drop 完成) 後，透過 `setNodeSelection` + `deleteSelection` 移除原始節點。
    *   針對 **清單項目 (List Item)** 做了特殊處理，確保拖曳時能選取並刪除整個 `<li>` 結構。

*   **類型轉換 (`turnInto`, `turnIntoList`)**:
    *   使用 `editor.commands.setTextSelection(pos + 1)` 先將游標移入區塊內部，確保 `isActive` 判斷準確。
    *   實作了 `liftListItem` 邏輯，讓清單項目能正確轉換回一般文字。

### editor-extensions.js (擴充綁定)
在此檔案中，我們攔截了預設的節點渲染：

```javascript
StarterKit.configure({
  paragraph: false, // 停用預設
  heading: false,
}),
Paragraph.extend({
  addNodeView() { return VueNodeViewRenderer(RowWrapper) } // 改用 RowWrapper
}),
// ... Table, Heading 也做相同綁定
```

## 安裝與執行

```bash
# 安裝相依套件
npm install

# 啟動開發環境
npm run serve
```

## 待優化項目
*   Slash Command 的選單 UI 渲染組件 (`suggestion.js` 的具體實作)。
*   更完整的表格操作選單 (新增/刪除欄列)。
*   多選區塊拖曳支援。