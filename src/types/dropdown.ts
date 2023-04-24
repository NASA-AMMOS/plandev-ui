export type DropdownOptionValue = string | number;
export type SelectedDropdownOptionValue = DropdownOptionValue | null;

export type DropdownOption = {
  display: string;
  value: DropdownOptionValue;
};

export type DropdownOptions = DropdownOption[];
