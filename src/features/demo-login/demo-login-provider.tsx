"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

const LOGIN_KEY = "roomieos:demo-login";
type Status = "loading" | "signed-out" | "signed-in";
const DemoLoginContext = createContext<{
  status: Status;
  error: string | null;
  login: (email: string, password: string) => boolean;
  logout: () => boolean;
} | null>(null);

export function demoDestination() {
  const next = new URLSearchParams(window.location.search)
    .get("next")
    ?.replace(/\/$/, "");
  return next &&
    [
      "/dashboard",
      "/chores",
      "/planner",
      "/expenses",
      "/agreements",
      "/settings",
      "/welcome",
    ].includes(next)
    ? next
    : "/dashboard";
}

export function DemoLoginProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    function read() {
      try {
        setStatus(
          localStorage.getItem(LOGIN_KEY) === "true"
            ? "signed-in"
            : "signed-out",
        );
      } catch {
        setStatus((previous) =>
          previous === "loading" ? "signed-out" : previous,
        );
        setError(
          "Browser storage is unavailable. Allow site storage and try again.",
        );
      }
    }
    read();
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOGIN_KEY || event.key === null) read();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", read);
    };
  }, []);
  function login(email: string, password: string) {
    if (email !== "some.email@example.com" || password !== "n0t4passw0rd$") {
      setError("The demo email or password is incorrect.");
      return false;
    }
    try {
      localStorage.setItem(LOGIN_KEY, "true");
      setError(null);
      setStatus("signed-in");
      return true;
    } catch {
      setError(
        "Couldn't remember your demo login. Allow site storage and try again.",
      );
      return false;
    }
  }
  function logout() {
    try {
      localStorage.removeItem(LOGIN_KEY);
      setError(null);
      setStatus("signed-out");
      return true;
    } catch {
      setError(
        "Couldn't log out of the demo. Allow site storage and try again.",
      );
      return false;
    }
  }
  return (
    <DemoLoginContext.Provider value={{ status, error, login, logout }}>
      {children}
    </DemoLoginContext.Provider>
  );
}

export function useDemoLogin() {
  const value = useContext(DemoLoginContext);
  if (!value) throw new Error("DemoLoginProvider is missing.");
  return value;
}

export function DemoLoginGate({ children }: { children: ReactNode }) {
  const { status } = useDemoLogin();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (status === "signed-out")
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);
  if (status !== "signed-in")
    return (
      <main
        aria-busy="true"
        className="flex min-h-dvh items-center justify-center px-5 text-sm text-muted"
      >
        Opening RoomieOS…
      </main>
    );
  return children;
}
