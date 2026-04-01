import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import Footer from "./Footer";

const Layout = () => (
  <div className="min-h-screen flex flex-col">
    <TopNav />
    <div className="flex-1">
      <Outlet />
    </div>
    <Footer />
  </div>
);

export default Layout;
