// slash-commands-extension.js
import { Extension } from '@tiptap/vue-2'
import suggestionPlugin from '@tiptap/suggestion'
import { suggestionConfig } from '@/suggestion.js'

export default Extension.create({
  name: 'slash-commands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        ...suggestionConfig
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      suggestionPlugin({
        editor: this.editor,
        ...this.options.suggestion
      }),
    ]
  },
})