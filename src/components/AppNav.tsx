import { Link } from "@tanstack/react-router";
import { useSession } from "@hono/auth-js/react";
import { UserMenu } from "./UserMenu";

export function AppNav() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-gray-100 shrink-0">
      <div className="flex items-center justify-between px-6 h-14 max-w-4xl mx-auto w-full">
        <Link to="/" className="cursor-pointer text-sm font-bold text-gray-900 tracking-tight hover:text-gray-600 transition-colors duration-150">
          Welist
        </Link>
        <div className="flex items-center gap-1">
          <Link
            to="/explore"
            className="cursor-pointer px-3 py-2 text-sm text-gray-400 hover:text-gray-900 rounded-lg transition-colors duration-150"
          >
            Explorar
          </Link>
          {session?.user && (
            <Link
              to="/my-lists"
              className="cursor-pointer px-3 py-2 text-sm text-gray-400 hover:text-gray-900 rounded-lg transition-colors duration-150"
            >
              Mis listas
            </Link>
          )}
          <div className="ml-1">
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
