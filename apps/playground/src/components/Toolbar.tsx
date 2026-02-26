import { 
  Bold, Italic, Code, MessageSquarePlus, FileDown, 
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Undo, Redo, Share, Image as ImageIcon, Link as LinkIcon,
  Table as TableIcon, CheckSquare, FileJson, FileCode
} from 'lucide-react'
import { BlockEditor } from '@block-editor/editor'

interface ToolbarProps {
  editorInstance: BlockEditor | null
  onAddComment: () => void
  onExportPDF: () => void
  onExportDocx: () => void
  onGetJSON: () => void
  onGetHTML: () => void
  onAddImage: () => void
  onAddLink: () => void
  onAddTable: () => void
  onAddTask: () => void
}

export const Toolbar = ({ 
  editorInstance, 
  onAddComment, 
  onExportPDF, 
  onExportDocx,
  onGetJSON,
  onGetHTML,
  onAddImage,
  onAddLink,
  onAddTable,
  onAddTask
}: ToolbarProps) => {
  return (
    <div className="toolbar">
      <button onClick={() => (editorInstance?.editor.chain().focus() as any).undo().run()} className="icon-btn">
        <Undo size={18} />
      </button>
      <button onClick={() => (editorInstance?.editor.chain().focus() as any).redo().run()} className="icon-btn">
        <Redo size={18} />
      </button>
      
      <div className="divider"></div>

      <button 
        onClick={() => (editorInstance?.editor.chain().focus() as any).toggleHeading({ level: 1 }).run()} 
        className={`icon-btn ${editorInstance?.editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
      >
        <Heading1 size={18} />
      </button>
      <button 
        onClick={() => (editorInstance?.editor.chain().focus() as any).toggleHeading({ level: 2 }).run()} 
        className={`icon-btn ${editorInstance?.editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
      >
        <Heading2 size={18} />
      </button>
      <button 
        onClick={() => (editorInstance?.editor.chain().focus() as any).toggleHeading({ level: 3 }).run()} 
        className={`icon-btn ${editorInstance?.editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
      >
        <Heading3 size={18} />
      </button>

      <div className="divider"></div>

      <button 
        onClick={() => (editorInstance?.editor.chain().focus() as any).toggleBold().run()} 
        className={`icon-btn ${editorInstance?.editor.isActive('bold') ? 'active' : ''}`}
      >
        <Bold size={18} />
      </button>
      <button 
        onClick={() => (editorInstance?.editor.chain().focus() as any).toggleItalic().run()} 
        className={`icon-btn ${editorInstance?.editor.isActive('italic') ? 'active' : ''}`}
      >
        <Italic size={18} />
      </button>
      <button 
        onClick={() => (editorInstance?.editor.chain().focus() as any).toggleCodeBlock().run()} 
        className={`icon-btn ${editorInstance?.editor.isActive('codeBlock') ? 'active' : ''}`}
      >
        <Code size={18} />
      </button>
       <button 
        onClick={() => (editorInstance?.editor.chain().focus() as any).toggleBlockquote().run()} 
        className={`icon-btn ${editorInstance?.editor.isActive('blockquote') ? 'active' : ''}`}
      >
        <Quote size={18} />
      </button>

      <div className="divider"></div>

      <button 
        onClick={() => (editorInstance?.editor.chain().focus() as any).toggleBulletList().run()} 
        className={`icon-btn ${editorInstance?.editor.isActive('bulletList') ? 'active' : ''}`}
      >
        <List size={18} />
      </button>
      <button 
        onClick={() => (editorInstance?.editor.chain().focus() as any).toggleOrderedList().run()} 
        className={`icon-btn ${editorInstance?.editor.isActive('orderedList') ? 'active' : ''}`}
      >
        <ListOrdered size={18} />
      </button>

      <div className="divider"></div>

      <button 
        onClick={onAddLink}
        className={`icon-btn ${editorInstance?.editor.isActive('link') ? 'active' : ''}`}
      >
        <LinkIcon size={18} />
      </button>
      <button 
        onClick={onAddImage}
        className={`icon-btn ${editorInstance?.editor.isActive('image') ? 'active' : ''}`}
      >
        <ImageIcon size={18} />
      </button>
      <button 
        onClick={onAddTable}
        className={`icon-btn ${editorInstance?.editor.isActive('table') ? 'active' : ''}`}
      >
        <TableIcon size={18} />
      </button>
      <button 
        onClick={onAddTask}
        className={`icon-btn ${editorInstance?.editor.isActive('taskList') ? 'active' : ''}`}
      >
        <CheckSquare size={18} />
      </button>

      <div style={{ flex: 1 }}></div>

      <button onClick={onGetJSON} className="text-btn" title="Log JSON to Console">
        <FileJson size={16} /> JSON
      </button>
      <button onClick={onGetHTML} className="text-btn" title="Log HTML to Console">
        <FileCode size={16} /> HTML
      </button>
      
      <div className="divider"></div>

      <button onClick={onAddComment} className="text-btn">
        <MessageSquarePlus size={16} /> Comment
      </button>
      <button onClick={onExportPDF} className="text-btn">
        <FileDown size={16} /> PDF
      </button>
      <button className="text-btn primary" onClick={onExportDocx}>
        <Share size={16} /> Share
      </button>
    </div>
  )
}
