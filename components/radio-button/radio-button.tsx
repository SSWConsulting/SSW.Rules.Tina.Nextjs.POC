'use client';

import React from 'react';

interface RadioButtonProps {
  id: string;
  value: string;
  selectedOption: string;
  handleOptionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  labelText: string;
  position?: 'first' | 'middle' | 'last';
}

const RadioButton: React.FC<RadioButtonProps> = ({ id, value, selectedOption, handleOptionChange, labelText, position }) => {
  const isSelected = selectedOption === value;

  const handleButtonClick = () => {
    // Create a synthetic change event to match the expected interface
    const syntheticEvent = {
      target: {
        value: value,
        type: 'radio',
        checked: true,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    handleOptionChange(syntheticEvent);
  };

  const getBorderClasses = () => {
    if (!position) {
      return 'border rounded';
    }

    if (position === 'first') {
      return 'border border-r-0 rounded-l-md rounded-r-none';
    } else if (position === 'last') {
      return 'border border-l-0 rounded-r-md rounded-l-none';
    } else if (position === 'middle') {
      return 'border-y border-l-0 border-r-0 rounded-none';
    }

    return 'border rounded';
  };

  return (
    <button
      type="button"
      id={id}
      className={`group px-4 py-1 text-sm cursor-pointer hover:text-white transition-colors ${getBorderClasses()} ${
        isSelected ? 'bg-ssw-red' : 'bg-white hover:bg-ssw-red'
      }`}
      onClick={handleButtonClick}
      aria-pressed={isSelected}
    >
      <span className={`transition-colors ${isSelected ? 'text-white' : 'text-gray-700 group-hover:text-white'}`}>{labelText}</span>
    </button>
  );
};

export default RadioButton;
