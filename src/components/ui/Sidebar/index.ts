import { useSidebar } from './context.js';
import Root from './Sidebar.svelte';
import Content from './SidebarContent.svelte';
import Footer from './SidebarFooter.svelte';
import Group from './SidebarGroup/SidebarGroup.svelte';
import GroupAction from './SidebarGroup/SidebarGroupAction.svelte';
import GroupContent from './SidebarGroup/SidebarGroupContent.svelte';
import GroupLabel from './SidebarGroup/SidebarGroupLabel.svelte';
import Header from './SidebarHeader.svelte';
import Input from './SidebarInput.svelte';
import Inset from './SidebarInset.svelte';
import Menu from './SidebarMenu/SidebarMenu.svelte';
import MenuAction from './SidebarMenu/SidebarMenuAction.svelte';
import MenuBadge from './SidebarMenu/SidebarMenuBadge.svelte';
import MenuButton from './SidebarMenu/SidebarMenuButton.svelte';
import MenuItem from './SidebarMenu/SidebarMenuItem.svelte';
import MenuSkeleton from './SidebarMenu/SidebarMenuSkeleton.svelte';
import MenuSub from './SidebarMenu/SidebarMenuSub.svelte';
import MenuSubButton from './SidebarMenu/SidebarMenuSubButton.svelte';
import MenuSubItem from './SidebarMenu/SidebarMenuSubItem.svelte';
import Provider from './SidebarProvider.svelte';
import Rail from './SidebarRail.svelte';
import Separator from './SidebarSeparator.svelte';
import Trigger from './SidebarTrigger.svelte';

// Export utilities and types
export type { WithElementRef } from '../../../types/component.js';

// Note: sidebar variants will be exported separately if needed

export {
  Content,
  Footer,
  Group,
  GroupAction,
  GroupContent,
  GroupLabel,
  Header,
  Input,
  Inset,
  Menu,
  MenuAction,
  MenuBadge,
  MenuButton,
  MenuItem,
  MenuSkeleton,
  MenuSub,
  MenuSubButton,
  MenuSubItem,
  Provider,
  Rail,
  Root,
  Separator,
  //
  Root as Sidebar,
  Content as SidebarContent,
  Footer as SidebarFooter,
  Group as SidebarGroup,
  GroupAction as SidebarGroupAction,
  GroupContent as SidebarGroupContent,
  GroupLabel as SidebarGroupLabel,
  Header as SidebarHeader,
  Input as SidebarInput,
  Inset as SidebarInset,
  Menu as SidebarMenu,
  MenuAction as SidebarMenuAction,
  MenuBadge as SidebarMenuBadge,
  MenuButton as SidebarMenuButton,
  MenuItem as SidebarMenuItem,
  MenuSkeleton as SidebarMenuSkeleton,
  MenuSub as SidebarMenuSub,
  MenuSubButton as SidebarMenuSubButton,
  MenuSubItem as SidebarMenuSubItem,
  Provider as SidebarProvider,
  Rail as SidebarRail,
  Separator as SidebarSeparator,
  Trigger as SidebarTrigger,
  Trigger,
  useSidebar,
};
