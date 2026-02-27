import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { LandingPage } from "./pages/LandingPage";
import { AboutPage } from "./pages/AboutPage";
import { LoginPage } from "./pages/LoginPage";
import { ProjectOwnerLoginPage } from "./pages/ProjectOwnerLoginPage";
import { FunderLoginPage } from "./pages/FunderLoginPage";
import { CarbonTraderLoginPage } from "./pages/CarbonTraderLoginPage";
import { AdminPage } from "./pages/AdminPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { GetStartedPage } from "./pages/GetStartedPage";
import { NewInstitutionPage } from "./pages/NewInstitutionPage";
import { NewUserPage } from "./pages/NewUserPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: LandingPage },
      { path: "about", Component: AboutPage },
      // Login / portal selection
      { path: "login", Component: LoginPage },
      { path: "login/project-owner", Component: ProjectOwnerLoginPage },
      { path: "login/funder", Component: FunderLoginPage },
      { path: "login/carbon-trader", Component: CarbonTraderLoginPage },
      // Account opening flow
      { path: "get-started", Component: GetStartedPage },
      { path: "get-started/institution", Component: NewInstitutionPage },
      { path: "get-started/user", Component: NewUserPage },
      // Administration
      { path: "admin", Component: AdminPage },
      { path: "admin/dashboard", Component: AdminDashboard },
    ],
  },
]);
