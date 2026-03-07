import { VueRenderer } from '@tiptap/vue-2'
import tippy from 'tippy.js'
import CommandsList from '@/components/tiptap/CommandsList.vue'
import { MENU_ITEMS } from '@/menuItems'

const suggestionConfig = {
  items: ({ query }) => {
    return MENU_ITEMS
      .filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()))
      .map(item => ({
        ...item,
        command: ({ editor, range }) => {
          const chain = editor.chain().focus().deleteRange(range)
          
          if (item.action === 'turnInto') {
            if (item.type === 'heading') {
              chain.setHeading(item.attrs)
            } else if (item.type === 'paragraph') {
              chain.setParagraph()
            } else if (item.type === 'codeBlock') {
              chain.setCodeBlock()
            }
          } else if (item.action === 'turnIntoList') {
            if (item.type === 'bulletList') {
              chain.toggleBulletList()
            } else if (item.type === 'orderedList') {
              chain.toggleOrderedList()
            }
          } else if (item.action === 'insertTable') {
            chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          }
          
          chain.run()
        }
      }))
  },

  command: ({ editor, range, props }) => {
    props.command({ editor, range })
  },

  render: () => {
    let component
    let popup

    return {
      onStart: props => {
        component = new VueRenderer(CommandsList, {
          propsData: props,
        })

        popup = tippy(document.body, {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          arrow: false,
        })
      },

      onUpdate(props) {
        component.updateProps(props)

        popup.setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup.hide()
          return true
        }

        return component.ref.onKeyDown(props)
      },

      onExit() {
        popup.destroy()
        component.destroy()
      },
    }
  },
}

export { suggestionConfig };