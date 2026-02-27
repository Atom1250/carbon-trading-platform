import { Outlet } from "react-router";
import { Layout } from "./components/Layout";

export function Root() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
