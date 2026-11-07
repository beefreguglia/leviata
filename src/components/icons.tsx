"use client";

/**
 * Ícones do painel — Hugeicons (estilo stroke rounded, pacote gratuito).
 * Os nomes exportados seguem o que o código já usava (PlusIcon, XIcon…), então para trocar
 * um desenho basta mudar o mapeamento aqui. Novo ícone: escolha em https://hugeicons.com/icons
 * (filtro "Free"), importe abaixo e exporte com `icon(...)`.
 */
import { forwardRef } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon as H_Alert02Icon,
  ArrowDown01Icon as H_ArrowDown01Icon,
  ArrowDownLeft01Icon as H_ArrowDownLeft01Icon,
  ArrowLeft01Icon as H_ArrowLeft01Icon,
  ArrowRight01Icon as H_ArrowRight01Icon,
  ArrowUp01Icon as H_ArrowUp01Icon,
  ArrowUpDownIcon as H_ArrowUpDownIcon,
  ArrowUpRight01Icon as H_ArrowUpRight01Icon,
  BookOpen01Icon as H_BookOpen01Icon,
  CalculatorIcon as H_CalculatorIcon,
  Calendar01Icon as H_Calendar01Icon,
  Calendar03Icon as H_Calendar03Icon,
  CalendarAdd01Icon as H_CalendarAdd01Icon,
  CalendarLock01Icon as H_CalendarLock01Icon,
  CalendarRemove01Icon as H_CalendarRemove01Icon,
  Cancel01Icon as H_Cancel01Icon,
  CancelCircleIcon as H_CancelCircleIcon,
  Car01Icon as H_Car01Icon,
  CheckmarkCircle02Icon as H_CheckmarkCircle02Icon,
  Clock01Icon as H_Clock01Icon,
  Coins01Icon as H_Coins01Icon,
  Compass01Icon as H_Compass01Icon,
  CrownIcon as H_CrownIcon,
  Delete02Icon as H_Delete02Icon,
  File02Icon as H_File02Icon,
  Flag01Icon as H_Flag01Icon,
  GavelIcon as H_GavelIcon,
  Gps01Icon as H_Gps01Icon,
  Hammer01Icon as H_Hammer01Icon,
  Home01Icon as H_Home01Icon,
  Image01Icon as H_Image01Icon,
  ImageAdd01Icon as H_ImageAdd01Icon,
  InformationCircleIcon as H_InformationCircleIcon,
  LeftToRightListBulletIcon as H_LeftToRightListBulletIcon,
  LegalDocument01Icon as H_LegalDocument01Icon,
  LinkSquare02Icon as H_LinkSquare02Icon,
  LiveStreaming02Icon as H_LiveStreaming02Icon,
  Loading03Icon as H_Loading03Icon,
  Location01Icon as H_Location01Icon,
  Logout01Icon as H_Logout01Icon,
  MapsIcon as H_MapsIcon,
  Megaphone01Icon as H_Megaphone01Icon,
  MoneyReceive02Icon as H_MoneyReceive02Icon,
  MoreHorizontalIcon as H_MoreHorizontalIcon,
  PackageIcon as H_PackageIcon,
  PencilEdit02Icon as H_PencilEdit02Icon,
  PinIcon as H_PinIcon,
  PinOffIcon as H_PinOffIcon,
  Plant01Icon as H_Plant01Icon,
  PlusSignIcon as H_PlusSignIcon,
  RefreshIcon as H_RefreshIcon,
  RotateLeft01Icon as H_RotateLeft01Icon,
  Search01Icon as H_Search01Icon,
  SearchRemoveIcon as H_SearchRemoveIcon,
  SentIcon as H_SentIcon,
  SidebarLeftIcon as H_SidebarLeftIcon,
  SquareLock02Icon as H_SquareLock02Icon,
  SwordsIcon as H_SwordsIcon,
  SparklesIcon as H_SparklesIcon,
  Target02Icon as H_Target02Icon,
  TaskDaily01Icon as H_TaskDaily01Icon,
  Tick02Icon as H_Tick02Icon,
  TruckDeliveryIcon as H_TruckDeliveryIcon,
  UnavailableIcon as H_UnavailableIcon,
  Undo02Icon as H_Undo02Icon,
  UndoIcon as H_UndoIcon,
  UnfoldMoreIcon as H_UnfoldMoreIcon,
  UserGroupIcon as H_UserGroupIcon,
  UserIcon as H_UserIcon,
  UserIdVerificationIcon as H_UserIdVerificationIcon,
  UserRemove01Icon as H_UserRemove01Icon,
  ViewIcon as H_ViewIcon,
  VoteIcon as H_VoteIcon,
  Wallet01Icon as H_Wallet01Icon,
  WorkHistoryIcon as H_WorkHistoryIcon,
  Wrench01Icon as H_Wrench01Icon,
} from "@hugeicons/core-free-icons";

export type AppIconProps = Omit<React.ComponentProps<typeof HugeiconsIcon>, "icon">;
export type AppIcon = React.ForwardRefExoticComponent<AppIconProps & React.RefAttributes<SVGSVGElement>>;

/** Traço um pouco mais grosso que o padrão (1.5) para ler bem em 16px no tema escuro. */
const STROKE = 1.8;

function icon(svg: IconSvgElement, name: string): AppIcon {
  const C = forwardRef<SVGSVGElement, AppIconProps>(function AppIcon(props, ref) {
    return <HugeiconsIcon ref={ref} icon={svg} strokeWidth={STROKE} aria-hidden={props["aria-label"] ? undefined : true} {...props} />;
  });
  C.displayName = name;
  return C;
}

export const ArrowDownLeftIcon = icon(H_ArrowDownLeft01Icon, "ArrowDownLeftIcon");
export const ArrowUpDownIcon = icon(H_ArrowUpDownIcon, "ArrowUpDownIcon");
export const ArrowUpRightIcon = icon(H_ArrowUpRight01Icon, "ArrowUpRightIcon");
export const BanIcon = icon(H_UnavailableIcon, "BanIcon");
export const BookOpenIcon = icon(H_BookOpen01Icon, "BookOpenIcon");
export const CalculatorIcon = icon(H_CalculatorIcon, "CalculatorIcon");
export const CalendarClockIcon = icon(H_CalendarLock01Icon, "CalendarClockIcon");
export const CalendarDaysIcon = icon(H_Calendar03Icon, "CalendarDaysIcon");
export const CalendarIcon = icon(H_Calendar01Icon, "CalendarIcon");
export const CalendarOffIcon = icon(H_CalendarRemove01Icon, "CalendarOffIcon");
export const CalendarPlusIcon = icon(H_CalendarAdd01Icon, "CalendarPlusIcon");
export const CarIcon = icon(H_Car01Icon, "CarIcon");
export const CheckCircle2Icon = icon(H_CheckmarkCircle02Icon, "CheckCircle2Icon");
export const CheckIcon = icon(H_Tick02Icon, "CheckIcon");
export const ChevronDownIcon = icon(H_ArrowDown01Icon, "ChevronDownIcon");
export const ChevronLeftIcon = icon(H_ArrowLeft01Icon, "ChevronLeftIcon");
export const ChevronRightIcon = icon(H_ArrowRight01Icon, "ChevronRightIcon");
export const ChevronUpIcon = icon(H_ArrowUp01Icon, "ChevronUpIcon");
export const ChevronsUpDownIcon = icon(H_UnfoldMoreIcon, "ChevronsUpDownIcon");
export const CircleCheckIcon = icon(H_CheckmarkCircle02Icon, "CircleCheckIcon");
export const ClipboardListIcon = icon(H_TaskDaily01Icon, "ClipboardListIcon");
export const ClockIcon = icon(H_Clock01Icon, "ClockIcon");
export const CoinsIcon = icon(H_Coins01Icon, "CoinsIcon");
export const CompassIcon = icon(H_Compass01Icon, "CompassIcon");
export const CrosshairIcon = icon(H_Gps01Icon, "CrosshairIcon");
export const CrownIcon = icon(H_CrownIcon, "CrownIcon");
export const ExternalLinkIcon = icon(H_LinkSquare02Icon, "ExternalLinkIcon");
export const EyeIcon = icon(H_ViewIcon, "EyeIcon");
export const FileTextIcon = icon(H_File02Icon, "FileTextIcon");
export const FlagIcon = icon(H_Flag01Icon, "FlagIcon");
export const GavelIcon = icon(H_GavelIcon, "GavelIcon");
export const HammerIcon = icon(H_Hammer01Icon, "HammerIcon");
export const HandCoinsIcon = icon(H_MoneyReceive02Icon, "HandCoinsIcon");
export const HistoryIcon = icon(H_WorkHistoryIcon, "HistoryIcon");
export const HomeIcon = icon(H_Home01Icon, "HomeIcon");
export const IdCardIcon = icon(H_UserIdVerificationIcon, "IdCardIcon");
export const ImageIcon = icon(H_Image01Icon, "ImageIcon");
export const ImagePlusIcon = icon(H_ImageAdd01Icon, "ImagePlusIcon");
export const InfoIcon = icon(H_InformationCircleIcon, "InfoIcon");
export const LayoutListIcon = icon(H_LeftToRightListBulletIcon, "LayoutListIcon");
export const Loader2Icon = icon(H_Loading03Icon, "Loader2Icon");
export const LockKeyholeIcon = icon(H_SquareLock02Icon, "LockKeyholeIcon");
export const LogOutIcon = icon(H_Logout01Icon, "LogOutIcon");
export const MapIcon = icon(H_MapsIcon, "MapIcon");
export const MapPinIcon = icon(H_Location01Icon, "MapPinIcon");
export const MegaphoneIcon = icon(H_Megaphone01Icon, "MegaphoneIcon");
export const MoreHorizontalIcon = icon(H_MoreHorizontalIcon, "MoreHorizontalIcon");
export const OctagonXIcon = icon(H_CancelCircleIcon, "OctagonXIcon");
export const PackageIcon = icon(H_PackageIcon, "PackageIcon");
export const PanelLeftIcon = icon(H_SidebarLeftIcon, "PanelLeftIcon");
export const PencilIcon = icon(H_PencilEdit02Icon, "PencilIcon");
export const PinIcon = icon(H_PinIcon, "PinIcon");
export const PinOffIcon = icon(H_PinOffIcon, "PinOffIcon");
export const PlusIcon = icon(H_PlusSignIcon, "PlusIcon");
export const RadioIcon = icon(H_LiveStreaming02Icon, "RadioIcon");
export const RefreshCwIcon = icon(H_RefreshIcon, "RefreshCwIcon");
export const RotateCcwIcon = icon(H_RotateLeft01Icon, "RotateCcwIcon");
export const ScrollTextIcon = icon(H_LegalDocument01Icon, "ScrollTextIcon");
export const SearchIcon = icon(H_Search01Icon, "SearchIcon");
export const SearchXIcon = icon(H_SearchRemoveIcon, "SearchXIcon");
export const SendIcon = icon(H_SentIcon, "SendIcon");
export const SproutIcon = icon(H_Plant01Icon, "SproutIcon");
export const SparklesIcon = icon(H_SparklesIcon, "SparklesIcon");
export const SwordsIcon = icon(H_SwordsIcon, "SwordsIcon");
export const TargetIcon = icon(H_Target02Icon, "TargetIcon");
export const Trash2Icon = icon(H_Delete02Icon, "Trash2Icon");
export const TriangleAlertIcon = icon(H_Alert02Icon, "TriangleAlertIcon");
export const TruckIcon = icon(H_TruckDeliveryIcon, "TruckIcon");
export const Undo2Icon = icon(H_Undo02Icon, "Undo2Icon");
export const UndoIcon = icon(H_UndoIcon, "UndoIcon");
export const UserIcon = icon(H_UserIcon, "UserIcon");
export const UserXIcon = icon(H_UserRemove01Icon, "UserXIcon");
export const UsersIcon = icon(H_UserGroupIcon, "UsersIcon");
export const VoteIcon = icon(H_VoteIcon, "VoteIcon");
export const WalletIcon = icon(H_Wallet01Icon, "WalletIcon");
export const WrenchIcon = icon(H_Wrench01Icon, "WrenchIcon");
export const XIcon = icon(H_Cancel01Icon, "XIcon");
