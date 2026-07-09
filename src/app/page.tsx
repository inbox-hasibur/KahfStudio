import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      {session?.user ? (
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground text-center">
          Hi, Welcome "{session.user.name || session.user.email?.split('@')[0]}"!
        </h1>
      ) : (
        <h1 className="text-3xl font-bold tracking-tight text-foreground/80">
          KahfStudio
        </h1>
      )}
    </div>
  );
}
