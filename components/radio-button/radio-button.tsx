'use client';

import React from 'react';

interface RadioButtonProps {
  id: string;
  name: string;
  value: string;
  selectedOption: string;
  handleOptionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  labelText: string;
  icon: React.ReactNode;
}

const RadioButton: React.FC<RadioButtonProps> = ({
  id,
  name,
  value,
  selectedOption,
  handleOptionChange,
  labelText,
  icon
}) => {
  const isSelected = selectedOption === value;
  
  return (
    <div className={`group flex items-center justify-center p-3 min-w-[200px] cursor-pointer hover:text-white transition-colors ${
      isSelected ? 'bg-[#525252]' : 'bg-[#e7e5e4] hover:bg-[#525252]'
    }`}>
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={isSelected}
        onChange={handleOptionChange}
        className="hidden"
      />
      <label htmlFor={id} className={`flex items-center cursor-pointer transition-colors ${
        isSelected ? 'text-white' : 'text-gray-700 group-hover:text-white'
      }`}>
        <span className="mr-2">{icon}</span>
        {labelText}
      </label>
    </div>
  );
};

export default RadioButton;
