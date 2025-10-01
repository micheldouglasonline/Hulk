
import React from 'react';

interface ChoiceButtonProps {
  text: string;
  onClick: () => void;
  disabled?: boolean;
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({ text, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left font-semibold bg-yellow-400 text-gray-900 p-4 border-2 border-black rounded-lg shadow-[4px_4px_0px_#000] hover:bg-yellow-300 active:bg-yellow-500 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-150 ease-in-out disabled:bg-gray-500 disabled:text-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
    >
      {text}
    </button>
  );
};

export default ChoiceButton;
