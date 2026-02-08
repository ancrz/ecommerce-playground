import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ResponsiveModal } from './common/ResponsiveModal';
import { TouchButton } from './common/TouchButton';
import { useApp } from '../App';
import { AlertCircle, HelpCircle, FileText } from 'lucide-react';

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
  resolve: (value: boolean | string | void | null) => void;
  defaultValue?: string;
}

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const alert = (message: string, title = 'Atención') => {
    return new Promise<void>((resolve) => {
      setModal({ isOpen: true, title, message, type: 'alert', resolve });
    });
  };

  const confirm = (message: string, title = 'Confirmar') => {
    return new Promise<boolean>((resolve) => {
      setModal({ isOpen: true, title, message, type: 'confirm', resolve: resolve as (v: any) => void });
    });
  };

  const prompt = (message: string, defaultValue = '', title = 'Entrada') => {
    setPromptValue(defaultValue);
    return new Promise<string | null>((resolve) => {
      setModal({ isOpen: true, title, message, type: 'prompt', resolve, defaultValue });
    });
  };

  const handleClose = (result: boolean | string | void | null) => {
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
        <ResponsiveModal
          isOpen={modal.isOpen}
          title={modal.title}
          onClose={() => handleClose(modal.type === 'confirm' ? false : null)}
          size="sm"
          icon={
            modal.type === 'alert' ? <AlertCircle className="w-6 h-6" /> :
            modal.type === 'confirm' ? <HelpCircle className="w-6 h-6 text-blue-500" /> :
            <FileText className="w-6 h-6 text-green-500" />
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
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleClose(promptValue);
                }}
              />
            )}
            
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t mt-4">
              {(modal.type === 'confirm' || modal.type === 'prompt') && (
                <TouchButton
                  onClick={() => handleClose(modal.type === 'confirm' ? false : null)}
                  variant="secondary"
                  className="flex-1 sm:flex-none"
                >
                  Cancelar
                </TouchButton>
              )}
              <TouchButton
                onClick={() => handleClose(modal.type === 'prompt' ? promptValue : true)}
                variant="primary"
                className="flex-1 sm:flex-none"
              >
                Aceptar
              </TouchButton>
            </div>
          </div>
        </ResponsiveModal>
      )}
    </UIContext.Provider>
  );
};
