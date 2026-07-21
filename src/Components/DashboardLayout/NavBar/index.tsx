import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
 MdSpaceDashboard,
 MdEventNote,
 MdContentCut,
 MdSettings,
 MdLogout,
} from "react-icons/md";
import { HiMenuAlt1 } from "react-icons/hi";
import "./index.css";

const NavBar = () => {
 const navigate = useNavigate();
 const [menuOpen, setMenuOpen] = useState(false);

 const [isCollapsed, setIsCollapsed] = useState(() => {
  const saved = localStorage.getItem("menuCollapsed");
  return saved === "true";
 });

 const toggleMenu = () => {
  setIsCollapsed((prev) => {
   const newValue = !prev;
   localStorage.setItem("menuCollapsed", String(newValue));
   return newValue;
  });
 };

 const menuDesktop = {
  menu: isCollapsed ?  "containerMenu" : "containerMenuClose",
  hidden: isCollapsed ? "hiddenMenu" : "visibility",
  center: isCollapsed ? "center" : "header-menu",
  texture: isCollapsed ? 'textureMenuOff' : 'textureMenuOn',
  navDesktop: isCollapsed ? 'navDesktopOff' : 'navDesktop'
 };

 const links = [
  { to: "/calender", label: "Agenda", icon: <MdEventNote size={20} /> },
  { to: "/dashboard", label: "Dashboard", icon: <MdSpaceDashboard size={20} /> },
  { to: "/service", label: "Serviços", icon: <MdContentCut size={20} /> },
  { to: "/config", label: "Configurações", icon: <MdSettings size={20} /> },
  // {to: "/ai", label: "IA", icon: <FaRobot size={20} />,}
 ];

 const handleLogout = () => {
  localStorage.removeItem("token");
  navigate("/");
 };


 return (
  <>
   {/* Menu desktop */}

   <div className={menuDesktop.texture}></div>

    <nav className={menuDesktop.navDesktop} >
     <div className={menuDesktop.center}>
      <img className={menuDesktop.hidden} src="https://yu-u.vercel.app/assets/FAICON.png" alt="YuU" />
      <button style={{ cursor: "pointer"}} onClick={toggleMenu}><HiMenuAlt1 size={20}/></button>
     </div>


     <div className="nav-container">
      {links.map((link) => (
       <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "active" : "")} >
        <div className="icone">{link.icon}</div>
        <span className={menuDesktop.hidden}>{link.label}</span>
       </NavLink>
      ))}
     </div>

     <button className="logout-btn" onClick={handleLogout}>
      <MdLogout size={18} />
      <span className={menuDesktop.hidden}>Sair</span>
     </button>
    </nav>




   {/* Mobile */}
   <div className="menuMobile">
    <header className="mobileHeader">
     <img src="https://yu-u.vercel.app/assets/FAICON.png" alt="YuU" />

     <label className="hamburger">
      <input
       type="checkbox"
       checked={menuOpen}
       onChange={() => setMenuOpen(!menuOpen)}
      />
      <svg viewBox="0 0 32 32">
       <path
        className="line line-top-bottom"
        d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
       ></path>
       <path className="line" d="M7 16 27 16"></path>
      </svg>
     </label>
    </header>

    <div
     className={`menuOverlay ${menuOpen ? "show" : ""}`}
     onClick={() => setMenuOpen(false)}
    />

    <nav className={`mobileDrawer ${menuOpen ? "open" : ""}`}>


     <div className="drawerLinks">
      {links.map((link) => (
       <NavLink
        key={link.to}
        to={link.to}
        onClick={() => setMenuOpen(false)}
        className={({ isActive }) => (isActive ? "active" : "")}
       >
        {link.icon}
        <span>{link.label}</span>
       </NavLink>
      ))}
     </div>

     <button className="drawerLogout" onClick={handleLogout}>
      <MdLogout size={20} />
      <span>Sair</span>
     </button>
    </nav>
   </div>
  </>
 );
};

export default NavBar;