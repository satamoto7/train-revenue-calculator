import React from 'react';
import Button from './Button';

const Modal = ({
  message,
  onClose,
  showConfirm = false,
  onConfirm,
  confirmText = 'OK',
  cancelText = 'キャンセル',
  children,
}) => {
  if (!message && !children) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={message ? 'modal-message' : undefined}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl sm:p-8">
        {message && (
          <p
            id="modal-message"
            className="mb-6 text-center text-lg text-gray-700 whitespace-pre-wrap"
          >
            {message}
          </p>
        )}
        {children}
        <div className="mt-6 flex justify-center gap-4">
          {showConfirm && (
            <Button onClick={onConfirm} variant="danger" className="px-6">
              {confirmText}
            </Button>
          )}
          <Button
            onClick={onClose}
            variant={showConfirm ? 'secondary' : 'primary'}
            className="px-6"
          >
            {showConfirm ? cancelText : '閉じる'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
