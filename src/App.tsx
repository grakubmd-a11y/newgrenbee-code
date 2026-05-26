import AdminRoute from "./admin/AdminRoute";
import PublicApp from "./public/PublicApp";

export default function App() {
  const isAdminPath = window.location.pathname.startsWith("/admin");
  return isAdminPath ? <AdminRoute /> : <PublicApp />;
}
