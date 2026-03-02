// editor-extensions.js
import { StarterKit } from '@tiptap/starter-kit'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { VueNodeViewRenderer } from '@tiptap/vue-2'
import { common, createLowlight } from 'lowlight'

import CodeBlockComponent from './CodeBlockComponent.vue'
import SlashCommands from './slash-commands-extension.js' // 建議將 Commands 邏輯也抽離

const lowlight = createLowlight(common);

export const getExtensions = () => {
  // 檢查所有匯入的物件
  const extensionsToLink = [
    { name: 'StarterKit', value: StarterKit },
    { name: 'TaskList', value: TaskList },
    { name: 'Table', value: Table },
    { name: 'SlashCommands', value: SlashCommands }
  ];

  extensionsToLink.forEach(ext => {
    if (!ext.value) {
      console.error(`🚨 錯誤：${ext.name} 是 undefined！請確認該套件是否安裝或匯入路徑是否正確。`);
    }
  });

  return [
    // 這裡只回傳「真的有東西」的配置，避免崩潰導致高度消失
    StarterKit ? StarterKit.configure({ codeBlock: false }) : null,
    CodeBlockLowlight.extend({
      addNodeView() { return VueNodeViewRenderer(CodeBlockComponent) },
    }).configure({ lowlight }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table ? Table.configure({ resizable: true }) : null,
    TableRow,
    TableHeader,
    TableCell,
    SlashCommands,
  ].filter(Boolean); // 過濾掉 null
}