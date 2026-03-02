// RowExtension.js
import { Extension } from '@tiptap/vue-2'
import { VueNodeViewRenderer } from '@tiptap/vue-2'
import RowWrapper from './RowWrapper.vue'

export default Extension.create({
  name: 'rowExtension',

  // 強制讓這些節點類型使用我們的 RowWrapper 渲染
  addNodeView() {
    return (props) => {
      // 這裡檢查當前節點是否在我們想加上把手的名單中
      const types = ['paragraph', 'heading', 'taskList', 'bulletList', 'orderedList', 'codeBlock'];
      if (types.includes(props.node.type.name)) {
        return VueNodeViewRenderer(RowWrapper)(props);
      }
      return null;
    }
  },
})