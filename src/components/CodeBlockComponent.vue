<template>
  <node-view-wrapper class="code-block">
    <select contenteditable="false" v-model="selectedLanguage">
      <option :value="null">自動偵測</option>
      <option v-for="(lang, index) in languages" :key="index" :value="lang">
        {{ lang }}
      </option>
    </select>
    <pre><code><node-view-content /></code></pre>
  </node-view-wrapper>
</template>

<script>
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-2'

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },
  props: nodeViewProps,
  data() {
    return {
      // 這裡列出你想要支援的語言
      languages: ['javascript', 'css', 'html', 'typescript', 'python', 'markdown'],
    }
  },
  computed: {
    selectedLanguage: {
      get() {
        return this.node.attrs.language
      },
      set(language) {
        this.updateAttributes({ language })
      },
    },
  },
}
</script>

<style lang="scss" scoped>
.code-block {
  position: relative;

  select {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    color: #999;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 0.7rem;
    cursor: pointer;
    z-index: 10;
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}
</style>