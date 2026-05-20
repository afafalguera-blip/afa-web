import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Link2,
  Eraser,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

interface ToolbarButtonProps {
  title: string;
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function ToolbarButton({ title, active = false, onClick, icon }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors text-sm ${
        active ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {icon}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL del enlace', previousUrl ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
      <ToolbarButton
        title="Negrita"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        icon={<Bold className="w-4 h-4" />}
      />
      <ToolbarButton
        title="Cursiva"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        icon={<Italic className="w-4 h-4" />}
      />
      <ToolbarButton
        title="Subrayado"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        icon={<UnderlineIcon className="w-4 h-4" />}
      />
      <ToolbarButton
        title="Tachado"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        icon={<Strikethrough className="w-4 h-4" />}
      />
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <ToolbarButton
        title="Encabezado 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        icon={<Heading2 className="w-4 h-4" />}
      />
      <ToolbarButton
        title="Encabezado 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        icon={<Heading3 className="w-4 h-4" />}
      />
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <ToolbarButton
        title="Lista"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        icon={<List className="w-4 h-4" />}
      />
      <ToolbarButton
        title="Lista numerada"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        icon={<ListOrdered className="w-4 h-4" />}
      />
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <ToolbarButton
        title="Enlace"
        active={editor.isActive('link')}
        onClick={setLink}
        icon={<Link2 className="w-4 h-4" />}
      />
      <ToolbarButton
        title="Limpiar formato"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        icon={<Eraser className="w-4 h-4" />}
      />
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder = 'Escriu aquí...', minHeight = '200px' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none p-4`,
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      if (html !== value) onChange(html);
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <style>{`
        .ProseMirror { outline: none; min-height: ${minHeight}; }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #94a3b8;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
