import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Modal } from './Modal';
import { useApp } from '../App';

interface UIContextType {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
}

const UIContext = createContext<UIContextType | null>(null);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
};

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'prompt';
  resolve: (value: any) => void;
  defaultValue?: string;
}

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const { customization } = useApp();

  const primaryColor = customization?.primary_color || '#264192';

  const alert = (message: string, title = 'Atención') => {
    return new Promise<void>((resolve) => {
      setModal({ isOpen: true, title, message, type: 'alert', resolve });
    });
  };

  const confirm = (message: string, title = 'Confirmar') => {
    return new Promise<boolean>((resolve) => {
      setModal({ isOpen: true, title, message, type: 'confirm', resolve });
    });
  };

  const prompt = (message: string, defaultValue = '', title = 'Entrada') => {
    setPromptValue(defaultValue);
    return new Promise<string | null>((resolve) => {
      setModal({ isOpen: true, title, message, type: 'prompt', resolve, defaultValue });
    });
  };

  const handleClose = (result: any) => {
    if (modal) {
      modal.resolve(result);
      setModal(null);
      setPromptValue('');
    }
  };

  return (
    <UIContext.Provider value={{ alert, confirm, prompt }}>
      {children}
      {modal && (
        <Modal
          isOpen={modal.isOpen}
          title={modal.title}
          onClose={() => handleClose(modal.type === 'confirm' ? false : null)}
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              {(modal.type === 'confirm' || modal.type === 'prompt') && (
                <button
                  onClick={() => handleClose(modal.type === 'confirm' ? false : null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => handleClose(modal.type === 'prompt' ? promptValue : true)}
                className="px-4 py-2 text-white rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Aceptar
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-700 whitespace-pre-wrap">{modal.message}</p>
            {modal.type === 'prompt' && (
              <input
                autoFocus
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 outline-none"
                style={{ borderColor: primaryColor }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleClose(promptValue);
                }}
              />
            )}
          </div>
        </Modal>
      )}
    </UIContext.Provider>
  );
};
