import { useSession, signIn, signOut } from "@hono/auth-js/react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.image && (
          <img
            src={session.user.image}
            alt={session.user.name ?? ""}
            className="w-8 h-8 rounded-full"
          />
        )}
        <button
          onClick={() => signOut()}
          data-testid="sign-out-btn"
          className="text-xs text-gray-400 hover:text-gray-700 transition"
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      data-testid="sign-in-btn"
      className="text-sm font-medium text-gray-900 hover:text-black transition"
    >
      Iniciar sesión
    </button>
  );
}
