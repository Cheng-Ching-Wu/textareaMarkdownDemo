<template>
  <div class="notion-app-container">
    <div class="editor-shell">
      
      <div class="editor-content-wrapper">
        <editor-content :editor="editor" />
      </div>

    </div>
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import { getExtensions } from './editor-extensions'
import { VueNodeViewRenderer } from '@tiptap/vue-2'
import RowWrapper from './RowWrapper.vue'

export default {
  name: 'NotionEditor',
  components: {
    EditorContent,
  },
  props: {
    value: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      editor: null,
    }
  },
  watch: {
    // 嚴格比對內容，防止在協作或複雜更新時游標跳轉
    value(newValue) {
      if (!this.editor) return
      // 優化：先簡單比對字串，若完全相同則不執行 getHTML (getHTML 在大文件下較慢)
      if (this.editor.getHTML() === newValue) return

      const isSame = this.editor.getHTML() === newValue
      if (!isSame) {
        this.editor.commands.setContent(newValue, false)
      }
    },
  },
  mounted() {
    this.initEditor()
  },
  methods: {
    initEditor() {
      this.editor = new Editor({
        content: this.value,
        // --- FIX START ---
        // 優化：將 NodeView 的配置邏輯抽離，使其更清晰
        extensions: this.processExtensions(getExtensions()),
        // --- FIX END ---
        // 當內容變動時通知父組件 (支援 v-model)
        onUpdate: ({ editor }) => {
          this.$emit('input', editor.getHTML())
        },
        // 聚焦時可增加特定樣式
        onFocus: () => {
          this.$emit('focus')
        }
      })
    },
    processExtensions(extensions) {
      return extensions.map(ext => {
        // 針對 Table 擴充功能注入 RowWrapper NodeView
        if (ext.name === 'table') {
          return ext.extend({
            addNodeView() {
              return VueNodeViewRenderer(RowWrapper)
            },
          }).configure(ext.options)
        }
        // 如果未來有其他 Block (如 Paragraph, Heading) 也要套用 Notion 風格的把手，
        // 可以在這裡增加判斷邏輯，統一回傳 VueNodeViewRenderer(RowWrapper)
        
        return ext
      })
    }
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy()
    }
  },
}
</script>

<style lang="scss" scoped>
// 外層容器：負責頁面間距
.notion-app-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  background-color: #fff;
}

// 核心殼層：定義 Notion 寬度與左側按鈕空間
.editor-shell {
  position: relative;
  width: 100%;
  max-width: 800px;
  // 關鍵：左側 padding 必須與 BlockSideMenu 的位移對應
  padding-left: 54px;
  padding-right: 24px;
  border: 1px solid #e1e1e1;
  border-radius: 8px;
}

// 深度作用於 Tiptap 生成的 HTML
::v-deep .ProseMirror {
  outline: none;
  min-height: 600px;
  padding-bottom: 30vh; // 底部留白，方便最後一行編輯
  
  // 文字基礎設定
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif;
  font-size: 16px;
  color: #37352f;
  word-break: break-word;
  text-align: left;

  // Placeholder 邏輯
  &.is-editor-empty:first-child::before {
    content: '輸入 / 喚起功能選單...';
    float: left;
    color: rgba(55, 53, 47, 0.2);
    pointer-events: none;
    height: 0;
  }

  // 段落樣式
  p { margin: 3px 0; }

  // 標題樣式優化
  h1 { font-size: 1.875em; font-weight: 700; line-height: 1.3; margin: 4px 0px }
  h2 { font-size: 1.5em; font-weight: 600; line-height: 1.3; margin: 4px 0px }
  h3 { font-size: 1.25em; font-weight: 500; line-height: 1.3; margin: 4px 0px }

  // 待辦清單 (TaskList) 樣式
  ul[data-type="taskList"] {
    list-style: none;
    padding: 0;
    margin: 4px 0;

    li {
      display: flex;
      align-items: flex-start;
      margin: 2px 0;
      
      label {
        display: flex;
        align-items: center;
        height: 24px; // 與文字行高對齊
        margin-right: 8px;
        user-select: none;
      }

      input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: #2383e2; // Notion 藍
      }

      div { flex: 1; p { margin: 0; } }
    }
  }

  // 程式碼塊 (Code Block)
  pre {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 2em 1.2em 1.2em;
    border-radius: 8px;
    margin: 1.5em 0;
    overflow-x: auto;
    
    code { 
      background: transparent; 
      padding: 0; 
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.9em;
    }
  }

  // 行內代碼
  code {
    background: rgba(135, 131, 120, 0.15);
    color: #ffffff;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 85%;
  }

  // 表格 (Tabl-e)
  table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
    overflow: hidden;

    td, th {
      min-width: 1em;
      border: 1px solid #e2e2e3;
      padding: 7px 10px;
      vertical-align: top;
      box-sizing: border-box;
      position: relative;

      > * { margin-bottom: 0; }
    }

    th {
      font-weight: 600;
      text-align: left;
      background-color: #f7f6f3; // Notion 標題列底色
    }

    // 選取單元格時的藍色高亮
    .selectedCell:after {
      z-index: 2;
      content: "";
      position: absolute;
      left: 0; right: 0; top: 0; bottom: 0;
      background: rgba(35, 131, 226, 0.07);
      pointer-events: none;
    }

    // 調整欄寬的把手樣式
    .column-resize-handle {
      position: absolute;
      right: -2px; top: 0; bottom: 0;
      width: 4px;
      z-index: 20;
      background-color: #2383e2;
      pointer-events: none;
    }
  }
}

// 語法高亮 (VS Code 黑色風格)
::v-deep {
  .hljs-keyword { color: #569cd6; }
  .hljs-string { color: #ce9178; }
  .hljs-comment { color: #6a9955; font-style: italic; }
  .hljs-function { color: #dcdcaa; }
}
</style>