import { useCanvasStore } from '../core/data-model/store';

export function FileActions() {
  const store = useCanvasStore;

  const handleSave = () => {
    const doc = store.getState().getSerializableDocument();
    const json = JSON.stringify(doc, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name || 'canvas'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const doc = JSON.parse(reader.result as string);
          store.getState().loadDocument(doc);
        } catch {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex gap-1">
      <button
        onClick={handleSave}
        className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 text-gray-700"
      >
        Save
      </button>
      <button
        onClick={handleLoad}
        className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 text-gray-700"
      >
        Load
      </button>
    </div>
  );
}
