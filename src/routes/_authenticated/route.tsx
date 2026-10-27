import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout das telas do app. Não há login: os dados ficam salvos no próprio aparelho.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => <Outlet />,
});
