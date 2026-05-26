import {
  Apple,
  BookOpen,
  CalendarDays,
  ChefHat,
  Cpu,
  Dumbbell,
  Film,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  HeartPulse,
  Hotel,
  House,
  Lock,
  type LucideIcon,
  MapPin,
  Mic,
  Music,
  Palette,
  Plane,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Trees,
  Tv,
  Utensils,
  Wine,
} from "lucide-react";
import type { ListCategory } from "@/lib/categories";

const CATEGORY_ICON: Record<ListCategory, LucideIcon> = {
  movies: Film,
  series: Tv,
  books: BookOpen,
  music: Music,
  podcasts: Mic,
  courses: GraduationCap,
  apps: Smartphone,
  games: Gamepad2,
  travel: Plane,
  places: MapPin,
  hotels: Hotel,
  restaurants: Utensils,
  bars: Wine,
  experiences: Sparkles,
  food: Apple,
  recipes: ChefHat,
  shopping: ShoppingBag,
  gifts: Gift,
  wishlist: Heart,
  sports: Dumbbell,
  art: Palette,
  events: CalendarDays,
  health: HeartPulse,
  tech: Cpu,
  nature: Trees,
  home: House,
  adult: Lock,
  other: Tag,
};

export function CategoryIcon({
  category,
  size = 14,
  className,
}: {
  category: ListCategory;
  size?: number;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[category];
  return <Icon size={size} strokeWidth={2} className={className} />;
}
