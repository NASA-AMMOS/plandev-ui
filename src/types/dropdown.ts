export type DropdownOptionValue = string | number;
export type SelectedDropdownOptionValue = DropdownOptionValue | null;

export type DropdownOption = {
  display: string;
  hasSelectPermission?: boolean;
  value: DropdownOptionValue;
};

export type DropdownOptions = DropdownOption[];
