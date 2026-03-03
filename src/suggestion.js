import { VueRenderer } from '@tiptap/vue-2'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css' // 務必引入 tippy 樣式
import CommandsList from '@/components/tiptap/CommandsList.vue'

export default {
  items: ({ query }) => {
    return [
      { 
        title: '標題 1', 
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
        }
      },
      { 
        title: '標題 2', 
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
        }
      },
      { 
        title: '待辦清單', 
        command: ({ editor, range }) => {
          // 記得在 TiptapEditor.vue 的 extensions 要加上 TaskList 和 TaskItem
          editor.chain().focus().deleteRange(range).toggleTaskList().run()
        }
      },
      { 
        title: '程式碼塊 (JS)', 
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setCodeBlock({ language: 'javascript' }).run()
        }
      },
      {
        title: '表格',
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range) // 刪除輸入的 / 符號
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true }) // 插入 3x3 表格
            .run()
        },
      },
    ].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()))
  },

  render: () => {
    let component
    let popup

    return {
      onStart: props => {
        if (!props.clientRect) return

        component = new VueRenderer(CommandsList, {
          parent: props.editor.contentComponent || props.editor,
          propsData: {
            ...props,
            // 關鍵修正：包裝一個 command 函式傳給組件
            command: (item) => {
              item.command({ editor: props.editor, range: props.range })
            }
          },
        })

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          zIndex: 9999,
        })
      },

      onUpdate(props) {
        // 關鍵修正：更新時也要確保 command 被正確包裝
        component.updateProps({
          ...props,
          command: (item) => {
            item.command({ editor: props.editor, range: props.range })
          }
        })

        if (!props.clientRect) return

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },
      
      // onKeyDown 與 onExit 保持不變...
      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }
        return component.ref?.onKeyDown(props)
      },

      onExit() {
        if (popup) popup[0].destroy()
        if (component) component.destroy()
      },
    }
  }
}