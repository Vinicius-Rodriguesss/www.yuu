import { Link } from "react-router";

const style = {
  header: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    padding: "0.75rem 1.5rem",
    position: "fixed" as const,
    top: 0,
    left: 0,
    zIndex: 1000,
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(0,0,0,0.04)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    textDecoration: "none" as const,
    color: "#1a1a1a",
  },
  logoImage: {
    width: "32px",
    height: "32px",
    objectFit: "contain" as const,
  },
  logoText: {
    fontSize: "16px",
    fontWeight: "600",
    letterSpacing: "-0.3px",
  },
};

export default function Header() {
  return (

    <header style={style.header}>
      <Link to={"/login"} style={style.logo}>
        <img
          src="https://yu-u.vercel.app/assets/FAICON.png"
          alt="YuU"
          style={style.logoImage}
        />
        <span style={style.logoText}>YuU</span>
      </Link>
    </header>
  );
}