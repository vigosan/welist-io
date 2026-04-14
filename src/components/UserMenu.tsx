import { useSession, signIn, signOut } from "@hono/auth-js/react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2.5">
        {session.user.image && (
          <img
            src={session.user.image}
            alt={session.user.name ?? ""}
            className="w-7 h-7 rounded-full outline outline-1 outline-black/10"
          />
        )}
        <button
          onClick={() => signOut()}
          data-testid="sign-out-btn"
          className="cursor-pointer h-7 flex items-center px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-[border-color,color] duration-150 active:scale-[0.96]"
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
      className="cursor-pointer h-7 flex items-center px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-900 transition-[border-color,color] duration-150 active:scale-[0.96]"
    >
      Iniciar sesión
    </button>
  );
}
