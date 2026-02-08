/**
 * src/components/FormControls.tsx
 * "Chunk" de componentes de formulario reutilizables (Input, Select, etc.)
 * para todos los módulos del admin.
 * (Extraído de AdminPanel para reutilización).
 */
import React from 'react';

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
export const Input: React.FC<InputProps> = ({ label, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
    <input
      {...props}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 ${className || ''}`}
    />
  </div>
);

// --- TextArea ---
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export const TextArea: React.FC<TextAreaProps> = ({ label, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
    <textarea
      {...props}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 ${className || ''}`}
    />
  </div>
);

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}
export const Select: React.FC<SelectProps> = ({ label, children, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
    <select
      {...props}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 ${className || ''}`}
    >
      {children}
    </select>
  </div>
);

// --- Checkbox ---
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
export const Checkbox: React.FC<CheckboxProps> = ({ label, className, ...props }) => (
  <label className="flex items-center">
    <input
      type="checkbox"
      {...props}
      className={`mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 bg-white ${className || ''}`}
    />
    <span className="text-sm font-semibold text-gray-700">{label}</span>
  </label>
);

// --- ColorPicker ---
interface ColorPickerProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}
export const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <div className="flex gap-2">
      <input 
        type="color" 
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-10 rounded border border-gray-300 p-1 bg-white"
      />
      <input 
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
      />
    </div>
  </div>
);