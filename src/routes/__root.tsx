import { createRootRouteWithContext, Outlet, Link } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-gray-900">404</p>
        <p className="text-sm text-gray-400">Esta lista no existe o ha sido eliminada.</p>
        <Link to="/" className="inline-block text-sm font-medium text-gray-900 underline underline-offset-4">
          Crear una nueva lista
        </Link>
      </div>
    </div>
  );
}
