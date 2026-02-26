import { BubbleMenu, Editor } from '@tiptap/react'
import { 
  ArrowLeftFromLine, ArrowRightFromLine, ArrowUpFromLine, ArrowDownFromLine,
  Trash2, Merge, Split
} from 'lucide-react'

interface TableBubbleMenuProps {
  editor: Editor
}

export const TableBubbleMenu = ({ editor }: TableBubbleMenuProps) => {
  return (
    <BubbleMenu 
      editor={editor} 
      tippyOptions={{ duration: 100, placement: 'top' }}
      shouldShow={({ editor }) => editor.isActive('table')}
      className="table-bubble-menu"
    >
      <div className="table-menu-group">
        <button 
          onClick={() => editor.chain().focus().addColumnBefore().run()} 
          title="Add Column Before"
        >
          <ArrowLeftFromLine size={16} />
        </button>
        <button 
          onClick={() => editor.chain().focus().addColumnAfter().run()} 
          title="Add Column After"
        >
          <ArrowRightFromLine size={16} />
        </button>
        <button 
          onClick={() => editor.chain().focus().deleteColumn().run()} 
          title="Delete Column"
          className="danger"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="table-menu-divider" />

      <div className="table-menu-group">
        <button 
          onClick={() => editor.chain().focus().addRowBefore().run()} 
          title="Add Row Before"
        >
          <ArrowUpFromLine size={16} />
        </button>
        <button 
          onClick={() => editor.chain().focus().addRowAfter().run()} 
          title="Add Row After"
        >
          <ArrowDownFromLine size={16} />
        </button>
        <button 
          onClick={() => editor.chain().focus().deleteRow().run()} 
          title="Delete Row"
          className="danger"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="table-menu-divider" />

      <div className="table-menu-group">
        <button 
          onClick={() => editor.chain().focus().mergeCells().run()} 
          title="Merge Cells"
          disabled={!editor.can().mergeCells()}
        >
          <Merge size={16} />
        </button>
        <button 
          onClick={() => editor.chain().focus().splitCell().run()} 
          title="Split Cell"
          disabled={!editor.can().splitCell()}
        >
          <Split size={16} />
        </button>
      </div>

      <div className="table-menu-divider" />

      <div className="table-menu-group">
        <button 
          onClick={() => editor.chain().focus().deleteTable().run()} 
          title="Delete Table"
          className="danger"
        >
          <Trash2 size={16} color="red" />
        </button>
      </div>
    </BubbleMenu>
  )
}
