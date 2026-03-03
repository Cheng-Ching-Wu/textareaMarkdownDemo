import { VueRenderer } from '@tiptap/vue-2'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import CommandsList from '@/components/tiptap/CommandsList.vue'

const suggestionConfig = {
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
            .deleteRange(range)
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
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
        component = new VueRenderer(CommandsList, {
          parent: props.editor,
          propsData: props,
        })

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props) {
        component.updateProps(props)

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }

        return component.ref.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}

export { suggestionConfig };