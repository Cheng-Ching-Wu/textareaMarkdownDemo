// slash-commands-extension.js
import { Extension } from '@tiptap/vue-2'
import Suggestion from '@tiptap/suggestion'
import { suggestionConfig } from '@/suggestion.js' // 這是你原本寫 items 和 render 邏輯的地方

export default Extension.create({
  name: 'slash-commands',

  addOptions() {
    return {
      suggestion: {
        char: '/', // 觸發字元
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