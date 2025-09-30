declare module '@shopify/polaris' {
  // Very small permissive shims so the existing codebase compiles against Polaris types.
  // We export common components as `any` to avoid changing runtime behavior.
  export const Card: any;
  export const DataTable: any;
  export const Pagination: any;
  export const InlineStack: any;
  export const BlockStack: any;
  export const Text: any;
  export const Button: any;
  export const Badge: any;
  export const EmptyState: any;
  export const Box: any;
  export const Checkbox: any;
  export const ButtonGroup: any;
  export const Tooltip: any;
  export const FormLayout: any;
  export const TextField: any;
  export const Select: any;
  export const Banner: any;
  export const Divider: any;
  export const Layout: any;
  export const DataTableColumn: any;
  export const Icon: any;
  export const ProgressBar: any;
  export const Page: any;
  export const Modal: any;
  export const Toast: any;
  export const Frame: any;
  export const Tag: any;
  export const Collapsible: any;
  export const Link: any;
  export const Spinner: any;
  export const Filters: any;
  export const ChoiceList: any;
  export const RangeSlider: any;
  export const Tabs: any;
  export const List: any;
  export const AppProvider: any;
  export const Autocomplete: any;
  export const TooltipOverlay: any;

  // Prop compatibility interfaces (small and permissive)
  export interface ButtonProps { primary?: boolean; loading?: boolean; pressed?: boolean; variant?: any; size?: any; }
  export interface BadgeProps { status?: string; tone?: any; size?: any; }
  export interface BannerProps { status?: string; title?: string; tone?: any; }
  export interface SectionProps { secondary?: boolean; }
}
