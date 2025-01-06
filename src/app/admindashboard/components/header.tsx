import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold">Welcome back, Admin</h2>
      <LogoutLink>
        <Button variant="ghost" size="sm" className="gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </LogoutLink>
    </header>
  );
}
