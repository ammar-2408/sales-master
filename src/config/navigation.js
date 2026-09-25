import { LayoutDashboard, Shirt, ShoppingCart, Users, Handshake, BarChart3, Archive, PlusCircle, CheckCircle } from 'lucide-react';

export const menuItems = [
  { id: 'dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'add_stock',       icon: PlusCircle,      label: 'Add Stock' },
  { id: 'available_stock', icon: CheckCircle,     label: 'Available Stock' },
  { id: 'inventory',       icon: Shirt,           label: 'All Inventory' },
  { id: 'sales',           icon: ShoppingCart,    label: 'Sales' },
  { id: 'customers',       icon: Users,           label: 'Customers' },
  { id: 'mama',            icon: Handshake,       label: 'Partner Share' },
  { id: 'insights',        icon: BarChart3,       label: 'Insights' },
  { id: 'trash',           icon: Archive,         label: 'Deleted Customers' },
];
