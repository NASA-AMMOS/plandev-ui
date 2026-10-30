export type DropdownOptionValue = string | number;
export type SelectedDropdownOptionValue = DropdownOptionValue | null;

export type DropdownOption = {
  display: string;
  hasSelectPermission?: boolean;
  value: DropdownOptionValue;
};

export type DropdownOptions = DropdownOption[];

export type DownloadMenuOption = {
  disabled?: boolean;
  disabledReason?: string;
  label: string;
  name: string;
};
