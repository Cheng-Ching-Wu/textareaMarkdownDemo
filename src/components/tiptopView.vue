<template>
  <div v-if="editor" class="tiptap-wrapper">
    <editor-content :editor="editor" class="editor-content" />
  </div>
</template>

<script>
import { VueNodeViewRenderer } from '@tiptap/vue-2'
import { Editor, EditorContent, Extension } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'
import Suggestion from '@tiptap/suggestion'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import suggestionConfig from '@/suggestion.js'

import CodeBlockComponent from './CodeBlockComponent.vue'

// 初始化語法高亮 (只載入常用語言，如 JS, CSS, HTML)
const lowlight = createLowlight(common)

const Commands = Extension.create({
  name: 'slash-commands',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        ...suggestionConfig,
      },
    }
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

export default {
  components: {
    EditorContent,
  },
  props: ['value'],
  data() {
    return {
      editor: null,
    }
  },
  watch: {
    value(value) {
      const isSame = this.editor.getHTML() === value
      if (isSame) return
      this.editor.commands.setContent(value, false)
    },
  },
  mounted() {
    this.editor = new Editor({
      content: this.value,
      extensions: [
        // 1. 禁用 StarterKit 內建的 codeBlock (避免衝突)
        StarterKit.configure({
          codeBlock: false,
        }),
        // 2. 啟用帶有高亮功能的版本
        CodeBlockLowlight.extend({
          // 這裡告訴 Tiptap 使用自定義組件
          addNodeView() {
            return VueNodeViewRenderer(CodeBlockComponent)
          },
        }).configure({ lowlight }),
        Commands,
        // --- 關鍵修復：在這裡正式註冊功能 ---
        TaskList,
        TaskItem.configure({
          nested: true, // 允許巢狀結構，像是按 Tab 縮排
        }),
      ],
      onUpdate: () => {
        this.$emit('input', this.editor.getHTML())
      },
    })
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy()
    }
  },
}
</script>

<style lang="scss" scoped>
.tiptap-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 20px;
  background: white;
  min-height: 400px;
  text-align: left;
}

::v-deep .ProseMirror:focus {
  outline: none;
}

/* --- 內容樣式設計 --- */
::v-deep .ProseMirror {
  min-height: 380px;

  p.is-editor-empty:first-child::before {
    content: '輸入 / 喚起功能選單...';
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }

  h1 { font-size: 2rem; margin-top: 0.5rem; }
  h2 { font-size: 1.5rem; margin-top: 0.5rem; }

  /* --- TaskList 專屬樣式 (讓它更像 Notion) --- */
  ul[data-type="taskList"] {
    list-style: none;
    padding: 0;

    li {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;

      > label {
        flex: 0 0 auto;
        margin-right: 0.5rem;
        user-select: none;
        /* 隱藏預設 input 渲染，改用自定義外觀或直接顯示預設 checkbox */
      }

      > div {
        flex: 1 1 auto;
      }

      input[type="checkbox"] {
        cursor: pointer;
        width: 1.2rem;
        height: 1.2rem;
        margin-top: 0.2rem;
      }
    }
  }
}

::v-deep .ProseMirror {
  .code-block {
    pre {
      background: #1e1e1e; /* 深色背景 */
      color: #d4d4d4;
      border-radius: 8px;
      padding: 1.5rem 1rem 1rem;
      margin: 1.2rem 0;
      position: relative;
      overflow-x: auto;

      code {
        font-family: 'Fira Code', 'Consolas', monospace;
        font-size: 0.9rem;
        background: none;
        padding: 0;
      }
    }
  }

  /* 語法高亮顏色 (VS Code 風格) */
  .hljs-keyword { color: #569cd6; }
  .hljs-string { color: #ce9178; }
  .hljs-comment { color: #6a9955; font-style: italic; }
  .hljs-function { color: #dcdcaa; }
  .hljs-number { color: #b5cea8; }
}
</style>