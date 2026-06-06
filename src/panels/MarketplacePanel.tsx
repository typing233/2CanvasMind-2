import { useState } from 'react';
import { PluginManager } from '../core/plugin-system/PluginManager';
import { t } from '../i18n';

interface MarketplacePanelProps {
  plugins: PluginManager;
  onClose: () => void;
}

export function MarketplacePanel({ plugins, onClose }: MarketplacePanelProps) {
  const [, forceUpdate] = useState(0);
  const manifests = plugins.getManifests();
  const allPlugins = plugins.getAll();

  return (
    <div className="absolute inset-0 bg-black/30 z-[200] flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{t('marketplace.title')}</h2>
          <button className="text-gray-400 hover:text-gray-600 text-xl" onClick={onClose}>&times;</button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
          {allPlugins.map((plugin) => {
            const manifest = manifests.find(m => m.id === plugin.id);
            const enabled = plugins.isEnabled(plugin.id);

            return (
              <div
                key={plugin.id}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-800">{plugin.name}</span>
                    {manifest?.isBuiltIn && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                        {t('marketplace.builtin')}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">v{plugin.version}</span>
                  </div>
                  {manifest?.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{manifest.description}</p>
                  )}
                  {manifest?.category && (
                    <span className="text-[10px] text-gray-400 capitalize">{manifest.category}</span>
                  )}
                </div>
                <button
                  className={`px-3 py-1 text-xs rounded-md font-medium ${
                    enabled
                      ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
                  }`}
                  onClick={() => {
                    plugins.setEnabled(plugin.id, !enabled);
                    forceUpdate(c => c + 1);
                  }}
                >
                  {enabled ? t('marketplace.enabled') : t('marketplace.disabled')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
