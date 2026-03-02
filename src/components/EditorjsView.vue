<template>
  <div class="editorjs-wrapper">
    <div id="editorjs"></div>
    <button class="save-btn" @click="saveContent">儲存內容 (Console)</button>
  </div>
</template>

<script>
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Checklist from '@editorjs/checklist';

export default {
  name: 'EditorJS',
  props: {
    initialData: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      editor: null
    };
  },
  mounted() {
    this.initEditor();
  },
  methods: {
    initEditor() {
      this.editor = new EditorJS({
        holder: 'editorjs', // 對應 template 中的 ID
        placeholder: '按 Tab 鍵或點擊開始輸入...',
        data: this.initialData,
        tools: {
          // 配置外掛
          header: {
            class: Header,
            inlineToolbar: ['link']
          },
          list: {
            class: List,
            inlineToolbar: true
          },
          checklist: {
            class: Checklist,
            inlineToolbar: true
          }
        },
        // 內容變動時的 callback
        onChange: (api, event) => {
          console.log(api);
          console.log(event);
          this.editor.save().then((outputData) => {
            this.$emit('content-change', outputData);
          });
        }
      });
    },
    async saveContent() {
      const result = await this.editor.save();
      console.log('儲存的 JSON 數據：', result);
    }
  },
  beforeDestroy() {
    // 銷毀編輯器實例避免記憶體洩漏
    if (this.editor) {
      this.editor.destroy();
    }
  }
};
</script>

<style scoped>
.editorjs-wrapper {
  border: 1px solid #e2e8f0;
  padding: 20px;
  border-radius: 12px;
  background: #fff;
}

/* 讓編輯區域稍微大一點 */
#editorjs {
  min-height: 300px;
  text-align: left;
}

.save-btn {
  margin-top: 20px;
  padding: 8px 16px;
  background: #4a5568;
  color: white;
  border-radius: 6px;
  cursor: pointer;
}
</style>