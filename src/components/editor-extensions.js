import { StarterKit } from '@tiptap/starter-kit'
import Paragraph from '@tiptap/extension-paragraph'
import Heading from '@tiptap/extension-heading'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { VueNodeViewRenderer } from '@tiptap/vue-2'
import { common, createLowlight } from 'lowlight'

// 組件匯入
// import CodeBlockComponent from './CodeBlockComponent.vue'
import RowWrapper from './RowWrapper.vue' // 直接在此匯入 Wrapper
import SlashCommands from './slash-commands-extension.js'

const lowlight = createLowlight(common);

export const getExtensions = () => {
  return [
    // 1. 基礎核心
    StarterKit.configure({
      codeBlock: false,
      paragraph: false, // 停用預設段落，改用下方自定義版本
      heading: false,   // 停用預設標題
    }),

    // 2. 自定義節點 (綁定拖曳把手)
    Paragraph.extend({
      addNodeView() { return VueNodeViewRenderer(RowWrapper) }
    }),
    Heading.extend({
      addNodeView() { return VueNodeViewRenderer(RowWrapper) }
    }),

    // 3. 程式碼高亮
    CodeBlockLowlight.extend({
      addNodeView() { return VueNodeViewRenderer(RowWrapper) },
    }).configure({ lowlight }),

    // 4. 表格與清單
    TaskList,
    TaskItem.configure({ nested: true }),
    // 修改：讓 Table 也使用 RowWrapper，並保留 resizable 設定
    Table.extend({
      addNodeView() { return VueNodeViewRenderer(RowWrapper) }
    }).configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,

    // 5. 斜槓選單
    SlashCommands,
  ].filter(Boolean);
}