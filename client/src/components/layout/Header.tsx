import { Bell, Moon, Sun, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 h-[72px] bg-background/60 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between h-full px-8">
        {/* Left: Greeting + Date */}
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Hello 👋 <span className="gradient-text">{user?.displayName || 'User'}</span>
          </h2>
          <p className="text-[13px] text-muted-foreground">{today}</p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="w-56 pl-9 h-10 rounded-xl bg-secondary/50 border-border/50 text-sm focus:w-72 transition-all duration-300"
            />
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-10 w-10 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50"
          >
            {theme === 'dark' ? (
              <Sun className="h-[18px] w-[18px] text-amber-400" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 relative"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 text-[9px] text-white flex items-center justify-center font-bold ring-2 ring-background">
                  0
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-xl p-0">
              <div className="p-4 border-b border-border">
                <p className="font-semibold text-sm">Notifications</p>
              </div>
              <div className="p-6 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Avatar */}
          <div className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-primary/20">
            <Avatar className="h-full w-full rounded-xl">
              <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white text-sm font-bold">
                {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
