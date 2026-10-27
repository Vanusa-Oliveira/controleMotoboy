import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Welcome } from "@/components/Welcome";

// A tela de boas-vindas aparece a cada vez que o app é aberto (uma vez por sessão do navegador).
const WELCOME_KEY = "rotapro:welcome-seen";

const jaEntrou = () => {
  try {
    return sessionStorage.getItem(WELCOME_KEY) === "1";
  } catch {
    return false;
  }
};

function AppLayout() {
  const [entrou, setEntrou] = useState(jaEntrou);

  if (!entrou) {
    return (
      <Welcome
        onEnter={() => {
          try {
            sessionStorage.setItem(WELCOME_KEY, "1");
          } catch {
            /* sem sessionStorage: só não lembra nesta sessão */
          }
          setEntrou(true);
        }}
      />
    );
  }
  return <Outlet />;
}

// Layout das telas do app. Não há login: os dados ficam salvos no próprio aparelho.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AppLayout,
});
