import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Link2, ImagePlus, Eraser
} from 'lucide-react';

interface ToolbarButtonProps {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
}

function ToolbarButton({ title, active = false, disabled = false, onClick, icon }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`h-9 w-9 rounded-lg border text-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className="flex items-center justify-center">{icon}</span>
    </button>
  );
}

function setLink(editor: Editor) {
  const previous = editor.getAttributes('link').href as string | undefined;
  const url = window.prompt('URL del enlace', previous || 'https://');
  if (url === null) return;

  if (url.trim() === '') {
    editor.chain().focus().unsetLink().run();
    return;
  }

  editor.chain().focus().setLink({ href: url.trim(), target: '_blank', rel: 'noopener noreferrer' }).run();
}

function addImage(editor: Editor) {
  const imageUrl = window.prompt('URL de la imagen');
  if (!imageUrl || !imageUrl.trim()) return;
  editor.chain().focus().setImage({ src: imageUrl.trim(), alt: '' }).run();
}

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50 p-3">
      <ToolbarButton title="Negrita" active={editor?.isActive('bold')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()} icon={<Bold className="w-4 h-4" />} />
      <ToolbarButton title="Cursiva" active={editor?.isActive('italic')} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()} icon={<Italic className="w-4 h-4" />} />
      <ToolbarButton title="Subrayado" active={editor?.isActive('underline')} disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()} icon={<UnderlineIcon className="w-4 h-4" />} />
      <ToolbarButton title="Tachado" active={editor?.isActive('strike')} disabled={!editor} onClick={() => editor?.chain().focus().toggleStrike().run()} icon={<Strikethrough className="w-4 h-4" />} />
      <ToolbarButton title="H1" active={editor?.isActive('heading', { level: 1 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} icon={<Heading1 className="w-4 h-4" />} />
      <ToolbarButton title="H2" active={editor?.isActive('heading', { level: 2 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 className="w-4 h-4" />} />
      <ToolbarButton title="H3" active={editor?.isActive('heading', { level: 3 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} icon={<Heading3 className="w-4 h-4" />} />
      <ToolbarButton title="Lista" active={editor?.isActive('bulletList')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()} icon={<List className="w-4 h-4" />} />
      <ToolbarButton title="Lista ordenada" active={editor?.isActive('orderedList')} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()} icon={<ListOrdered className="w-4 h-4" />} />
      <ToolbarButton title="Cita" active={editor?.isActive('blockquote')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBlockquote().run()} icon={<Quote className="w-4 h-4" />} />
      <ToolbarButton title="Enlace" active={editor?.isActive('link')} disabled={!editor} onClick={() => { if (editor) setLink(editor); }} icon={<Link2 className="w-4 h-4" />} />
      <ToolbarButton title="Imagen" disabled={!editor} onClick={() => { if (editor) addImage(editor); }} icon={<ImagePlus className="w-4 h-4" />} />
      <ToolbarButton title="Limpiar formato" disabled={!editor} onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} icon={<Eraser className="w-4 h-4" />} />
    </div>
  );
}
