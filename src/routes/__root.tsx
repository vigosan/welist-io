import { createRootRouteWithContext, Outlet, Link, useRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <p className="text-4xl font-bold text-gray-900">Algo fue mal</p>
        <p className="text-sm text-gray-400">{error.message}</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => router.invalidate()}
            className="text-sm font-medium text-gray-900 underline underline-offset-4"
          >
            Reintentar
          </button>
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-700 transition">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

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
