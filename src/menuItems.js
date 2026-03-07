export const MENU_ITEMS = [
  {
    title: '一般文字',
    icon: 'T',
    action: 'turnInto',
    type: 'paragraph'
  },
  {
    title: '標題 1',
    icon: 'H1',
    action: 'turnInto',
    type: 'heading',
    attrs: { level: 1 }
  },
  {
    title: '標題 2',
    icon: 'H2',
    action: 'turnInto',
    type: 'heading',
    attrs: { level: 2 }
  },
  {
    title: '標題 3',
    icon: 'H3',
    action: 'turnInto',
    type: 'heading',
    attrs: { level: 3 }
  },
  {
    title: '項目符號',
    icon: '●',
    action: 'turnIntoList',
    type: 'bulletList'
  },
  {
    title: '編號清單',
    icon: '1.',
    action: 'turnIntoList',
    type: 'orderedList'
  },
  {
    title: '插入表格',
    icon: '▦',
    action: 'insertTable'
  },
  {
    title: '程式碼',
    icon: '<>',
    action: 'turnInto',
    type: 'codeBlock'
  }
]
